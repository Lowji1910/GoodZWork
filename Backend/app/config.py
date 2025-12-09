import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # MongoDB
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "goodzwork")
    
    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # Geofencing
    COMPANY_LATITUDE: float = float(os.getenv("COMPANY_LATITUDE", "10.7769"))
    COMPANY_LONGITUDE: float = float(os.getenv("COMPANY_LONGITUDE", "106.7009"))
    GEOFENCE_RADIUS_METERS: int = int(os.getenv("GEOFENCE_RADIUS_METERS", "50"))
    
    # Face Recognition
    FACE_MODEL: str = os.getenv("FACE_MODEL", "ArcFace")
    FACE_DETECTOR: str = os.getenv("FACE_DETECTOR", "retinaface")
    FACE_DISTANCE_THRESHOLD: float = float(os.getenv("FACE_DISTANCE_THRESHOLD", "0.4"))
    
    # Paths
    FACE_DATA_PATH: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "face_data")
    UPLOADS_PATH: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

settings = Settings()
