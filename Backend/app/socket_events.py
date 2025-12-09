import socketio
from datetime import datetime
from bson import ObjectId

from .database import get_messages_collection, get_conversations_collection
from .models.chat import MessageStatus

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Store connected users: {user_id: sid}
connected_users = {}

@sio.event
async def connect(sid, environ, auth):
    """Handle client connection"""
    print(f"Client connected: {sid}")
    if auth and auth.get("user_id"):
        user_id = auth["user_id"]
        connected_users[user_id] = sid
        print(f"User {user_id} connected with SID {sid}")
        
        # Join user's conversation rooms
        conv_col = get_conversations_collection()
        conversations = await conv_col.find({"participants": user_id}).to_list(None)
        for conv in conversations:
            await sio.enter_room(sid, str(conv["_id"]))
            print(f"User {user_id} joined room {conv['_id']}")

@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    print(f"Client disconnected: {sid}")
    # Remove from connected users
    for user_id, user_sid in list(connected_users.items()):
        if user_sid == sid:
            del connected_users[user_id]
            print(f"User {user_id} disconnected")
            break

@sio.event
async def join_conversation(sid, data):
    """Join a conversation room"""
    conversation_id = data.get("conversation_id")
    if conversation_id:
        await sio.enter_room(sid, conversation_id)
        print(f"SID {sid} joined room {conversation_id}")

@sio.event
async def leave_conversation(sid, data):
    """Leave a conversation room"""
    conversation_id = data.get("conversation_id")
    if conversation_id:
        await sio.leave_room(sid, conversation_id)
        print(f"SID {sid} left room {conversation_id}")

@sio.event
async def send_message(sid, data):
    """
    Handle sending a new message.
    Flow: Client sends -> Server saves & broadcasts -> Recipients receive
    """
    msg_col = get_messages_collection()
    conv_col = get_conversations_collection()
    
    conversation_id = data.get("conversation_id")
    sender_id = data.get("sender_id")
    sender_name = data.get("sender_name", "Unknown")
    sender_avatar = data.get("sender_avatar")
    content = data.get("content")
    message_type = data.get("message_type", "text")
    file_url = data.get("file_url")
    file_name = data.get("file_name")
    
    if not conversation_id or not sender_id or not content:
        await sio.emit("error", {"message": "Missing required fields"}, to=sid)
        return
    
    # Create message
    message = {
        "conversation_id": conversation_id,
        "sender_id": sender_id,
        "sender_name": sender_name,
        "sender_avatar": sender_avatar,
        "content": content,
        "message_type": message_type,
        "file_url": file_url,
        "file_name": file_name,
        "status": MessageStatus.SENT.value,
        "is_revoked": False,
        "seen_by": [],
        "delivered_to": [],
        "created_at": datetime.utcnow()
    }
    
    # Save to database
    result = await msg_col.insert_one(message)
    message["_id"] = str(result.inserted_id)
    message["id"] = str(result.inserted_id)
    message["created_at"] = message["created_at"].isoformat()
    
    # Update conversation's last message
    await conv_col.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {
            "last_message": content[:50] + "..." if len(content) > 50 else content,
            "last_message_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Broadcast to conversation room
    await sio.emit("new_message", message, room=conversation_id)
    print(f"Message sent to room {conversation_id}: {content[:30]}...")

@sio.event
async def message_delivered(sid, data):
    """Mark message as delivered"""
    msg_col = get_messages_collection()
    
    message_id = data.get("message_id")
    user_id = data.get("user_id")
    
    if not message_id or not user_id:
        return
    
    # Add user to delivered_to list
    await msg_col.update_one(
        {"_id": ObjectId(message_id)},
        {
            "$addToSet": {"delivered_to": user_id},
            "$set": {"status": MessageStatus.DELIVERED.value}
        }
    )
    
    # Get message to notify sender
    message = await msg_col.find_one({"_id": ObjectId(message_id)})
    if message:
        sender_sid = connected_users.get(message["sender_id"])
        if sender_sid:
            await sio.emit("message_status_update", {
                "message_id": message_id,
                "status": MessageStatus.DELIVERED.value,
                "delivered_to": user_id
            }, to=sender_sid)

@sio.event
async def mark_seen(sid, data):
    """Mark messages as seen"""
    msg_col = get_messages_collection()
    
    conversation_id = data.get("conversation_id")
    message_ids = data.get("message_ids", [])
    user_id = data.get("user_id")
    
    if not conversation_id or not user_id:
        return
    
    # Update all messages in conversation
    if message_ids:
        for msg_id in message_ids:
            await msg_col.update_one(
                {"_id": ObjectId(msg_id)},
                {
                    "$addToSet": {"seen_by": user_id},
                    "$set": {"status": MessageStatus.SEEN.value}
                }
            )
    
    # Notify other participants
    await sio.emit("messages_seen", {
        "conversation_id": conversation_id,
        "message_ids": message_ids,
        "seen_by": user_id
    }, room=conversation_id, skip_sid=sid)

@sio.event
async def typing(sid, data):
    """Broadcast typing indicator"""
    conversation_id = data.get("conversation_id")
    user_id = data.get("user_id")
    user_name = data.get("user_name", "Someone")
    is_typing = data.get("is_typing", True)
    
    if conversation_id:
        await sio.emit("user_typing", {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "user_name": user_name,
            "is_typing": is_typing
        }, room=conversation_id, skip_sid=sid)

@sio.event
async def revoke_message(sid, data):
    """Revoke (recall) a message"""
    msg_col = get_messages_collection()
    
    message_id = data.get("message_id")
    user_id = data.get("user_id")
    
    if not message_id or not user_id:
        await sio.emit("error", {"message": "Missing required fields"}, to=sid)
        return
    
    # Check if user is the sender
    message = await msg_col.find_one({"_id": ObjectId(message_id)})
    if not message:
        await sio.emit("error", {"message": "Message not found"}, to=sid)
        return
    
    if message["sender_id"] != user_id:
        await sio.emit("error", {"message": "You can only revoke your own messages"}, to=sid)
        return
    
    # Update message
    await msg_col.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"is_revoked": True}}
    )
    
    # Broadcast to conversation
    await sio.emit("message_revoked", {
        "message_id": message_id,
        "conversation_id": message["conversation_id"]
    }, room=message["conversation_id"])
    print(f"Message {message_id} revoked")

# Create ASGI app for Socket.IO
socket_app = socketio.ASGIApp(sio)
