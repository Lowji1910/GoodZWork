"""
Script to create sample users with proper bcrypt hashed passwords.
Run: python create_users.py
"""
import asyncio
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "goodzwork"

SAMPLE_USERS = [
    {
        "email": "admin@goodzwork.com",
        "password": "123456",
        "full_name": "Super Admin",
        "phone": "0901000001",
        "department": "IT",
        "position": "Administrator",
        "role": "SUPER_ADMIN",
        "status": "ACTIVE",
    },
    {
        "email": "hr@goodzwork.com",
        "password": "123456",
        "full_name": "Nguyễn Thị HR",
        "phone": "0901000002",
        "department": "HR",
        "position": "HR Manager",
        "role": "HR_MANAGER",
        "status": "ACTIVE",
    },
    {
        "email": "accountant@goodzwork.com",
        "password": "123456",
        "full_name": "Trần Văn Kế Toán",
        "phone": "0901000003",
        "department": "Finance",
        "position": "Chief Accountant",
        "role": "ACCOUNTANT",
        "status": "ACTIVE",
    },
    {
        "email": "leader@goodzwork.com",
        "password": "123456",
        "full_name": "Lê Minh Leader",
        "phone": "0901000004",
        "department": "IT",
        "position": "Team Leader",
        "role": "LEADER",
        "status": "ACTIVE",
    },
    {
        "email": "employee@goodzwork.com",
        "password": "123456",
        "full_name": "Phạm Văn Nhân Viên",
        "phone": "0901000005",
        "department": "IT",
        "position": "Developer",
        "role": "EMPLOYEE",
        "status": "ACTIVE",
    },
]

async def create_users():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    users_col = db["users"]
    
    # Clear existing users
    await users_col.delete_many({})
    print("🗑️  Cleared existing users")
    
    for user_data in SAMPLE_USERS:
        hashed_password = pwd_context.hash(user_data["password"])
        
        user = {
            "email": user_data["email"],
            "hashed_password": hashed_password,
            "full_name": user_data["full_name"],
            "phone": user_data["phone"],
            "department": user_data["department"],
            "position": user_data["position"],
            "role": user_data["role"],
            "status": user_data["status"],
            "avatar": None,
            "face_registered": False,
            "face_encodings": [],
            "base_salary": 20000000,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        result = await users_col.insert_one(user)
        print(f"✅ Created: {user_data['email']} ({user_data['role']}) - ID: {result.inserted_id}")
    
    print("\n🎉 Done! Sample users created successfully.")
    print("\n📋 Login credentials:")
    print("-" * 50)
    for user in SAMPLE_USERS:
        print(f"  {user['role']:<15} | {user['email']:<30} | 123456")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_users())
