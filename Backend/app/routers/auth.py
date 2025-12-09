from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from bson import ObjectId

from ..config import settings
from ..database import get_users_collection
from ..models.user import UserCreate, UserLogin, UserResponse, Token, UserStatus, UserRole

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current user from JWT token"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    users_col = get_users_collection()
    user = await users_col.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    user["_id"] = str(user["_id"])
    return user

async def require_role(roles: list):
    """Dependency factory to require specific roles"""
    async def role_checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

@router.post("/register", response_model=dict)
async def register_user(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new user account (HR/Admin only).
    Initial status is INIT, requiring profile setup.
    """
    # Check if current user is HR or Admin
    if current_user.get("role") not in [UserRole.HR_MANAGER.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Chỉ HR hoặc Admin mới có thể tạo tài khoản")
    
    users_col = get_users_collection()
    
    # Check if email exists
    existing = await users_col.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email đã tồn tại trong hệ thống")
    
    # Create user with INIT status
    new_user = {
        "email": user_data.email,
        "hashed_password": get_password_hash(user_data.password),
        "role": user_data.role.value,
        "status": UserStatus.INIT.value,
        "face_registered": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await users_col.insert_one(new_user)
    
    return {
        "message": "Tạo tài khoản thành công",
        "user_id": str(result.inserted_id),
        "status": "INIT"
    }

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin):
    """
    Login and receive JWT token.
    Returns user status for frontend to handle redirects.
    """
    users_col = get_users_collection()
    user = await users_col.find_one({"email": login_data.email})
    
    if not user or not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác")
    
    if user.get("status") == UserStatus.SUSPENDED.value:
        raise HTTPException(status_code=403, detail="Tài khoản đang bị tạm khóa")
    
    if user.get("status") == UserStatus.INACTIVE.value:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị vô hiệu hóa")
    
    # Create access token
    access_token = create_access_token({"sub": str(user["_id"])})
    
    user_response = UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        full_name=user.get("full_name"),
        phone=user.get("phone"),
        department=user.get("department"),
        position=user.get("position"),
        avatar=user.get("avatar"),
        role=user.get("role", UserRole.EMPLOYEE.value),
        status=user.get("status", UserStatus.INIT.value),
        face_registered=user.get("face_registered", False),
        created_at=user.get("created_at", datetime.utcnow())
    )
    
    return Token(
        access_token=access_token,
        user=user_response
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user["_id"],
        email=current_user["email"],
        full_name=current_user.get("full_name"),
        phone=current_user.get("phone"),
        department=current_user.get("department"),
        position=current_user.get("position"),
        avatar=current_user.get("avatar"),
        role=current_user.get("role", UserRole.EMPLOYEE.value),
        status=current_user.get("status", UserStatus.INIT.value),
        face_registered=current_user.get("face_registered", False),
        created_at=current_user.get("created_at", datetime.utcnow())
    )

# Create initial admin user (run once)
@router.post("/init-admin")
async def init_admin():
    """Create initial super admin account if not exists"""
    users_col = get_users_collection()
    
    existing = await users_col.find_one({"role": UserRole.SUPER_ADMIN.value})
    if existing:
        raise HTTPException(status_code=400, detail="Super Admin đã tồn tại")
    
    admin_user = {
        "email": "admin@goodzwork.com",
        "hashed_password": get_password_hash("admin123"),
        "full_name": "Super Admin",
        "role": UserRole.SUPER_ADMIN.value,
        "status": UserStatus.ACTIVE.value,
        "face_registered": True,  # Admin doesn't need face registration
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await users_col.insert_one(admin_user)
    
    return {
        "message": "Super Admin đã được tạo",
        "email": "admin@goodzwork.com",
        "password": "admin123",
        "id": str(result.inserted_id)
    }
