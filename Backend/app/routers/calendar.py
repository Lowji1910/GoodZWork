from fastapi import APIRouter, Depends, Query
from datetime import datetime, date
from typing import Optional
from bson import ObjectId

from ..database import get_database
from .auth import get_current_user
from ..models.user import UserRole

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

def get_leaves_collection():
    db = get_database()
    return db["leaves"]

def get_tasks_collection():
    db = get_database()
    return db["tasks"]

def get_attendance_collection():
    db = get_database()
    return db["attendance"]

@router.get("/events")
async def get_calendar_events(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Get all calendar events for the month (leaves, tasks, birthdays)"""
    from calendar import monthrange
    
    first_day = f"{year}-{month:02d}-01"
    last_day_num = monthrange(year, month)[1]
    last_day = f"{year}-{month:02d}-{last_day_num}"
    
    events = []
    
    # 1. Get approved leaves
    leaves_col = get_leaves_collection()
    
    # Admins see all, others see own + team
    leave_query = {
        "status": "APPROVED",
        "$or": [
            {"start_date": {"$lte": last_day, "$gte": first_day}},
            {"end_date": {"$lte": last_day, "$gte": first_day}}
        ]
    }
    
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        # Show own leaves + team leaves for leaders
        if current_user.get("role") == UserRole.LEADER.value:
            leave_query["$or"] = [
                {"user_id": current_user["_id"]},
                {"user_department": current_user.get("department")}
            ]
        else:
            leave_query["user_id"] = current_user["_id"]
    
    leaves = await leaves_col.find(leave_query).to_list(100)
    
    for leave in leaves:
        events.append({
            "id": str(leave["_id"]),
            "title": f"🏖️ {leave.get('user_name', 'N/A')} - Nghỉ phép",
            "start": leave["start_date"],
            "end": leave["end_date"],
            "type": "leave",
            "color": "#22c55e",  # Green
            "allDay": True,
            "data": {
                "leave_type": leave["leave_type"],
                "days": leave["days"]
            }
        })
    
    # 2. Get tasks with due dates
    tasks_col = get_tasks_collection()
    
    task_query = {
        "due_date": {"$gte": first_day, "$lte": last_day},
        "$or": [
            {"assignee_id": current_user["_id"]},
            {"created_by": current_user["_id"]}
        ]
    }
    
    # Managers see all tasks
    if current_user.get("role") in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        task_query = {"due_date": {"$gte": first_day, "$lte": last_day}}
    
    tasks = await tasks_col.find(task_query).to_list(100)
    
    for task in tasks:
        status_colors = {
            "TODO": "#f59e0b",      # Orange
            "IN_PROGRESS": "#3b82f6", # Blue
            "DONE": "#22c55e",       # Green
            "REVIEW": "#8b5cf6"      # Purple
        }
        events.append({
            "id": str(task["_id"]),
            "title": f"📋 {task.get('title', 'Task')}",
            "start": task["due_date"],
            "end": task["due_date"],
            "type": "task",
            "color": status_colors.get(task.get("status"), "#64748b"),
            "allDay": True,
            "data": {
                "status": task.get("status"),
                "priority": task.get("priority")
            }
        })
    
    # 3. Get birthdays (from users collection)
    db = get_database()
    users_col = db["users"]
    
    # Find users with birthdays in this month
    users = await users_col.find({
        "status": "ACTIVE",
        "date_of_birth": {"$exists": True}
    }).to_list(1000)
    
    for user in users:
        dob = user.get("date_of_birth")
        if dob:
            try:
                dob_date = datetime.fromisoformat(dob) if isinstance(dob, str) else dob
                if dob_date.month == month:
                    birthday_str = f"{year}-{month:02d}-{dob_date.day:02d}"
                    events.append({
                        "id": f"bday_{user['_id']}",
                        "title": f"🎂 Sinh nhật {user.get('full_name', 'N/A')}",
                        "start": birthday_str,
                        "end": birthday_str,
                        "type": "birthday",
                        "color": "#ec4899",  # Pink
                        "allDay": True
                    })
            except:
                pass
    
    return events
