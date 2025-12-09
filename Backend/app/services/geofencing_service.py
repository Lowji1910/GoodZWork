from geopy.distance import geodesic
from motor.motor_asyncio import AsyncIOMotorClient
from ..config import settings

class GeofencingService:
    """
    Geofencing service to check if a user is within the allowed radius 
    of the company location for attendance.
    Now reads from database settings if available.
    """
    
    def __init__(self):
        # Default values from env (fallback)
        self.default_company_location = (settings.COMPANY_LATITUDE, settings.COMPANY_LONGITUDE)
        self.default_radius = settings.GEOFENCE_RADIUS_METERS
    
    async def get_settings_from_db(self):
        """Get company location settings from database"""
        from ..database import get_database
        try:
            db = get_database()
            settings_col = db["settings"]
            company_settings = await settings_col.find_one({"type": "company"})
            
            if company_settings:
                lat = company_settings.get("latitude", self.default_company_location[0])
                lon = company_settings.get("longitude", self.default_company_location[1])
                radius = company_settings.get("radius_meters", self.default_radius)
                return (lat, lon), radius
        except Exception as e:
            print(f"Error reading settings from DB: {e}")
        
        return self.default_company_location, self.default_radius
    
    def calculate_distance(self, company_location: tuple, user_lat: float, user_lon: float) -> float:
        """
        Calculate distance between user location and company location.
        Returns distance in meters.
        """
        user_location = (user_lat, user_lon)
        distance = geodesic(company_location, user_location).meters
        return distance
    
    async def is_within_range(self, user_lat: float, user_lon: float) -> tuple:
        """
        Check if user is within the allowed geofence radius.
        Reads location from database settings.
        
        Returns:
            (is_allowed, distance, message)
        """
        company_location, allowed_radius = await self.get_settings_from_db()
        distance = self.calculate_distance(company_location, user_lat, user_lon)
        
        if distance <= allowed_radius:
            return True, distance, f"Bạn đang trong phạm vi cho phép ({distance:.0f}m / {allowed_radius}m)"
        else:
            return False, distance, f"Bạn đang ở quá xa công ty ({distance:.0f}m). Khoảng cách tối đa cho phép: {allowed_radius}m"
    
    async def get_company_location(self) -> dict:
        """Get current company location settings"""
        company_location, allowed_radius = await self.get_settings_from_db()
        return {
            "latitude": company_location[0],
            "longitude": company_location[1],
            "radius": allowed_radius
        }

# Singleton instance
geofencing_service = GeofencingService()
