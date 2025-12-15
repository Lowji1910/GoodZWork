from datetime import datetime, time
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from ..database import get_attendance_collection, get_users_collection
from ..models.attendance import (
    AttendanceLog, AttendanceCheckIn, AttendanceType, AttendanceStatus,
    LocationCheckRequest, LocationCheckResponse, DailyAttendanceSummary, GPSLocation
)
from ..models.user import UserStatus
from ..services.face_recognition_service import face_service
from ..services.geofencing_service import geofencing_service
from .auth import get_current_user

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

# Work schedule (configurable)
WORK_START_TIME = time(8, 30)  # 8:30 AM
WORK_END_TIME = time(17, 30)   # 5:30 PM
LATE_THRESHOLD_MINUTES = 15     # 15 minutes grace period

def calculate_attendance_status(check_time: datetime, attendance_type: AttendanceType) -> AttendanceStatus:
    """Calculate if check-in is late or check-out is early"""
    current_time = check_time.time()
    
    if attendance_type == AttendanceType.CHECK_IN:
        # Add grace period
        late_time = time(
            WORK_START_TIME.hour,
            WORK_START_TIME.minute + LATE_THRESHOLD_MINUTES
        )
        if current_time > late_time:
            return AttendanceStatus.LATE
        return AttendanceStatus.ON_TIME
    
    elif attendance_type == AttendanceType.CHECK_OUT:
        if current_time < WORK_END_TIME:
            return AttendanceStatus.EARLY_LEAVE
        return AttendanceStatus.ON_TIME
    
    return AttendanceStatus.ON_TIME

