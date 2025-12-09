from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from bson import ObjectId

from ..database import get_users_collection
from ..models.user import UserResponse, UserProfileUpdate, UserStatus, UserRole
from ..services.face_recognition_service import face_service
from .auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.put("/profile")
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update user profile (Force Update flow for INIT users).
    After update, status remains INIT until face is registered.
    """
    users_col = get_users_collection()
    
    update_data = {
        "full_name": profile_data.full_name,
        "phone": profile_data.phone,
        "department": profile_data.department,
        "position": profile_data.position,
        "avatar": profile_data.avatar,
        "updated_at": datetime.utcnow()
    }
    
    await users_col.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": update_data}
    )
    
    return {
        "message": "Cập nhật hồ sơ thành công",
        "next_step": "face_enrollment" if not current_user.get("face_registered") else None
    }

from pydantic import BaseModel

class FaceEnrollRequest(BaseModel):
    face_images: List[str]

@router.post("/enroll-face")
async def enroll_face(
    request: FaceEnrollRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Enroll face with images for AI training.
    After successful enrollment, status changes to PENDING.
    """
    face_images = request.face_images
    
    if len(face_images) < 10:
        raise HTTPException(
            status_code=400, 
            detail=f"Cần ít nhất 10 ảnh khuôn mặt, bạn chỉ gửi {len(face_images)} ảnh"
        )
    
    # Process face images
    success, message, embeddings = face_service.enroll_faces(
        user_id=current_user["_id"],
        face_images=face_images
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    # Update user with face embeddings and change status to PENDING
    users_col = get_users_collection()
    await users_col.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {
            "$set": {
                "face_encodings": embeddings,
                "face_registered": True,
                "status": UserStatus.PENDING.value,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "message": message,
        "status": "PENDING",
        "embeddings_count": len(embeddings),
        "next_step": "wait_for_approval"
    }

@router.get("/pending", response_model=List[dict])
async def get_pending_users(current_user: dict = Depends(get_current_user)):
    """Get list of users pending approval (HR/Admin only)"""
    if current_user.get("role") not in [UserRole.HR_MANAGER.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
    
    users_col = get_users_collection()
    pending_users = await users_col.find(
        {"status": UserStatus.PENDING.value}
    ).to_list(None)
    
    result = []
    for user in pending_users:
        result.append({
            "id": str(user["_id"]),
            "email": user["email"],
            "full_name": user.get("full_name"),
            "department": user.get("department"),
            "position": user.get("position"),
            "avatar": user.get("avatar"),
            "face_registered": user.get("face_registered", False),
            "created_at": user.get("created_at"),
            "updated_at": user.get("updated_at")
        })
    
    return result

@router.put("/{user_id}/approve")
async def approve_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Approve a pending user (HR/Admin only)"""
    if current_user.get("role") not in [UserRole.HR_MANAGER.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Không có quyền duyệt hồ sơ")
    
    users_col = get_users_collection()
    
    # Check if user exists and is pending
    user = await users_col.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    
    if user.get("status") != UserStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Người dùng không ở trạng thái chờ duyệt")
    
    # Update status to ACTIVE
    await users_col.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "status": UserStatus.ACTIVE.value,
                "approved_by": current_user["_id"],
                "approved_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "message": "Duyệt hồ sơ thành công",
        "user_id": user_id,
        "status": "ACTIVE"
    }

@router.put("/{user_id}/reject")
async def reject_user(
    user_id: str,
    reason: str,
    current_user: dict = Depends(get_current_user)
):
    """Reject a pending user (HR/Admin only)"""
    if current_user.get("role") not in [UserRole.HR_MANAGER.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Không có quyền từ chối hồ sơ")
    
    users_col = get_users_collection()
    
    # Reset to INIT status so user can re-register face
    await users_col.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "status": UserStatus.INIT.value,
                "face_registered": False,
                "face_encodings": [],
                "rejection_reason": reason,
                "rejected_by": current_user["_id"],
                "rejected_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "message": "Đã từ chối hồ sơ",
        "user_id": user_id,
        "reason": reason
    }

@router.get("/list", response_model=List[dict])
async def list_users(
    status: str = None,
    role: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get list of all users (HR/Admin only)"""
    if current_user.get("role") not in [UserRole.HR_MANAGER.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")
    
    users_col = get_users_collection()
    
    query = {}
    if status:
        query["status"] = status
    if role:
        query["role"] = role
    
    users = await users_col.find(query).to_list(None)
    
    result = []
    for user in users:
        result.append({
            "id": str(user["_id"]),
            "email": user["email"],
            "full_name": user.get("full_name"),
            "phone": user.get("phone"),
            "department": user.get("department"),
            "position": user.get("position"),
            "avatar": user.get("avatar"),
            "role": user.get("role"),
            "status": user.get("status"),
            "face_registered": user.get("face_registered", False),
            "created_at": user.get("created_at")
        })
    
    return result

@router.get("/{user_id}", response_model=dict)
async def get_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get user details"""
    users_col = get_users_collection()
    user = await users_col.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "full_name": user.get("full_name"),
        "phone": user.get("phone"),
        "department": user.get("department"),
        "position": user.get("position"),
        "avatar": user.get("avatar"),
        "role": user.get("role"),
        "status": user.get("status"),
        "face_registered": user.get("face_registered", False),
        "created_at": user.get("created_at")
    }
