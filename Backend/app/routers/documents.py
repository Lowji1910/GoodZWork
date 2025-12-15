from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from datetime import datetime
from typing import Optional, List
from bson import ObjectId
from pydantic import BaseModel
from enum import Enum
import os
import uuid
import shutil

from ..database import get_database
from .auth import get_current_user
from ..models.user import UserRole
from .notifications import create_notification
from ..config import settings

router = APIRouter(prefix="/api/documents", tags=["documents"])

class DocumentCategory(str, Enum):
    POLICY = "POLICY"          # Quy định công ty
    FORM = "FORM"              # Biểu mẫu
    GUIDE = "GUIDE"            # Hướng dẫn
    TRAINING = "TRAINING"      # Tài liệu đào tạo
    CONTRACT = "CONTRACT"      # Hợp đồng mẫu
    OTHER = "OTHER"

ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.png', '.jpg', '.jpeg'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def get_documents_collection():
    db = get_database()
    return db["documents"]

def get_safe_filename(filename: str) -> str:
    """Generate safe filename with UUID"""
    ext = os.path.splitext(filename)[1].lower()
    return f"{uuid.uuid4()}{ext}"

# ================ ENDPOINTS ================

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: str = Query(...),
    title: str = Query(...),
    description: str = Query(""),
    is_public: bool = Query(True),  # Visible to all employees
    current_user: dict = Depends(get_current_user)
):
    """Upload a document to the system"""
    # Only HR and admin can upload
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền upload")
    
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Loại file không hỗ trợ. Cho phép: {ALLOWED_EXTENSIONS}")
    
    # Validate file size
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File quá lớn (tối đa 10MB)")
    
    # Create documents directory
    docs_path = os.path.join(settings.UPLOADS_PATH, "documents")
    os.makedirs(docs_path, exist_ok=True)
    
    # Save file
    safe_name = get_safe_filename(file.filename)
    file_path = os.path.join(docs_path, safe_name)
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    # Save to database
    docs_col = get_documents_collection()
    
    doc = {
        "title": title,
        "description": description,
        "category": category,
        "original_name": file.filename,
        "file_name": safe_name,
        "file_path": f"/uploads/documents/{safe_name}",
        "file_size": size,
        "file_type": ext,
        "is_public": is_public,
        "uploaded_by": current_user["_id"],
        "uploaded_by_name": current_user.get("full_name"),
        "downloads": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await docs_col.insert_one(doc)
    
    return {"message": "Đã upload tài liệu", "id": str(result.inserted_id)}

@router.get("/")
async def get_documents(
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get documents list"""
    docs_col = get_documents_collection()
    
    query = {}
    
    # Regular employees only see public documents
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        query["is_public"] = True
    
    if category:
        query["category"] = category
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    docs = await docs_col.find(query).sort("created_at", -1).to_list(200)
    
    return [{
        "id": str(d["_id"]),
        "title": d["title"],
        "description": d.get("description", ""),
        "category": d["category"],
        "original_name": d["original_name"],
        "file_path": d["file_path"],
        "file_size": d["file_size"],
        "file_type": d["file_type"],
        "is_public": d.get("is_public", True),
        "downloads": d.get("downloads", 0),
        "uploaded_by": d.get("uploaded_by_name"),
        "created_at": d["created_at"]
    } for d in docs]

@router.get("/{doc_id}/download")
async def download_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Track document download"""
    docs_col = get_documents_collection()
    
    doc = await docs_col.find_one({"_id": ObjectId(doc_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    
    # Check access
    if not doc.get("is_public"):
        if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập")
    
    # Increment download count
    await docs_col.update_one(
        {"_id": ObjectId(doc_id)},
        {"$inc": {"downloads": 1}}
    )
    
    return {"file_path": doc["file_path"], "original_name": doc["original_name"]}

@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a document"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền xóa")
    
    docs_col = get_documents_collection()
    
    doc = await docs_col.find_one({"_id": ObjectId(doc_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    
    # Delete file
    file_path = os.path.join(settings.UPLOADS_PATH, "documents", doc["file_name"])
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Delete from database
    await docs_col.delete_one({"_id": ObjectId(doc_id)})
    
    return {"message": "Đã xóa tài liệu"}

@router.get("/categories")
async def get_categories():
    """Get document categories"""
    return [
        {"value": "POLICY", "label": "Quy định công ty"},
        {"value": "FORM", "label": "Biểu mẫu"},
        {"value": "GUIDE", "label": "Hướng dẫn"},
        {"value": "TRAINING", "label": "Tài liệu đào tạo"},
        {"value": "CONTRACT", "label": "Hợp đồng mẫu"},
        {"value": "OTHER", "label": "Khác"}
    ]

@router.get("/stats")
async def get_document_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get document statistics"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền xem thống kê")
    
    docs_col = get_documents_collection()
    docs = await docs_col.find({}).to_list(1000)
    
    # Stats by category
    by_category = {}
    total_size = 0
    total_downloads = 0
    
    for d in docs:
        cat = d["category"]
        by_category[cat] = by_category.get(cat, 0) + 1
        total_size += d.get("file_size", 0)
        total_downloads += d.get("downloads", 0)
    
    return {
        "total_documents": len(docs),
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "total_downloads": total_downloads,
        "by_category": by_category
    }
