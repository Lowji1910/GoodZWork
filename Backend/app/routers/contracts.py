from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from datetime import datetime, date, timedelta
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel
from enum import Enum
import os
import uuid

from ..database import get_database
from .auth import get_current_user
from ..models.user import UserRole
from .notifications import create_notification
from ..config import settings

router = APIRouter(prefix="/api/contracts", tags=["contracts"])

class ContractType(str, Enum):
    PROBATION = "PROBATION"
    FIXED_TERM = "FIXED_TERM"
    INDEFINITE = "INDEFINITE"

class ContractStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    TERMINATED = "TERMINATED"

class ContractCreate(BaseModel):
    employee_id: str
    contract_type: ContractType
    start_date: date
    end_date: Optional[date] = None  # None for indefinite
    salary: float
    position: str
    notes: str = ""

def get_contracts_collection():
    db = get_database()
    return db["contracts"]

# ================ ENDPOINTS ================

@router.post("/")
async def create_contract(
    data: ContractCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new contract"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền tạo hợp đồng")
    
    contracts_col = get_contracts_collection()
    db = get_database()
    users_col = db["users"]
    
    # Get employee info
    employee = await users_col.find_one({"_id": ObjectId(data.employee_id)})
    if not employee:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
    
    contract_doc = {
        "employee_id": data.employee_id,
        "employee_name": employee.get("full_name"),
        "employee_email": employee.get("email"),
        "contract_type": data.contract_type.value,
        "start_date": data.start_date.isoformat(),
        "end_date": data.end_date.isoformat() if data.end_date else None,
        "salary": data.salary,
        "position": data.position,
        "notes": data.notes,
        "status": ContractStatus.ACTIVE.value,
        "file_path": None,
        "created_by": current_user["_id"],
        "created_by_name": current_user.get("full_name"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await contracts_col.insert_one(contract_doc)
    
    # Notify employee
    await create_notification(
        ObjectId(data.employee_id),
        "SYSTEM",
        "Hợp đồng mới",
        f"Bạn có hợp đồng mới từ {data.start_date}",
        "/contracts"
    )
    
    return {"message": "Đã tạo hợp đồng", "id": str(result.inserted_id)}

@router.get("/")
async def get_contracts(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    expiring_soon: bool = False,  # Get contracts expiring in 30 days
    current_user: dict = Depends(get_current_user)
):
    """Get contracts list"""
    contracts_col = get_contracts_collection()
    
    query = {}
    
    # Employees see only their own contracts
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        query["employee_id"] = str(current_user["_id"])
    elif employee_id:
        query["employee_id"] = employee_id
    
    if status:
        query["status"] = status
    
    if expiring_soon:
        thirty_days = (date.today() + timedelta(days=30)).isoformat()
        today = date.today().isoformat()
        query["end_date"] = {"$lte": thirty_days, "$gte": today}
        query["status"] = ContractStatus.ACTIVE.value
    
    contracts = await contracts_col.find(query).sort("created_at", -1).to_list(200)
    
    return [{
        "id": str(c["_id"]),
        "employee": {
            "id": c["employee_id"],
            "name": c.get("employee_name"),
            "email": c.get("employee_email")
        },
        "contract_type": c["contract_type"],
        "start_date": c["start_date"],
        "end_date": c.get("end_date"),
        "salary": c["salary"],
        "position": c["position"],
        "status": c["status"],
        "file_path": c.get("file_path"),
        "created_at": c["created_at"]
    } for c in contracts]

@router.get("/my")
async def get_my_contracts(
    current_user: dict = Depends(get_current_user)
):
    """Get current user's contracts"""
    contracts_col = get_contracts_collection()
    
    contracts = await contracts_col.find({
        "employee_id": str(current_user["_id"])
    }).sort("start_date", -1).to_list(50)
    
    return [{
        "id": str(c["_id"]),
        "contract_type": c["contract_type"],
        "start_date": c["start_date"],
        "end_date": c.get("end_date"),
        "salary": c["salary"],
        "position": c["position"],
        "status": c["status"],
        "file_path": c.get("file_path"),
        "created_at": c["created_at"]
    } for c in contracts]

@router.get("/expiring")
async def get_expiring_contracts(
    days: int = Query(30, ge=1, le=90),
    current_user: dict = Depends(get_current_user)
):
    """Get contracts expiring within X days"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền xem")
    
    contracts_col = get_contracts_collection()
    
    future_date = (date.today() + timedelta(days=days)).isoformat()
    today = date.today().isoformat()
    
    contracts = await contracts_col.find({
        "end_date": {"$lte": future_date, "$gte": today},
        "status": ContractStatus.ACTIVE.value
    }).sort("end_date", 1).to_list(100)
    
    return [{
        "id": str(c["_id"]),
        "employee": {
            "id": c["employee_id"],
            "name": c.get("employee_name")
        },
        "contract_type": c["contract_type"],
        "end_date": c.get("end_date"),
        "days_remaining": (date.fromisoformat(c["end_date"]) - date.today()).days if c.get("end_date") else None,
        "position": c["position"]
    } for c in contracts]

@router.put("/{contract_id}")
async def update_contract(
    contract_id: str,
    data: ContractCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update a contract"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền cập nhật")
    
    contracts_col = get_contracts_collection()
    
    contract = await contracts_col.find_one({"_id": ObjectId(contract_id)})
    if not contract:
        raise HTTPException(status_code=404, detail="Không tìm thấy hợp đồng")
    
    await contracts_col.update_one(
        {"_id": ObjectId(contract_id)},
        {"$set": {
            "contract_type": data.contract_type.value,
            "start_date": data.start_date.isoformat(),
            "end_date": data.end_date.isoformat() if data.end_date else None,
            "salary": data.salary,
            "position": data.position,
            "notes": data.notes,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Đã cập nhật hợp đồng"}

@router.put("/{contract_id}/terminate")
async def terminate_contract(
    contract_id: str,
    reason: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    """Terminate a contract"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền")
    
    contracts_col = get_contracts_collection()
    
    await contracts_col.update_one(
        {"_id": ObjectId(contract_id)},
        {"$set": {
            "status": ContractStatus.TERMINATED.value,
            "termination_reason": reason,
            "terminated_by": current_user.get("full_name"),
            "terminated_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    contract = await contracts_col.find_one({"_id": ObjectId(contract_id)})
    
    # Notify employee
    await create_notification(
        ObjectId(contract["employee_id"]),
        "SYSTEM",
        "Hợp đồng kết thúc",
        f"Hợp đồng của bạn đã được chấm dứt. Lý do: {reason}",
        "/contracts"
    )
    
    return {"message": "Đã chấm dứt hợp đồng"}

@router.get("/stats")
async def get_contract_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get contract statistics"""
    if current_user.get("role") not in [UserRole.SUPER_ADMIN.value, UserRole.HR_MANAGER.value]:
        raise HTTPException(status_code=403, detail="Không có quyền xem thống kê")
    
    contracts_col = get_contracts_collection()
    
    contracts = await contracts_col.find({}).to_list(1000)
    
    active = [c for c in contracts if c["status"] == "ACTIVE"]
    expired = [c for c in contracts if c["status"] == "EXPIRED"]
    terminated = [c for c in contracts if c["status"] == "TERMINATED"]
    
    # Count by type
    by_type = {}
    for c in active:
        t = c["contract_type"]
        by_type[t] = by_type.get(t, 0) + 1
    
    # Expiring in 30 days
    thirty_days = (date.today() + timedelta(days=30)).isoformat()
    expiring = [c for c in active if c.get("end_date") and c["end_date"] <= thirty_days]
    
    return {
        "total": len(contracts),
        "active": len(active),
        "expired": len(expired),
        "terminated": len(terminated),
        "expiring_30_days": len(expiring),
        "by_type": by_type
    }
