from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from bson import ObjectId
import os
import aiofiles

from ..config import settings
from ..database import get_conversations_collection, get_messages_collection, get_users_collection
from ..models.chat import (
    Conversation, ConversationCreate, ConversationUpdate,
    Message, MessageCreate, MessageStatus, ConversationType
)
from ..models.user import UserStatus
from .auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["Chat"])

@router.get("/conversations", response_model=List[dict])
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get all conversations for current user"""
    if current_user.get("status") != UserStatus.ACTIVE.value:
        raise HTTPException(status_code=403, detail="Tài khoản chưa được kích hoạt")
    
    conv_col = get_conversations_collection()
    users_col = get_users_collection()
    
    conversations = await conv_col.find({
        "participants": current_user["_id"]
    }).sort("last_message_at", -1).to_list(100)
    
    result = []
    for conv in conversations:
        # Get other participant info for private chats
        other_user = None
        if conv["type"] == ConversationType.PRIVATE.value:
            other_id = [p for p in conv["participants"] if p != current_user["_id"]]
            if other_id:
                other_user = await users_col.find_one({"_id": ObjectId(other_id[0])})
        
        result.append({
            "id": str(conv["_id"]),
            "type": conv["type"],
            "name": conv.get("name") or (other_user.get("full_name") if other_user else "Unknown"),
            "avatar": conv.get("avatar") or (other_user.get("avatar") if other_user else None),
            "participants": conv["participants"],
            "last_message": conv.get("last_message"),
            "last_message_at": conv.get("last_message_at"),
            "unread_count": 0  # TODO: Calculate unread
        })
    
    return result

@router.post("/conversations")
async def create_conversation(
    data: ConversationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new conversation (private or group)"""
    if current_user.get("status") != UserStatus.ACTIVE.value:
        raise HTTPException(status_code=403, detail="Tài khoản chưa được kích hoạt")
    
    conv_col = get_conversations_collection()
    
    # Add current user to participants
    participants = list(set([current_user["_id"]] + data.participants))
    
    # For private chat, check if conversation already exists
    if data.type == ConversationType.PRIVATE:
        if len(participants) != 2:
            raise HTTPException(status_code=400, detail="Chat riêng chỉ được có 2 người")
        
        existing = await conv_col.find_one({
            "type": ConversationType.PRIVATE.value,
            "participants": {"$all": participants, "$size": 2}
        })
        
        if existing:
            return {
                "id": str(existing["_id"]),
                "message": "Cuộc trò chuyện đã tồn tại"
            }
    
    conversation = {
        "type": data.type.value,
        "name": data.name,
        "avatar": None,
        "participants": participants,
        "admin_ids": [current_user["_id"]] if data.type == ConversationType.GROUP else [],
        "created_by": current_user["_id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "last_message": None,
        "last_message_at": None
    }
    
    result = await conv_col.insert_one(conversation)
    
    return {
        "id": str(result.inserted_id),
        "message": "Tạo cuộc trò chuyện thành công"
    }

@router.get("/conversations/{conversation_id}/messages", response_model=List[dict])
async def get_messages(
    conversation_id: str,
    limit: int = 50,
    before: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get messages in a conversation"""
    conv_col = get_conversations_collection()
    msg_col = get_messages_collection()
    
    # Check if user is participant
    conv = await conv_col.find_one({
        "_id": ObjectId(conversation_id),
        "participants": current_user["_id"]
    })
    
    if not conv:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc trò chuyện")
    
    query = {"conversation_id": conversation_id}
    if before:
        query["_id"] = {"$lt": ObjectId(before)}
    
    messages = await msg_col.find(query).sort("_id", -1).limit(limit).to_list(limit)
    messages.reverse()  # Oldest first
    
    result = []
    for msg in messages:
        result.append({
            "id": str(msg["_id"]),
            "sender_id": msg["sender_id"],
            "sender_name": msg["sender_name"],
            "sender_avatar": msg.get("sender_avatar"),
            "content": "Tin nhắn đã được thu hồi" if msg.get("is_revoked") else msg["content"],
            "message_type": msg.get("message_type", "text"),
            "file_url": None if msg.get("is_revoked") else msg.get("file_url"),
            "file_name": msg.get("file_name"),
            "status": msg.get("status", MessageStatus.SENT.value),
            "is_revoked": msg.get("is_revoked", False),
            "seen_by": msg.get("seen_by", []),
            "created_at": msg.get("created_at")
        })
    
    return result

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload file for chat"""
    if current_user.get("status") != UserStatus.ACTIVE.value:
        raise HTTPException(status_code=403, detail="Tài khoản chưa được kích hoạt")
    
    # Create upload directory
    upload_dir = os.path.join(settings.UPLOADS_PATH, "chat", current_user["_id"])
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    filepath = os.path.join(upload_dir, filename)
    
    # Save file
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Determine file type
    file_type = "file"
    if file.content_type.startswith("image/"):
        file_type = "image"
    
    return {
        "url": f"/uploads/chat/{current_user['_id']}/{filename}",
        "filename": file.filename,
        "type": file_type
    }

@router.put("/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    data: ConversationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update group conversation (admin only)"""
    conv_col = get_conversations_collection()
    
    conv = await conv_col.find_one({
        "_id": ObjectId(conversation_id),
        "admin_ids": current_user["_id"]
    })
    
    if not conv:
        raise HTTPException(status_code=403, detail="Bạn không phải admin của nhóm")
    
    update_data = {}
    if data.name:
        update_data["name"] = data.name
    if data.avatar:
        update_data["avatar"] = data.avatar
    update_data["updated_at"] = datetime.utcnow()
    
    await conv_col.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": update_data}
    )
    
    return {"message": "Cập nhật nhóm thành công"}

@router.post("/conversations/{conversation_id}/members")
async def add_members(
    conversation_id: str,
    member_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Add members to group (admin only)"""
    conv_col = get_conversations_collection()
    
    conv = await conv_col.find_one({
        "_id": ObjectId(conversation_id),
        "type": ConversationType.GROUP.value,
        "admin_ids": current_user["_id"]
    })
    
    if not conv:
        raise HTTPException(status_code=403, detail="Bạn không phải admin của nhóm")
    
    await conv_col.update_one(
        {"_id": ObjectId(conversation_id)},
        {
            "$addToSet": {"participants": {"$each": member_ids}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"message": f"Đã thêm {len(member_ids)} thành viên"}

@router.delete("/conversations/{conversation_id}/members/{member_id}")
async def remove_member(
    conversation_id: str,
    member_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove member from group (admin only)"""
    conv_col = get_conversations_collection()
    
    conv = await conv_col.find_one({
        "_id": ObjectId(conversation_id),
        "type": ConversationType.GROUP.value,
        "admin_ids": current_user["_id"]
    })
    
    if not conv:
        raise HTTPException(status_code=403, detail="Bạn không phải admin của nhóm")
    
    if member_id in conv.get("admin_ids", []):
        raise HTTPException(status_code=400, detail="Không thể xóa admin khác")
    
    await conv_col.update_one(
        {"_id": ObjectId(conversation_id)},
        {
            "$pull": {"participants": member_id},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"message": "Đã xóa thành viên"}

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete group (admin only) or leave conversation"""
    conv_col = get_conversations_collection()
    msg_col = get_messages_collection()
    
    conv = await conv_col.find_one({
        "_id": ObjectId(conversation_id),
        "participants": current_user["_id"]
    })
    
    if not conv:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc trò chuyện")
    
    # If admin and group chat, delete entire conversation
    if conv["type"] == ConversationType.GROUP.value and current_user["_id"] in conv.get("admin_ids", []):
        await msg_col.delete_many({"conversation_id": conversation_id})
        await conv_col.delete_one({"_id": ObjectId(conversation_id)})
        return {"message": "Đã xóa nhóm"}
    
    # Otherwise, just leave
    await conv_col.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$pull": {"participants": current_user["_id"]}}
    )
    
    return {"message": "Đã rời khỏi cuộc trò chuyện"}
