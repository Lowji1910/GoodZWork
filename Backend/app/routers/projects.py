from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from ..database import get_projects_collection, get_tasks_collection, get_users_collection
from ..models.project import (
    Project, ProjectCreate, ProjectStatus,
    Task, TaskCreate, TaskStatus, TaskAccept, TaskProgressUpdate
)
from ..models.user import UserRole, UserStatus
from .auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["Projects"])

# ============ PROJECT ENDPOINTS ============

@router.get("/", response_model=List[dict])
async def get_projects(
    status: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all projects (filtered by user access)"""
    if current_user.get("status") != UserStatus.ACTIVE.value:
        raise HTTPException(status_code=403, detail="Tài khoản chưa được kích hoạt")
    
    projects_col = get_projects_collection()
    
    # Admin/HR/Leader can see all, employees only see their projects
    query = {}
    if current_user.get("role") == UserRole.EMPLOYEE.value:
        query["team_members"] = current_user["_id"]
    
    if status:
        query["status"] = status
    
    projects = await projects_col.find(query).sort("created_at", -1).to_list(None)
    
    result = []
    for proj in projects:
        result.append({
            "id": str(proj["_id"]),
            "name": proj["name"],
            "description": proj.get("description"),
            "status": proj.get("status"),
            "start_date": proj.get("start_date"),
            "end_date": proj.get("end_date"),
            "team_members": proj.get("team_members", []),
            "created_by": proj.get("created_by"),
            "created_at": proj.get("created_at")
        })
    
    return result

@router.post("/")
async def create_project(
    data: ProjectCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new project (Leader/Admin only)"""
    if current_user.get("role") not in [UserRole.LEADER.value, UserRole.HR_MANAGER.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Không có quyền tạo dự án")
    
    projects_col = get_projects_collection()
    
    project = {
        "name": data.name,
        "description": data.description,
        "status": ProjectStatus.PLANNING.value,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "team_members": data.team_members,
        "created_by": current_user["_id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await projects_col.insert_one(project)
    
    return {
        "id": str(result.inserted_id),
        "message": "Tạo dự án thành công"
    }

@router.get("/{project_id}", response_model=dict)
async def get_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get project details"""
    projects_col = get_projects_collection()
    tasks_col = get_tasks_collection()
    users_col = get_users_collection()
    
    project = await projects_col.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án")
    
    # Get team member details
    team_members = []
    for member_id in project.get("team_members", []):
        try:
            user = await users_col.find_one({"_id": ObjectId(member_id)})
            if user:
                team_members.append({
                    "id": str(user["_id"]),
                    "full_name": user.get("full_name"),
                    "avatar": user.get("avatar"),
                    "position": user.get("position")
                })
        except:
            pass
    
    # Get task statistics
    tasks = await tasks_col.find({"project_id": project_id}).to_list(None)
    task_stats = {
        "total": len(tasks),
        "completed": len([t for t in tasks if t.get("status") == TaskStatus.COMPLETED.value]),
        "in_progress": len([t for t in tasks if t.get("status") == TaskStatus.IN_PROGRESS.value]),
        "todo": len([t for t in tasks if t.get("status") in [TaskStatus.TODO.value, TaskStatus.ASSIGNED.value]])
    }
    
    return {
        "id": str(project["_id"]),
        "name": project["name"],
        "description": project.get("description"),
        "status": project.get("status"),
        "start_date": project.get("start_date"),
        "end_date": project.get("end_date"),
        "team_members": team_members,
        "task_stats": task_stats,
        "created_by": project.get("created_by"),
        "created_at": project.get("created_at")
    }

@router.put("/{project_id}")
async def update_project(
    project_id: str,
    data: ProjectCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update project (Leader/Admin only)"""
    if current_user.get("role") not in [UserRole.LEADER.value, UserRole.HR_MANAGER.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Không có quyền sửa dự án")
    
    projects_col = get_projects_collection()
    
    await projects_col.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {
            "name": data.name,
            "description": data.description,
            "start_date": data.start_date,
            "end_date": data.end_date,
            "team_members": data.team_members,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Cập nhật dự án thành công"}

@router.put("/{project_id}/status")
async def update_project_status(
    project_id: str,
    status: ProjectStatus,
    current_user: dict = Depends(get_current_user)
):
    """Update project status"""
    if current_user.get("role") not in [UserRole.LEADER.value, UserRole.HR_MANAGER.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Không có quyền cập nhật trạng thái")
    
    projects_col = get_projects_collection()
    
    await projects_col.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"status": status.value, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": f"Đã cập nhật trạng thái: {status.value}"}

# ============ TASK ENDPOINTS ============

@router.get("/{project_id}/tasks", response_model=List[dict])
async def get_project_tasks(
    project_id: str,
    status: str = None,
    assigned_to: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all tasks in a project"""
    tasks_col = get_tasks_collection()
    users_col = get_users_collection()
    
    query = {"project_id": project_id}
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    tasks = await tasks_col.find(query).sort("created_at", -1).to_list(None)
    
    result = []
    for task in tasks:
        assignee = None
        if task.get("assigned_to"):
            try:
                user = await users_col.find_one({"_id": ObjectId(task["assigned_to"])})
                if user:
                    assignee = {
                        "id": str(user["_id"]),
                        "full_name": user.get("full_name"),
                        "avatar": user.get("avatar")
                    }
            except:
                pass
        
        result.append({
            "id": str(task["_id"]),
            "title": task["title"],
            "description": task.get("description"),
            "priority": task.get("priority"),
            "status": task.get("status"),
            "deadline": task.get("deadline"),
            "progress": task.get("progress", 0),
            "assigned_to": assignee,
            "assigned_by": task.get("assigned_by"),
            "rejection_reason": task.get("rejection_reason"),
            "created_at": task.get("created_at")
        })
    
    return result

@router.post("/{project_id}/tasks")
async def create_task(
    project_id: str,
    data: TaskCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new task (Leader assigns to employee)"""
    if current_user.get("role") not in [UserRole.LEADER.value, UserRole.HR_MANAGER.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Không có quyền giao việc")
    
    tasks_col = get_tasks_collection()
    
    task = {
        "project_id": project_id,
        "title": data.title,
        "description": data.description,
        "priority": data.priority.value,
        "deadline": data.deadline,
        "estimated_hours": data.estimated_hours,
        "phase_id": data.phase_id,
        "assigned_to": data.assigned_to,
        "assigned_by": current_user["_id"],
        "status": TaskStatus.ASSIGNED.value if data.assigned_to else TaskStatus.TODO.value,
        "progress": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await tasks_col.insert_one(task)
    
    # TODO: Send notification to assigned user
    
    return {
        "id": str(result.inserted_id),
        "message": "Tạo task thành công"
    }

@router.get("/tasks/my-tasks", response_model=List[dict])
async def get_my_tasks(
    status: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get tasks assigned to current user"""
    tasks_col = get_tasks_collection()
    projects_col = get_projects_collection()
    
    query = {"assigned_to": current_user["_id"]}
    if status:
        query["status"] = status
    
    tasks = await tasks_col.find(query).sort("deadline", 1).to_list(None)
    
    result = []
    for task in tasks:
        project = await projects_col.find_one({"_id": ObjectId(task["project_id"])})
        
        result.append({
            "id": str(task["_id"]),
            "title": task["title"],
            "description": task.get("description"),
            "priority": task.get("priority"),
            "status": task.get("status"),
            "deadline": task.get("deadline"),
            "progress": task.get("progress", 0),
            "project_name": project.get("name") if project else "Unknown",
            "project_id": task["project_id"],
            "created_at": task.get("created_at")
        })
    
    return result

@router.put("/tasks/{task_id}/accept")
async def respond_to_task(
    task_id: str,
    data: TaskAccept,
    current_user: dict = Depends(get_current_user)
):
    """
    Accept or reject assigned task.
    If reject, must provide reason and optional evidence image.
    """
    tasks_col = get_tasks_collection()
    
    task = await tasks_col.find_one({
        "_id": ObjectId(task_id),
        "assigned_to": current_user["_id"],
        "status": TaskStatus.ASSIGNED.value
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Task không tồn tại hoặc không phải của bạn")
    
    if data.accepted:
        # Accept task
        await tasks_col.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": {
                "status": TaskStatus.IN_PROGRESS.value,
                "accepted_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        return {"message": "Đã nhận việc"}
    else:
        # Reject task
        if not data.rejection_reason:
            raise HTTPException(status_code=400, detail="Vui lòng nhập lý do từ chối")
        
        await tasks_col.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": {
                "status": TaskStatus.REJECTED.value,
                "rejection_reason": data.rejection_reason,
                "rejection_evidence": data.rejection_evidence,
                "rejected_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        # TODO: Notify leader
        
        return {"message": "Đã từ chối task"}

@router.put("/tasks/{task_id}/progress")
async def update_task_progress(
    task_id: str,
    data: TaskProgressUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update task progress (0-100%)"""
    tasks_col = get_tasks_collection()
    
    task = await tasks_col.find_one({
        "_id": ObjectId(task_id),
        "assigned_to": current_user["_id"]
    })
    
    if not task:
        raise HTTPException(status_code=404, detail="Task không tồn tại hoặc không phải của bạn")
    
    new_status = TaskStatus.IN_PROGRESS.value
    completed_at = None
    
    if data.progress == 100:
        new_status = TaskStatus.COMPLETED.value
        completed_at = datetime.utcnow()
    
    await tasks_col.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {
            "progress": data.progress,
            "status": new_status,
            "completed_at": completed_at,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {
        "message": f"Cập nhật tiến độ: {data.progress}%",
        "status": new_status
    }

@router.get("/stats/employee-performance")
async def get_employee_performance(
    current_user: dict = Depends(get_current_user)
):
    """Get task completion statistics per employee (Leader/Admin only)"""
    if current_user.get("role") not in [UserRole.LEADER.value, UserRole.HR_MANAGER.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Không có quyền xem thống kê")
    
    tasks_col = get_tasks_collection()
    users_col = get_users_collection()
    
    # Get all employees
    employees = await users_col.find({"role": UserRole.EMPLOYEE.value}).to_list(None)
    
    result = []
    for emp in employees:
        emp_id = str(emp["_id"])
        
        # Get task counts
        total_tasks = await tasks_col.count_documents({"assigned_to": emp_id})
        completed_tasks = await tasks_col.count_documents({
            "assigned_to": emp_id,
            "status": TaskStatus.COMPLETED.value
        })
        in_progress = await tasks_col.count_documents({
            "assigned_to": emp_id,
            "status": TaskStatus.IN_PROGRESS.value
        })
        
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        result.append({
            "user_id": emp_id,
            "full_name": emp.get("full_name", "Unknown"),
            "avatar": emp.get("avatar"),
            "department": emp.get("department"),
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "in_progress_tasks": in_progress,
            "completion_rate": round(completion_rate, 1)
        })
    
    # Sort by completion rate
    result.sort(key=lambda x: x["completion_rate"], reverse=True)
    
    return result
