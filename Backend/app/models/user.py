from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v, info=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

class UserStatus(str, Enum):
    INIT = "INIT"           # Just created, needs profile setup
    PENDING = "PENDING"     # Profile submitted, waiting for HR approval
    ACTIVE = "ACTIVE"       # Approved, full access
    SUSPENDED = "SUSPENDED" # Temporarily suspended
    INACTIVE = "INACTIVE"   # Account disabled
    TERMINATED = "TERMINATED"  # Fired/resigned

class UserRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    HR_MANAGER = "HR_MANAGER"
    ACCOUNTANT = "ACCOUNTANT"
    LEADER = "LEADER"
    EMPLOYEE = "EMPLOYEE"

# Base User Model
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    avatar: Optional[str] = None
    employee_id: Optional[str] = None  # Auto-generated: DEPT-XXX
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_holder: Optional[str] = None
    role: UserRole = UserRole.EMPLOYEE
    status: UserStatus = UserStatus.INIT
    
# User in Database
class UserInDB(UserBase):
    id: Optional[str] = Field(default=None, alias="_id")
    hashed_password: str
    face_encodings: Optional[List[List[float]]] = None  # Face vectors from DeepFace
    face_registered: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# Create User Request (by HR)
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole = UserRole.EMPLOYEE

# Update Profile Request (by Employee)
class UserProfileUpdate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    avatar: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_holder: Optional[str] = None

# Login Request
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# User Response (public)
class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    avatar: Optional[str] = None
    employee_id: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_holder: Optional[str] = None
    role: str  # Changed to str for MongoDB compatibility
    status: str  # Changed to str for MongoDB compatibility
    face_registered: bool = False
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Token Response
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
