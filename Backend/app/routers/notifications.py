from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
from typing import Optional, List
from bson import ObjectId
from pydantic import BaseModel
from enum import Enum

from ..database import get_database
from .auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

class NotificationType(str, Enum):
    LEAVE_REQUEST = "LEAVE_REQUEST"
    LEAVE_APPROVED = "LEAVE_APPROVED"
    LEAVE_REJECTED = "LEAVE_REJECTED"
    TASK_ASSIGNED = "TASK_ASSIGNED"
    TASK_COMPLETED = "TASK_COMPLETED"
    PROJECT_ADDED = "PROJECT_ADDED"
    PAYROLL_READY = "PAYROLL_READY"
    ATTENDANCE_REMINDER = "ATTENDANCE_REMINDER"
    SYSTEM = "SYSTEM"

def get_notifications_collection():
    db = get_database()
    return db["notifications"]

# ================ ENDPOINTS ================

@router.get("/")
async def get_notifications(
    unread_only: bool = False,
    limit: int = Query(default=20, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get user notifications"""
    notifications_col = get_notifications_collection()
    
    query = {"user_id": current_user["_id"]}
    if unread_only:
        query["read"] = False
    
    cursor = notifications_col.find(query).sort("created_at", -1).limit(limit)
    notifications = await cursor.to_list(limit)
    
    # Count unread
    unread_count = await notifications_col.count_documents({
        "user_id": current_user["_id"],
        "read": False
    })
    
    return {
        "notifications": [{
            "id": str(n["_id"]),
            "type": n.get("type", "SYSTEM"),
            "title": n.get("title"),
            "message": n.get("message"),
            "link": n.get("link"),
            "read": n.get("read", False),
            "created_at": n.get("created_at")
        } for n in notifications],
        "unread_count": unread_count
    }

@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark notification as read"""
    notifications_col = get_notifications_collection()
    
    result = await notifications_col.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user["_id"]},
        {"$set": {"read": True, "read_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")
    
    return {"message": "Đã đánh dấu đã đọc"}

@router.put("/read-all")
async def mark_all_as_read(
    current_user: dict = Depends(get_current_user)
):
    """Mark all notifications as read"""
    notifications_col = get_notifications_collection()
    
    await notifications_col.update_many(
        {"user_id": current_user["_id"], "read": False},
        {"$set": {"read": True, "read_at": datetime.utcnow()}}
    )
    
    return {"message": "Đã đánh dấu tất cả đã đọc"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a notification"""
    notifications_col = get_notifications_collection()
    
    result = await notifications_col.delete_one({
        "_id": ObjectId(notification_id),
        "user_id": current_user["_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")
    
    return {"message": "Đã xóa thông báo"}

# ================ HELPER FUNCTIONS ================

async def create_notification(
    user_id,
    notification_type: str,
    title: str,
    message: str,
    link: str = None
):
    """Create a new notification for a user"""
    notifications_col = get_notifications_collection()
    
    doc = {
        "user_id": user_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "link": link,
        "read": False,
        "created_at": datetime.utcnow()
    }
    
    await notifications_col.insert_one(doc)

async def create_notification_for_role(
    role: str,
    notification_type: str,
    title: str,
    message: str,
    link: str = None
):
    """Create notifications for all users with a specific role"""
    db = get_database()
    users_col = db["users"]
    notifications_col = get_notifications_collection()
    
    cursor = users_col.find({"role": role, "status": "ACTIVE"})
    users = await cursor.to_list(1000)
    
    notifications = []
    for user in users:
        notifications.append({
            "user_id": user["_id"],
            "type": notification_type,
            "title": title,
            "message": message,
            "link": link,
            "read": False,
            "created_at": datetime.utcnow()
        })
    
    if notifications:
        await notifications_col.insert_many(notifications)
