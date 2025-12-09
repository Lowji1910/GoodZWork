from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CompanySettings(BaseModel):
    """Company settings including location for geofencing"""
    company_name: str = "GoodZWork"
    latitude: float
    longitude: float
    radius_meters: int = 50
    address: Optional[str] = None
    work_start_time: str = "08:00"  # HH:MM format
    work_end_time: str = "17:00"
    late_threshold_minutes: int = 15
    early_leave_threshold_minutes: int = 30
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None

class CompanySettingsUpdate(BaseModel):
    """Update company settings request"""
    company_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_meters: Optional[int] = None
    address: Optional[str] = None
    work_start_time: Optional[str] = None
    work_end_time: Optional[str] = None
    late_threshold_minutes: Optional[int] = None
    early_leave_threshold_minutes: Optional[int] = None
