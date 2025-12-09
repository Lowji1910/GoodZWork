from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from ..database import get_database
from ..models.settings import CompanySettings, CompanySettingsUpdate
from ..config import settings as app_settings
from .auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["Settings"])

async def get_settings_collection():
    db = get_database()
    return db["settings"]

@router.get("/company", response_model=CompanySettings)
async def get_company_settings(current_user: dict = Depends(get_current_user)):
    """Get current company settings (any authenticated user)"""
    settings_col = await get_settings_collection()
    settings = await settings_col.find_one({"type": "company"})
    
    if not settings:
        # Return default settings from env
        return CompanySettings(
            company_name="GoodZWork",
            latitude=app_settings.COMPANY_LATITUDE,
            longitude=app_settings.COMPANY_LONGITUDE,
            radius_meters=app_settings.GEOFENCE_RADIUS_METERS,
            address="Chưa cấu hình địa chỉ",
            work_start_time="08:00",
            work_end_time="17:00",
            late_threshold_minutes=15,
            early_leave_threshold_minutes=30
        )
    
    return CompanySettings(
        company_name=settings.get("company_name", "GoodZWork"),
        latitude=settings.get("latitude", app_settings.COMPANY_LATITUDE),
        longitude=settings.get("longitude", app_settings.COMPANY_LONGITUDE),
        radius_meters=settings.get("radius_meters", app_settings.GEOFENCE_RADIUS_METERS),
        address=settings.get("address"),
        work_start_time=settings.get("work_start_time", "08:00"),
        work_end_time=settings.get("work_end_time", "17:00"),
        late_threshold_minutes=settings.get("late_threshold_minutes", 15),
        early_leave_threshold_minutes=settings.get("early_leave_threshold_minutes", 30),
        updated_at=settings.get("updated_at"),
        updated_by=settings.get("updated_by")
    )

@router.put("/company", response_model=CompanySettings)
async def update_company_settings(
    update_data: CompanySettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update company settings (SUPER_ADMIN only)"""
    if current_user.get("role") != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Chỉ Super Admin mới có thể thay đổi cấu hình công ty")
    
    settings_col = await get_settings_collection()
    
    # Get existing settings or create new
    existing = await settings_col.find_one({"type": "company"})
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    update_dict["updated_by"] = current_user.get("full_name", current_user.get("email"))
    update_dict["type"] = "company"
    
    if existing:
        await settings_col.update_one(
            {"type": "company"},
            {"$set": update_dict}
        )
    else:
        # Create with defaults + updates
        new_settings = {
            "type": "company",
            "company_name": "GoodZWork",
            "latitude": app_settings.COMPANY_LATITUDE,
            "longitude": app_settings.COMPANY_LONGITUDE,
            "radius_meters": app_settings.GEOFENCE_RADIUS_METERS,
            "address": None,
            "work_start_time": "08:00",
            "work_end_time": "17:00",
            "late_threshold_minutes": 15,
            "early_leave_threshold_minutes": 30,
            **update_dict
        }
        await settings_col.insert_one(new_settings)
    
    # Return updated settings
    return await get_company_settings(current_user)

@router.get("/company/location")
async def get_company_location():
    """Get company location for geofencing (public endpoint)"""
    settings_col = await get_settings_collection()
    settings = await settings_col.find_one({"type": "company"})
    
    if settings:
        return {
            "latitude": settings.get("latitude", app_settings.COMPANY_LATITUDE),
            "longitude": settings.get("longitude", app_settings.COMPANY_LONGITUDE),
            "radius_meters": settings.get("radius_meters", app_settings.GEOFENCE_RADIUS_METERS),
            "company_name": settings.get("company_name", "GoodZWork"),
            "address": settings.get("address")
        }
    
    return {
        "latitude": app_settings.COMPANY_LATITUDE,
        "longitude": app_settings.COMPANY_LONGITUDE,
        "radius_meters": app_settings.GEOFENCE_RADIUS_METERS,
        "company_name": "GoodZWork",
        "address": None
    }
