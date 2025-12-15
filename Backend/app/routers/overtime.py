from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, date
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel
from enum import Enum

from ..database import get_database
from .auth import get_current_user
from ..models.user import UserRole
from .notifications import create_notification, create_notification_for_role

router = APIRouter(prefix="/api/overtime", tags=["overtime"])

class OTStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"

class OTRequest(BaseModel):
    date: date
    start_time: str  # "18:00"
    end_time: str    # "21:00"
    reason: str
    hours: float = None

class OTResponse(BaseModel):
    message: str

def get_ot_collection():
    db = get_database()
    return db["overtime"]

def calculate_hours(start_time: str, end_time: str) -> float:
    """Calculate OT hours from time strings"""
    start = datetime.strptime(start_time, "%H:%M")
    end = datetime.strptime(end_time, "%H:%M")
    delta = (end - start).total_seconds() / 3600
    return max(0, delta)

# ================ ENDPOINTS ================

@router.post("/")
async def create_ot_request(
    data: OTRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new OT request"""
    if data.date < date.today():
        raise HTTPException(status_code=400, detail="Không thể đăng ký OT cho ngày đã qua")
    
    ot_col = get_ot_collection()
    
    # Check existing OT on same date
    existing = await ot_col.find_one({
        "user_id": current_user["_id"],
        "date": data.date.isoformat(),
        "status": {"$in": ["PENDING", "APPROVED"]}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Đã có đăng ký OT cho ngày này")
    
    hours = data.hours or calculate_hours(data.start_time, data.end_time)
    
    ot_doc = {
        "user_id": current_user["_id"],
        "user_name": current_user.get("full_name"),
        "user_department": current_user.get("department"),
        "date": data.date.isoformat(),
        "start_time": data.start_time,
        "end_time": data.end_time,
        "hours": hours,
        "reason": data.reason,
        "status": OTStatus.PENDING.value,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await ot_col.insert_one(ot_doc)
    
    # Notify HR
    await create_notification_for_role(
        "HR_MANAGER",
        "SYSTEM",
        "Đăng ký OT mới",
        f"{current_user.get('full_name')} đăng ký OT {hours}h ngày {data.date}",
        "/overtime"
    )
    
    return {"message": "Đã gửi đăng ký OT", "id": str(result.inserted_id)}

@router.get("/my")
async def get_my_ot(
    status: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get current user's OT requests"""
    ot_col = get_ot_collection()
    
    query = {"user_id": current_user["_id"]}
    if status:
        query["status"] = status
    if year:
        if month:
            query["date"] = {"$regex": f"^{year}-{month:02d}"}
        else:
            query["date"] = {"$regex": f"^{year}"}
    
    cursor = ot_col.find(query).sort("created_at", -1)
    ots = await cursor.to_list(100)
    
    # Calculate totals
    approved = [o for o in ots if o["status"] == "APPROVED"]
    total_hours = sum(o.get("hours", 0) for o in approved)
    
    return {
        "overtime_requests": [{
            "id": str(o["_id"]),
            "date": o["date"],
            "start_time": o["start_time"],
            "end_time": o["end_time"],
            "hours": o["hours"],
            "reason": o["reason"],
            "status": o["status"],
            "approved_by": o.get("approved_by"),
            "rejected_reason": o.get("rejected_reason"),
            "created_at": o["created_at"]
        } for o in ots],
        "summary": {
            "total_requests": len(ots),
            "approved_hours": total_hours,
            "pending": len([o for o in ots if o["status"] == "PENDING"])
        }
    }

@router.get("/pending")
async def get_pending_ot(
    current_user: dict = Depends(get_current_user)
):
    """Get pending OT requests for approval"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value, UserRole.LEADER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền xem")
    
    ot_col = get_ot_collection()
    
    query = {"status": OTStatus.PENDING.value}
    
    # Leaders only see their team
    if current_user.get("role") == UserRole.LEADER.value:
        query["user_department"] = current_user.get("department")
    
    cursor = ot_col.find(query).sort("created_at", -1)
    ots = await cursor.to_list(100)
    
    return [{
        "id": str(o["_id"]),
        "user": {
            "id": str(o["user_id"]),
            "name": o.get("user_name"),
            "department": o.get("user_department")
        },
        "date": o["date"],
        "start_time": o["start_time"],
        "end_time": o["end_time"],
        "hours": o["hours"],
        "reason": o["reason"],
        "created_at": o["created_at"]
    } for o in ots]

@router.put("/{ot_id}/approve")
async def approve_ot(
    ot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Approve an OT request"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value, UserRole.LEADER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền duyệt")
    
    ot_col = get_ot_collection()
    
    ot = await ot_col.find_one({"_id": ObjectId(ot_id)})
    if not ot:
        raise HTTPException(status_code=404, detail="Không tìm thấy đăng ký OT")
    
    if ot["status"] != OTStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Đăng ký đã được xử lý")
    
    await ot_col.update_one(
        {"_id": ObjectId(ot_id)},
        {"$set": {
            "status": OTStatus.APPROVED.value,
            "approved_by": current_user.get("full_name"),
            "approved_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Notify employee
    await create_notification(
        ot["user_id"],
        "SYSTEM",
        "OT đã được duyệt",
        f"Đăng ký OT ngày {ot['date']} ({ot['hours']}h) đã được duyệt",
        "/overtime"
    )
    
    return {"message": "Đã duyệt đăng ký OT"}

@router.put("/{ot_id}/reject")
async def reject_ot(
    ot_id: str,
    reason: str = Query(..., description="Lý do từ chối"),
    current_user: dict = Depends(get_current_user)
):
    """Reject an OT request"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value, UserRole.LEADER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền từ chối")
    
    ot_col = get_ot_collection()
    
    ot = await ot_col.find_one({"_id": ObjectId(ot_id)})
    if not ot:
        raise HTTPException(status_code=404, detail="Không tìm thấy đăng ký OT")
    
    if ot["status"] != OTStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Đăng ký đã được xử lý")
    
    await ot_col.update_one(
        {"_id": ObjectId(ot_id)},
        {"$set": {
            "status": OTStatus.REJECTED.value,
            "rejected_by": current_user.get("full_name"),
            "rejected_reason": reason,
            "rejected_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Notify employee
    await create_notification(
        ot["user_id"],
        "SYSTEM",
        "OT bị từ chối",
        f"Đăng ký OT ngày {ot['date']} bị từ chối. Lý do: {reason}",
        "/overtime"
    )
    
    return {"message": "Đã từ chối đăng ký OT"}

@router.put("/{ot_id}/cancel")
async def cancel_ot(
    ot_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel own OT request"""
    ot_col = get_ot_collection()
    
    ot = await ot_col.find_one({"_id": ObjectId(ot_id)})
    if not ot:
        raise HTTPException(status_code=404, detail="Không tìm thấy đăng ký OT")
    
    if ot["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Chỉ được hủy đăng ký của mình")
    
    if ot["status"] != OTStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Chỉ có thể hủy đăng ký đang chờ duyệt")
    
    await ot_col.update_one(
        {"_id": ObjectId(ot_id)},
        {"$set": {
            "status": OTStatus.CANCELLED.value,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Đã hủy đăng ký OT"}

@router.get("/stats")
async def get_ot_stats(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Get OT statistics for payroll calculation"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value, UserRole.ACCOUNTANT.value]:
        raise HTTPException(status_code=403, detail="Không có quyền xem thống kê")
    
    ot_col = get_ot_collection()
    db = get_database()
    users_col = db["users"]
    
    # Get all approved OT for the month
    date_pattern = f"{year}-{month:02d}"
    ots = await ot_col.find({
        "date": {"$regex": f"^{date_pattern}"},
        "status": OTStatus.APPROVED.value
    }).to_list(1000)
    
    # Aggregate by user
    user_stats = {}
    for ot in ots:
        uid = str(ot["user_id"])
        if uid not in user_stats:
            user_stats[uid] = {
                "user_id": uid,
                "user_name": ot.get("user_name"),
                "department": ot.get("user_department"),
                "total_hours": 0,
                "total_requests": 0
            }
        user_stats[uid]["total_hours"] += ot.get("hours", 0)
        user_stats[uid]["total_requests"] += 1
    
    return {
        "month": month,
        "year": year,
        "total_hours": sum(o.get("hours", 0) for o in ots),
        "total_requests": len(ots),
        "by_employee": list(user_stats.values())
    }