@router.post("/check-location", response_model=LocationCheckResponse)
async def check_location(
    location: LocationCheckRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Check if user is within geofence radius before allowing camera access.
    """
    if current_user.get("status") != UserStatus.ACTIVE.value:
        raise HTTPException(status_code=403, detail="Tài khoản chưa được kích hoạt")
    
    allowed, distance, message = await geofencing_service.is_within_range(
        location.latitude, location.longitude
    )
    
    company_location = await geofencing_service.get_company_location()
    
    return LocationCheckResponse(
        allowed=allowed,
        distance=distance,
        max_distance=company_location["radius"],
        message=message
    )

@router.post("/checkin")
async def check_in(
    data: AttendanceCheckIn,
    current_user: dict = Depends(get_current_user)
):
    """
    AI-powered check-in with face recognition.
    1. Verify geolocation
    2. Verify face
    3. Log attendance
    """
    if current_user.get("status") != UserStatus.ACTIVE.value:
        raise HTTPException(status_code=403, detail="Tài khoản chưa được kích hoạt")
    
    # 1. Check geolocation
    allowed, distance, geo_message = await geofencing_service.is_within_range(
        data.latitude, data.longitude
    )
    if not allowed:
        raise HTTPException(status_code=400, detail=geo_message)
    
    # 2. Verify face
    users_col = get_users_collection()
    user = await users_col.find_one({"_id": ObjectId(current_user["_id"])})
    
    if not user.get("face_encodings"):
        raise HTTPException(
            status_code=400, 
            detail="Bạn chưa đăng ký khuôn mặt. Vui lòng hoàn tất đăng ký trước."
        )
    
    is_match, confidence, face_message = face_service.verify_face(
        data.face_image,
        user["face_encodings"]
    )
    
    if not is_match:
        raise HTTPException(status_code=400, detail=face_message)
    
    # 3. Check if already checked in today
    attendance_col = get_attendance_collection()
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
    
    existing_checkin = await attendance_col.find_one({
        "user_id": current_user["_id"],
        "attendance_type": AttendanceType.CHECK_IN.value,
        "timestamp": {"$gte": today_start, "$lte": today_end}
    })
    
    if existing_checkin:
        raise HTTPException(status_code=400, detail="Bạn đã check-in hôm nay rồi")
    
    # 4. Save attendance image
    image_path = face_service.save_attendance_image(
        current_user["_id"],
        data.face_image,
        "checkin"
    )
    
    # 5. Calculate status and log attendance
    now = datetime.now()
    status = calculate_attendance_status(now, AttendanceType.CHECK_IN)
    
    attendance_log = {
        "user_id": current_user["_id"],
        "user_name": current_user.get("full_name", "Unknown"),
        "attendance_type": AttendanceType.CHECK_IN.value,
        "status": status.value,
        "timestamp": now,
        "location": {
            "latitude": data.latitude,
            "longitude": data.longitude,
            "accuracy": data.accuracy
        },
        "face_image": image_path,
        "face_confidence": confidence
    }
    
    result = await attendance_col.insert_one(attendance_log)
    
    status_text = "Đúng giờ ✓" if status == AttendanceStatus.ON_TIME else "Đi muộn ⚠"
    
    return {
        "message": f"Check-in thành công! {status_text}",
        "user_name": current_user.get("full_name"),
        "time": now.strftime("%H:%M:%S"),
        "status": status.value,
        "confidence": f"{confidence:.1f}%",
        "log_id": str(result.inserted_id)
    }

@router.post("/checkout")
async def check_out(
    data: AttendanceCheckIn,  # Same structure as check-in
    current_user: dict = Depends(get_current_user)
):
    """
    AI-powered check-out with face recognition.
    """
    if current_user.get("status") != UserStatus.ACTIVE.value:
        raise HTTPException(status_code=403, detail="Tài khoản chưa được kích hoạt")
    
    # 1. Check geolocation
    allowed, distance, geo_message = await geofencing_service.is_within_range(
        data.latitude, data.longitude
    )
    if not allowed:
        raise HTTPException(status_code=400, detail=geo_message)
    
    # 2. Verify face
    users_col = get_users_collection()
    user = await users_col.find_one({"_id": ObjectId(current_user["_id"])})
    
    if not user.get("face_encodings"):
        raise HTTPException(status_code=400, detail="Bạn chưa đăng ký khuôn mặt")
    
    is_match, confidence, face_message = face_service.verify_face(
        data.face_image,
        user["face_encodings"]
    )
    
    if not is_match:
        raise HTTPException(status_code=400, detail=face_message)
    
    # 3. Check if checked in today
    attendance_col = get_attendance_collection()
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
    print(f"DEBUG: Check-out search range: {today_start} - {today_end}")
    
    existing_checkin = await attendance_col.find_one({
        "user_id": current_user["_id"],
        "attendance_type": AttendanceType.CHECK_IN.value,
        "timestamp": {"$gte": today_start, "$lte": today_end}
    })
    
    if not existing_checkin:
        print(f"Checkout ERROR: No checkin found. User: {current_user['_id']}, Range: {today_start} - {today_end}")
        # Debug: Print recent logs
        recent_logs = await attendance_col.find({"user_id": current_user["_id"]}).sort("timestamp", -1).limit(5).to_list(5)
        print("DEBUG: Recent logs:")
        for log in recent_logs:
            print(f" - {log.get('attendance_type')} at {log.get('timestamp')}")
            
        raise HTTPException(status_code=400, detail="Bạn chưa check-in hôm nay")
    
    # 4. Check if already checked out
    existing_checkout = await attendance_col.find_one({
        "user_id": current_user["_id"],
        "attendance_type": AttendanceType.CHECK_OUT.value,
        "timestamp": {"$gte": today_start, "$lte": today_end}
    })
    
    if existing_checkout:
        raise HTTPException(status_code=400, detail="Bạn đã check-out hôm nay rồi")
    
    # 5. Save attendance image
    image_path = face_service.save_attendance_image(
        current_user["_id"],
        data.face_image,
        "checkout"
    )
    
    # 6. Calculate status and log attendance
    now = datetime.now()
    status = calculate_attendance_status(now, AttendanceType.CHECK_OUT)
    
    # Calculate working hours
    checkin_time = existing_checkin["timestamp"]
    working_hours = (now - checkin_time).total_seconds() / 3600
    
    attendance_log = {
        "user_id": current_user["_id"],
        "user_name": current_user.get("full_name", "Unknown"),
        "attendance_type": AttendanceType.CHECK_OUT.value,
        "status": status.value,
        "timestamp": now,
        "location": {
            "latitude": data.latitude,
            "longitude": data.longitude,
            "accuracy": data.accuracy
        },
        "face_image": image_path,
        "face_confidence": confidence,
        "notes": f"Tổng giờ làm: {working_hours:.1f}h"
    }
    
    result = await attendance_col.insert_one(attendance_log)
    
    status_text = "Đúng giờ ✓" if status == AttendanceStatus.ON_TIME else "Về sớm ⚠"
    
    return {
        "message": f"Check-out thành công! {status_text}",
        "user_name": current_user.get("full_name"),
        "time": now.strftime("%H:%M:%S"),
        "status": status.value,
        "working_hours": f"{working_hours:.1f}",
        "confidence": f"{confidence:.1f}%",
        "log_id": str(result.inserted_id)
    }

@router.get("/logs", response_model=List[dict])
async def get_attendance_logs(
    start_date: str = None,
    end_date: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get attendance logs for current user"""
    attendance_col = get_attendance_collection()
    
    query = {"user_id": current_user["_id"]}
    
    if start_date and end_date:
        query["timestamp"] = {
            "$gte": datetime.fromisoformat(start_date),
            "$lte": datetime.fromisoformat(end_date)
        }
    
    logs = await attendance_col.find(query).sort("timestamp", -1).to_list(100)
    
    result = []
    for log in logs:
        result.append({
            "id": str(log["_id"]),
            "type": log["attendance_type"],
            "status": log["status"],
            "timestamp": log["timestamp"].isoformat(),
            "location": log.get("location"),
            "face_confidence": log.get("face_confidence"),
            "notes": log.get("notes")
        })
    
    return result

@router.get("/today")
async def get_today_status(current_user: dict = Depends(get_current_user)):
    """Get today's attendance status for current user"""
    attendance_col = get_attendance_collection()
    
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
    
    checkin = await attendance_col.find_one({
        "user_id": current_user["_id"],
        "attendance_type": AttendanceType.CHECK_IN.value,
        "timestamp": {"$gte": today_start, "$lte": today_end}
    })
    
    checkout = await attendance_col.find_one({
        "user_id": current_user["_id"],
        "attendance_type": AttendanceType.CHECK_OUT.value,
        "timestamp": {"$gte": today_start, "$lte": today_end}
    })
    
    return {
        "checked_in": checkin is not None,
        "checked_out": checkout is not None,
        "checkin_time": checkin["timestamp"].isoformat() if checkin else None,
        "checkout_time": checkout["timestamp"].isoformat() if checkout else None,
        "checkin_status": checkin["status"] if checkin else None,
        "checkout_status": checkout["status"] if checkout else None
    }

@router.get("/company-location")
async def get_company_location():
    """Get company location for geofencing"""
    return await geofencing_service.get_company_location()

@router.get("/report/monthly")
async def get_monthly_report(
    month: int,
    year: int,
    current_user: dict = Depends(get_current_user)
):
    """Get monthly attendance report for current user"""
    from calendar import monthrange
    
    attendance_col = get_attendance_collection()
    
    # Build date range
    first_day = datetime(year, month, 1)
    last_day = datetime(year, month, monthrange(year, month)[1], 23, 59, 59)
    
    query = {
        "user_id": current_user["_id"],
        "timestamp": {"$gte": first_day, "$lte": last_day}
    }
    
    logs = await attendance_col.find(query).sort("timestamp", 1).to_list(1000)
    
    # Aggregate by day
    daily_data = {}
    for log in logs:
        day = log["timestamp"].strftime("%Y-%m-%d")
        if day not in daily_data:
            daily_data[day] = {"checkin": None, "checkout": None, "status": None}
        
        if log["attendance_type"] == "CHECK_IN":
            daily_data[day]["checkin"] = log["timestamp"].strftime("%H:%M")
            daily_data[day]["status"] = log["status"]
        elif log["attendance_type"] == "CHECK_OUT":
            daily_data[day]["checkout"] = log["timestamp"].strftime("%H:%M")
    
    # Calculate statistics
    total_days = len(daily_data)
    on_time = sum(1 for d in daily_data.values() if d["status"] == "ON_TIME")
    late = sum(1 for d in daily_data.values() if d["status"] == "LATE")
    
    return {
        "month": month,
        "year": year,
        "total_working_days": total_days,
        "on_time_days": on_time,
        "late_days": late,
        "on_time_rate": round(on_time / total_days * 100, 1) if total_days > 0 else 0,
        "daily_data": daily_data
    }

@router.get("/report/team")
async def get_team_report(
    month: int,
    year: int,
    current_user: dict = Depends(get_current_user)
):
    """Get team attendance report (for Leaders/HR)"""
    from ..models.user import UserRole
    from calendar import monthrange
    
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value, UserRole.LEADER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền xem báo cáo team")
    
    attendance_col = get_attendance_collection()
    users_col = get_users_collection()
    
    # Build date range
    first_day = datetime(year, month, 1)
    last_day = datetime(year, month, monthrange(year, month)[1], 23, 59, 59)
    
    # Get all users (filter by department for Leaders)
    user_query = {"status": "ACTIVE"}
    if current_user.get("role") == UserRole.LEADER.value:
        user_query["department"] = current_user.get("department")
    
    users = await users_col.find(user_query).to_list(1000)
    
    # Get all attendance logs for the month
    logs = await attendance_col.find({
        "timestamp": {"$gte": first_day, "$lte": last_day},
        "attendance_type": "CHECK_IN"
    }).to_list(10000)
    
    # Aggregate by user
    user_stats = {}
    for user in users:
        user_id = str(user["_id"])
        user_logs = [l for l in logs if l["user_id"] == user_id]
        
        on_time = sum(1 for l in user_logs if l["status"] == "ON_TIME")
        late = sum(1 for l in user_logs if l["status"] == "LATE")
        total = len(user_logs)
        
        user_stats[user_id] = {
            "id": user_id,
            "name": user.get("full_name"),
            "department": user.get("department"),
            "total_days": total,
            "on_time": on_time,
            "late": late,
            "on_time_rate": round(on_time / total * 100, 1) if total > 0 else 0
        }
    
    # Sort by on_time_rate descending
    sorted_stats = sorted(user_stats.values(), key=lambda x: x["on_time_rate"], reverse=True)
    
    # Calculate overall statistics
    total_checkins = len(logs)
    total_on_time = sum(1 for l in logs if l["status"] == "ON_TIME")
    
    return {
        "month": month,
        "year": year,
        "total_employees": len(users),
        "total_checkins": total_checkins,
        "overall_on_time_rate": round(total_on_time / total_checkins * 100, 1) if total_checkins > 0 else 0,
        "employees": sorted_stats
    }

