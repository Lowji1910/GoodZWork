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
    today_start = datetime.combine(datetime.today(), time.min)
    today_end = datetime.combine(datetime.today(), time.max)
    
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
    today_start = datetime.combine(datetime.today(), time.min)
    today_end = datetime.combine(datetime.today(), time.max)
    
    existing_checkin = await attendance_col.find_one({
        "user_id": current_user["_id"],
        "attendance_type": AttendanceType.CHECK_IN.value,
        "timestamp": {"$gte": today_start, "$lte": today_end}
    })
    
    if not existing_checkin:
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
    
    today_start = datetime.combine(datetime.today(), time.min)
    today_end = datetime.combine(datetime.today(), time.max)
    
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
