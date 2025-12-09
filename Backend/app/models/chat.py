from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class MessageStatus(str, Enum):
    SENDING = "SENDING"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    SEEN = "SEEN"

class ConversationType(str, Enum):
    PRIVATE = "PRIVATE"  # 1-1 chat
    GROUP = "GROUP"      # Group chat

# Conversation Models
class Conversation(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    type: ConversationType
    name: Optional[str] = None  # For group chats
    avatar: Optional[str] = None  # For group chats
    participants: List[str]  # List of user IDs
    admin_ids: List[str] = []  # Group admins (for group chats)
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True

class ConversationCreate(BaseModel):
    type: ConversationType
    name: Optional[str] = None
    participants: List[str]

class ConversationUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None

# Message Models
class Message(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_avatar: Optional[str] = None
    content: str
    message_type: str = "text"  # text, image, file
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    status: MessageStatus = MessageStatus.SENDING
    is_revoked: bool = False
    seen_by: List[str] = []  # List of user IDs who have seen
    delivered_to: List[str] = []  # List of user IDs who received
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True

class MessageCreate(BaseModel):
    conversation_id: str
    content: str
    message_type: str = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = None

class MessageRevoke(BaseModel):
    message_id: str

class TypingEvent(BaseModel):
    conversation_id: str
    user_id: str
    user_name: str
    is_typing: bool

class MarkSeenRequest(BaseModel):
    conversation_id: str
    message_ids: List[str]

# For Socket Events
class SocketMessage(BaseModel):
    event: str
    data: dict
