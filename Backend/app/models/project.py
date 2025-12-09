from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ProjectStatus(str, Enum):
    PLANNING = "PLANNING"
    IN_PROGRESS = "IN_PROGRESS"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class TaskStatus(str, Enum):
    TODO = "TODO"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"

class TaskPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"

# Project Models
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.PLANNING
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class Project(ProjectBase):
    id: Optional[str] = Field(default=None, alias="_id")
    created_by: str
    team_members: List[str] = []  # List of user IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    team_members: List[str] = []

# Phase Models (Giai đoạn)
class PhaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    order: int = 0
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class Phase(PhaseBase):
    id: Optional[str] = Field(default=None, alias="_id")
    project_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True

# Task Models
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    deadline: Optional[datetime] = None
    estimated_hours: Optional[float] = None

class Task(TaskBase):
    id: Optional[str] = Field(default=None, alias="_id")
    project_id: str
    phase_id: Optional[str] = None
    assigned_to: Optional[str] = None  # User ID
    assigned_by: str  # Leader user ID
    status: TaskStatus = TaskStatus.TODO
    rejection_reason: Optional[str] = None
    rejection_evidence: Optional[str] = None  # Image path
    progress: int = 0  # 0-100%
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    deadline: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    phase_id: Optional[str] = None
    assigned_to: Optional[str] = None

class TaskAccept(BaseModel):
    accepted: bool
    rejection_reason: Optional[str] = None
    rejection_evidence: Optional[str] = None  # Base64 image

class TaskProgressUpdate(BaseModel):
    progress: int = Field(ge=0, le=100)
    notes: Optional[str] = None
