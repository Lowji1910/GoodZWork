from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class AttendanceType(str, Enum):
    CHECK_IN = "CHECK_IN"
    CHECK_OUT = "CHECK_OUT"

class AttendanceStatus(str, Enum):
    ON_TIME = "ON_TIME"
    LATE = "LATE"
    EARLY_LEAVE = "EARLY_LEAVE"
    ABSENT = "ABSENT"

class GPSLocation(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

class AttendanceLog(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    user_name: str
    attendance_type: AttendanceType
    status: AttendanceStatus = AttendanceStatus.ON_TIME
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    location: GPSLocation
    face_image: Optional[str] = None  # Path to captured image
    face_confidence: Optional[float] = None
    notes: Optional[str] = None
    
    class Config:
        populate_by_name = True

class AttendanceCheckIn(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    face_image: str  # Base64 encoded image

class AttendanceCheckOut(BaseModel):
    latitude: float
    longitude: float
    notes: Optional[str] = None

class LocationCheckRequest(BaseModel):
    latitude: float
    longitude: float

class LocationCheckResponse(BaseModel):
    allowed: bool
    distance: float
    max_distance: int
    message: str

class DailyAttendanceSummary(BaseModel):
    date: str
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    check_in_status: Optional[AttendanceStatus] = None
    check_out_status: Optional[AttendanceStatus] = None
    total_hours: Optional[float] = None
