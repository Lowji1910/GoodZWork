from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, date
from typing import Optional, List
from bson import ObjectId
from pydantic import BaseModel
from enum import Enum

from ..database import get_database
from .auth import get_current_user
from ..models.user import UserRole
from .notifications import create_notification

router = APIRouter(prefix="/api/kpi", tags=["kpi"])

class ReviewPeriod(str, Enum):
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"

class ReviewStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    REVIEWED = "REVIEWED"
    APPROVED = "APPROVED"

class KPIGoal(BaseModel):
    title: str
    description: str = ""
    target: float
    weight: int = 1  # Weight for overall score calculation

class KPIReviewCreate(BaseModel):
    employee_id: Optional[str] = None  # If manager creating for employee
    period: ReviewPeriod
    period_start: date
    period_end: date
    goals: List[KPIGoal]

class KPIReviewUpdate(BaseModel):
    goals: List[dict]  # Contains achievement scores
    self_review: str = ""
    manager_feedback: str = ""

def get_kpi_collection():
    db = get_database()
    return db["kpi_reviews"]

# ================ ENDPOINTS ================

@router.post("/")
async def create_kpi_review(
    data: KPIReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new KPI review"""
    kpi_col = get_kpi_collection()
    
    # Determine target employee
    if data.employee_id:
        if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value, UserRole.LEADER.value]:
            raise HTTPException(status_code=403, detail="Không có quyền tạo KPI cho người khác")
        target_employee_id = data.employee_id
        
        # Get employee info
        db = get_database()
        users_col = db["users"]
        employee = await users_col.find_one({"_id": ObjectId(target_employee_id)})
        if not employee:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
        target_name = employee.get("full_name")
        target_department = employee.get("department")
    else:
        target_employee_id = current_user["_id"]
        target_name = current_user.get("full_name")
        target_department = current_user.get("department")
    
    # Check for existing review in same period
    existing = await kpi_col.find_one({
        "employee_id": target_employee_id,
        "period": data.period.value,
        "period_start": data.period_start.isoformat()
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Đã có KPI review cho kỳ này")
    
    # Prepare goals with achievement fields
    goals = []
    for goal in data.goals:
        goals.append({
            "title": goal.title,
            "description": goal.description,
            "target": goal.target,
            "weight": goal.weight,
            "achievement": 0,
            "score": 0
        })
    
    kpi_doc = {
        "employee_id": target_employee_id,
        "employee_name": target_name,
        "employee_department": target_department,
        "period": data.period.value,
        "period_start": data.period_start.isoformat(),
        "period_end": data.period_end.isoformat(),
        "goals": goals,
        "overall_score": 0,
        "status": ReviewStatus.DRAFT.value,
        "self_review": "",
        "manager_feedback": "",
        "created_by": current_user["_id"],
        "created_by_name": current_user.get("full_name"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await kpi_col.insert_one(kpi_doc)
    
    return {"message": "Đã tạo KPI review", "id": str(result.inserted_id)}

@router.get("/my")
async def get_my_kpi_reviews(
    year: Optional[int] = None,
    period: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get current user's KPI reviews"""
    kpi_col = get_kpi_collection()
    
    query = {"employee_id": current_user["_id"]}
    if year:
        query["period_start"] = {"$regex": f"^{year}"}
    if period:
        query["period"] = period
    
    reviews = await kpi_col.find(query).sort("created_at", -1).to_list(50)
    
    return [{
        "id": str(r["_id"]),
        "period": r["period"],
        "period_start": r["period_start"],
        "period_end": r["period_end"],
        "goals": r["goals"],
        "overall_score": r["overall_score"],
        "status": r["status"],
        "self_review": r.get("self_review"),
        "manager_feedback": r.get("manager_feedback"),
        "created_at": r["created_at"]
    } for r in reviews]

@router.get("/team")
async def get_team_kpi_reviews(
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get team KPI reviews for managers"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value, UserRole.LEADER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền xem")
    
    kpi_col = get_kpi_collection()
    
    query = {}
    if year:
        query["period_start"] = {"$regex": f"^{year}"}
    
    # Leaders see only their department
    if current_user.get("role") == UserRole.LEADER.value:
        query["employee_department"] = current_user.get("department")
    
    reviews = await kpi_col.find(query).sort("created_at", -1).to_list(200)
    
    return [{
        "id": str(r["_id"]),
        "employee": {
            "id": str(r["employee_id"]),
            "name": r.get("employee_name"),
            "department": r.get("employee_department")
        },
        "period": r["period"],
        "period_start": r["period_start"],
        "period_end": r["period_end"],
        "overall_score": r["overall_score"],
        "status": r["status"],
        "created_at": r["created_at"]
    } for r in reviews]

@router.put("/{review_id}/submit")
async def submit_self_review(
    review_id: str,
    data: KPIReviewUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Employee submits self-review with achievements"""
    kpi_col = get_kpi_collection()
    
    review = await kpi_col.find_one({"_id": ObjectId(review_id)})
    if not review:
        raise HTTPException(status_code=404, detail="Không tìm thấy KPI review")
    
    if review["employee_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Chỉ được cập nhật KPI của mình")
    
    if review["status"] not in [ReviewStatus.DRAFT.value, ReviewStatus.SUBMITTED.value]:
        raise HTTPException(status_code=400, detail="Không thể cập nhật KPI đã được review")
    
    # Calculate scores
    goals = data.goals
    total_weight = sum(g.get("weight", 1) for g in goals)
    weighted_score = 0
    
    for goal in goals:
        target = goal.get("target", 1)
        achievement = goal.get("achievement", 0)
        weight = goal.get("weight", 1)
        
        # Score = (achievement / target) * 100, capped at 100
        score = min(100, (achievement / target * 100)) if target > 0 else 0
        goal["score"] = round(score, 1)
        weighted_score += score * weight
    
    overall_score = round(weighted_score / total_weight, 1) if total_weight > 0 else 0
    
    await kpi_col.update_one(
        {"_id": ObjectId(review_id)},
        {"$set": {
            "goals": goals,
            "overall_score": overall_score,
            "self_review": data.self_review,
            "status": ReviewStatus.SUBMITTED.value,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Notify manager
    await create_notification(
        review["created_by"],
        "SYSTEM",
        "KPI đã được submit",
        f"{current_user.get('full_name')} đã submit tự đánh giá KPI",
        "/kpi"
    )
    
    return {"message": "Đã submit tự đánh giá", "overall_score": overall_score}

@router.put("/{review_id}/review")
async def manager_review(
    review_id: str,
    feedback: str = Query(...),
    approve: bool = Query(True),
    current_user: dict = Depends(get_current_user)
):
    """Manager reviews and approves/provides feedback"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value, UserRole.LEADER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền review")
    
    kpi_col = get_kpi_collection()
    
    review = await kpi_col.find_one({"_id": ObjectId(review_id)})
    if not review:
        raise HTTPException(status_code=404, detail="Không tìm thấy KPI review")
    
    new_status = ReviewStatus.APPROVED.value if approve else ReviewStatus.REVIEWED.value
    
    await kpi_col.update_one(
        {"_id": ObjectId(review_id)},
        {"$set": {
            "manager_feedback": feedback,
            "reviewed_by": current_user["_id"],
            "reviewed_by_name": current_user.get("full_name"),
            "reviewed_at": datetime.utcnow(),
            "status": new_status,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Notify employee
    await create_notification(
        review["employee_id"],
        "SYSTEM",
        f"KPI đã được {'duyệt' if approve else 'review'}",
        f"KPI của bạn đã được {current_user.get('full_name')} {'duyệt' if approve else 'cho ý kiến'}",
        "/kpi"
    )
    
    return {"message": f"Đã {'duyệt' if approve else 'review'} KPI"}

@router.get("/stats")
async def get_kpi_stats(
    year: int = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Get KPI statistics for HR dashboard"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền xem thống kê")
    
    kpi_col = get_kpi_collection()
    
    reviews = await kpi_col.find({
        "period_start": {"$regex": f"^{year}"}
    }).to_list(1000)
    
    # Calculate averages by department
    dept_scores = {}
    for r in reviews:
        dept = r.get("employee_department", "Unknown")
        if dept not in dept_scores:
            dept_scores[dept] = {"total": 0, "count": 0}
        dept_scores[dept]["total"] += r.get("overall_score", 0)
        dept_scores[dept]["count"] += 1
    
    by_department = [
        {"department": d, "avg_score": round(s["total"] / s["count"], 1) if s["count"] > 0 else 0}
        for d, s in dept_scores.items()
    ]
    
    # Overall stats
    approved = [r for r in reviews if r["status"] == "APPROVED"]
    avg_score = round(sum(r.get("overall_score", 0) for r in approved) / len(approved), 1) if approved else 0
    
    return {
        "year": year,
        "total_reviews": len(reviews),
        "approved": len(approved),
        "pending": len([r for r in reviews if r["status"] in ["DRAFT", "SUBMITTED", "REVIEWED"]]),
        "average_score": avg_score,
        "by_department": by_department
    }
