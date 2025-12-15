from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, date
from typing import Optional, List
from bson import ObjectId
from pydantic import BaseModel
from enum import Enum

from ..database import get_database
from .auth import get_current_user
from ..models.user import UserRole
from .notifications import create_notification, create_notification_for_role

router = APIRouter(prefix="/api/leaves", tags=["leaves"])

# Enums
class LeaveType(str, Enum):
    ANNUAL = "ANNUAL"          # Nghỉ phép năm
    SICK = "SICK"              # Nghỉ ốm
    PERSONAL = "PERSONAL"      # Nghỉ việc riêng
    MATERNITY = "MATERNITY"    # Nghỉ thai sản
    WEDDING = "WEDDING"        # Nghỉ cưới
    BEREAVEMENT = "BEREAVEMENT" # Nghỉ tang
    UNPAID = "UNPAID"          # Nghỉ không lương

class LeaveStatus(str, Enum):
    PENDING = "PENDING"        # Chờ duyệt
    APPROVED = "APPROVED"      # Đã duyệt
    REJECTED = "REJECTED"      # Bị từ chối
    CANCELLED = "CANCELLED"    # Đã hủy

# Request models
class LeaveRequest(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str
    half_day: bool = False  # Nghỉ nửa ngày

class LeaveResponse(BaseModel):
    message: str

def get_leaves_collection():
    db = get_database()
    return db["leaves"]

def get_users_collection():
    db = get_database()
    return db["users"]

# Helper function to calculate leave days
def calculate_leave_days(start: date, end: date, half_day: bool = False) -> float:
    if half_day:
        return 0.5
    delta = (end - start).days + 1
    # Exclude weekends (simplified)
    return float(delta)

# ================ ENDPOINTS ================

@router.post("/")
async def create_leave_request(
    data: LeaveRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new leave request"""
    if data.start_date > data.end_date:
        raise HTTPException(status_code=400, detail="Ngày bắt đầu phải trước ngày kết thúc")
    
    leaves_col = get_leaves_collection()
    
    # Check for overlapping leaves
    overlap = await leaves_col.find_one({
        "user_id": current_user["_id"],
        "status": {"$in": ["PENDING", "APPROVED"]},
        "$or": [
            {"start_date": {"$lte": data.end_date.isoformat()}, "end_date": {"$gte": data.start_date.isoformat()}}
        ]
    })
    
    if overlap:
        raise HTTPException(status_code=400, detail="Đã có đơn nghỉ phép trong thời gian này")
    
    leave_doc = {
        "user_id": current_user["_id"],
        "user_name": current_user.get("full_name", current_user.get("email")),
        "user_department": current_user.get("department"),
        "leave_type": data.leave_type.value,
        "start_date": data.start_date.isoformat(),
        "end_date": data.end_date.isoformat(),
        "days": calculate_leave_days(data.start_date, data.end_date, data.half_day),
        "half_day": data.half_day,
        "reason": data.reason,
        "status": LeaveStatus.PENDING.value,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await leaves_col.insert_one(leave_doc)
    
    # Notify HR and Leaders about new leave request
    await create_notification_for_role(
        "HR_MANAGER",
        "LEAVE_REQUEST",
        "Đơn xin nghỉ phép mới",
        f"{current_user.get('full_name')} xin nghỉ {data.leave_type.value} từ {data.start_date}",
        "/leaves"
    )
    
    return {"message": "Đã gửi đơn xin nghỉ phép", "id": str(result.inserted_id)}

@router.get("/my")
async def get_my_leaves(
    status: Optional[str] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get current user's leave requests"""
    leaves_col = get_leaves_collection()
    
    query = {"user_id": current_user["_id"]}
    if status:
        query["status"] = status
    if year:
        query["start_date"] = {"$regex": f"^{year}"}
    
    cursor = leaves_col.find(query).sort("created_at", -1)
    leaves = await cursor.to_list(100)
    
    # Calculate summary
    approved = [l for l in leaves if l["status"] == "APPROVED"]
    total_days = sum(l.get("days", 0) for l in approved)
    
    return {
        "leaves": [{
            "id": str(l["_id"]),
            "leave_type": l["leave_type"],
            "start_date": l["start_date"],
            "end_date": l["end_date"],
            "days": l["days"],
            "reason": l["reason"],
            "status": l["status"],
            "approved_by": l.get("approved_by"),
            "rejected_reason": l.get("rejected_reason"),
            "created_at": l["created_at"]
        } for l in leaves],
        "summary": {
            "total_used": total_days,
            "annual_quota": 12,  # Default annual leave quota
            "remaining": 12 - total_days
        }
    }

@router.get("/pending")
async def get_pending_leaves(
    current_user: dict = Depends(get_current_user)
):
    """Get pending leave requests for approval (Leader/HR only)"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value, UserRole.LEADER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền xem đơn chờ duyệt")
    
    leaves_col = get_leaves_collection()
    users_col = get_users_collection()
    
    # Build query based on role
    query = {"status": LeaveStatus.PENDING.value}
    
    # Leaders only see their team members
    if current_user.get("role") == UserRole.LEADER.value:
        query["user_department"] = current_user.get("department")
    
    cursor = leaves_col.find(query).sort("created_at", -1)
    leaves = await cursor.to_list(100)
    
    result = []
    for l in leaves:
        user = await users_col.find_one({"_id": l["user_id"]})
        result.append({
            "id": str(l["_id"]),
            "user": {
                "id": str(l["user_id"]),
                "name": l.get("user_name"),
                "department": l.get("user_department"),
                "avatar": user.get("avatar") if user else None
            },
            "leave_type": l["leave_type"],
            "start_date": l["start_date"],
            "end_date": l["end_date"],
            "days": l["days"],
            "reason": l["reason"],
            "created_at": l["created_at"]
        })
    
    return result

@router.put("/{leave_id}/approve")
async def approve_leave(
    leave_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Approve a leave request"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value, UserRole.LEADER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền duyệt đơn")
    
    leaves_col = get_leaves_collection()
    
    leave = await leaves_col.find_one({"_id": ObjectId(leave_id)})
    if not leave:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn xin nghỉ")
    
    if leave["status"] != LeaveStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Đơn đã được xử lý")
    
    # Leaders can only approve their team
    if current_user.get("role") == UserRole.LEADER.value:
        if leave.get("user_department") != current_user.get("department"):
            raise HTTPException(status_code=403, detail="Chỉ được duyệt đơn trong phòng ban của bạn")
    
    await leaves_col.update_one(
        {"_id": ObjectId(leave_id)},
        {
            "$set": {
                "status": LeaveStatus.APPROVED.value,
                "approved_by": current_user.get("full_name"),
                "approved_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Notify employee that their leave was approved
    await create_notification(
        leave["user_id"],
        "LEAVE_APPROVED",
        "Đơn nghỉ phép đã được duyệt",
        f"Đơn nghỉ từ {leave['start_date']} đến {leave['end_date']} đã được {current_user.get('full_name')} duyệt",
        "/leaves"
    )
    
    return {"message": "Đã duyệt đơn xin nghỉ phép"}

@router.put("/{leave_id}/reject")
async def reject_leave(
    leave_id: str,
    reason: str = Query(..., description="Lý do từ chối"),
    current_user: dict = Depends(get_current_user)
):
    """Reject a leave request"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value, UserRole.LEADER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền từ chối đơn")
    
    leaves_col = get_leaves_collection()
    
    leave = await leaves_col.find_one({"_id": ObjectId(leave_id)})
    if not leave:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn xin nghỉ")
    
    if leave["status"] != LeaveStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Đơn đã được xử lý")
    
    await leaves_col.update_one(
        {"_id": ObjectId(leave_id)},
        {
            "$set": {
                "status": LeaveStatus.REJECTED.value,
                "rejected_by": current_user.get("full_name"),
                "rejected_reason": reason,
                "rejected_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Notify employee that their leave was rejected
    await create_notification(
        leave["user_id"],
        "LEAVE_REJECTED",
        "Đơn nghỉ phép bị từ chối",
        f"Đơn nghỉ từ {leave['start_date']} đến {leave['end_date']} đã bị từ chối. Lý do: {reason}",
        "/leaves"
    )
    
    return {"message": "Đã từ chối đơn xin nghỉ phép"}

@router.put("/{leave_id}/cancel")
async def cancel_leave(
    leave_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel own leave request"""
    leaves_col = get_leaves_collection()
    
    leave = await leaves_col.find_one({"_id": ObjectId(leave_id)})
    if not leave:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn xin nghỉ")
    
    if leave["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Chỉ được hủy đơn của chính mình")
    
    if leave["status"] not in [LeaveStatus.PENDING.value]:
        raise HTTPException(status_code=400, detail="Chỉ có thể hủy đơn đang chờ duyệt")
    
    await leaves_col.update_one(
        {"_id": ObjectId(leave_id)},
        {
            "$set": {
                "status": LeaveStatus.CANCELLED.value,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Đã hủy đơn xin nghỉ phép"}

@router.get("/calendar")
async def get_leave_calendar(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Get leave calendar for the month"""
    leaves_col = get_leaves_collection()
    
    # Build date range
    start = f"{year}-{month:02d}-01"
    if month == 12:
        end = f"{year + 1}-01-01"
    else:
        end = f"{year}-{month + 1:02d}-01"
    
    query = {
        "status": LeaveStatus.APPROVED.value,
        "$or": [
            {"start_date": {"$gte": start, "$lt": end}},
            {"end_date": {"$gte": start, "$lt": end}}
        ]
    }
    
    # Filter by department for non-admins
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        query["user_department"] = current_user.get("department")
    
    cursor = leaves_col.find(query)
    leaves = await cursor.to_list(100)
    
    return [{
        "id": str(l["_id"]),
        "user_name": l.get("user_name"),
        "leave_type": l["leave_type"],
        "start_date": l["start_date"],
        "end_date": l["end_date"],
        "days": l["days"]
    } for l in leaves]

@router.get("/stats")
async def get_leave_stats(
    year: int = Query(default=None),
    current_user: dict = Depends(get_current_user)
):
    """Get leave statistics for HR dashboard"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền xem thống kê")
    
    leaves_col = get_leaves_collection()
    
    if not year:
        year = datetime.now().year
    
    query = {"start_date": {"$regex": f"^{year}"}}
    cursor = leaves_col.find(query)
    leaves = await cursor.to_list(1000)
    
    pending = len([l for l in leaves if l["status"] == "PENDING"])
    approved = len([l for l in leaves if l["status"] == "APPROVED"])
    rejected = len([l for l in leaves if l["status"] == "REJECTED"])
    
    # By type
    by_type = {}
    for l in leaves:
        t = l["leave_type"]
        by_type[t] = by_type.get(t, 0) + 1
    
    return {
        "total": len(leaves),
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "by_type": by_type
    }
