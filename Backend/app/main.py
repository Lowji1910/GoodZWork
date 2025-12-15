from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .config import settings as settings_config
from .database import connect_to_mongo, close_mongo_connection
from .socket_events import socket_app

# Import routers
from .routers import auth, users, attendance, chat, projects, payroll, settings, leaves, notifications, calendar, overtime, exports, kpi, contracts, documents

# Create FastAPI app
app = FastAPI(
    title="GoodZWork API",
    description="HR Management System with AI Face Recognition",
    version="1.0.0"
)

# CORS middleware - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Startup and shutdown events
@app.on_event("startup")
async def startup():
    await connect_to_mongo()
    # Create directories
    os.makedirs(settings_config.FACE_DATA_PATH, exist_ok=True)
    os.makedirs(settings_config.UPLOADS_PATH, exist_ok=True)
    print("🚀 GoodZWork API đã chạy thành công!")

@app.on_event("shutdown")
async def shutdown():
    await close_mongo_connection()

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(attendance.router)
app.include_router(chat.router)
app.include_router(projects.router)
app.include_router(payroll.router)
app.include_router(settings.router)
app.include_router(leaves.router)
app.include_router(notifications.router)
app.include_router(calendar.router)
app.include_router(overtime.router)
app.include_router(exports.router)
app.include_router(kpi.router)
app.include_router(contracts.router)
app.include_router(documents.router)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=settings_config.UPLOADS_PATH), name="uploads")

# Mount Socket.IO
app.mount("/socket.io", socket_app)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "chào mừng tới GoodZWork API",
        "version": "1.0.0",
        "docs": "/docs",
        "features": [
            "AI Face Recognition (DeepFace + ArcFace)",
            "Geofencing Attendance",
            "Real-time Chat (Socket.IO)",
            "Project & Task Management",
            "Payroll System"
        ]
    }

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# API Info
@app.get("/api/info")
async def api_info():
    return {
        "endpoints": {
            "auth": "/api/auth - Authentication (login, register)",
            "users": "/api/users - User management, face enrollment",
            "attendance": "/api/attendance - GPS + Face check-in/out",
            "chat": "/api/chat - Real-time messaging",
            "projects": "/api/projects - Project & task management",
            "payroll": "/api/payroll - Salary calculation & payment"
        },
        "socket_events": {
            "send_message": "Send a new message",
            "new_message": "Receive new message",
            "typing": "Typing indicator",
            "mark_seen": "Mark messages as read",
            "revoke_message": "Recall a message"
        }
    }
