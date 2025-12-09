from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

class Database:
    client: AsyncIOMotorClient = None
    
db = Database()

async def connect_to_mongo():
    """Connect to MongoDB on startup"""
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    print(f"✅ Connected to MongoDB: {settings.DATABASE_NAME}")

async def close_mongo_connection():
    """Close MongoDB connection on shutdown"""
    if db.client:
        db.client.close()
        print("❌ Disconnected from MongoDB")

def get_database():
    """Get the database instance"""
    return db.client[settings.DATABASE_NAME]

# Collections
def get_users_collection():
    return get_database()["users"]

def get_attendance_collection():
    return get_database()["attendance_logs"]

def get_projects_collection():
    return get_database()["projects"]

def get_tasks_collection():
    return get_database()["tasks"]

def get_messages_collection():
    return get_database()["messages"]

def get_conversations_collection():
    return get_database()["conversations"]

def get_payrolls_collection():
    return get_database()["payrolls"]

def get_notifications_collection():
    return get_database()["notifications"]
