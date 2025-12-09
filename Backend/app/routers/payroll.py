from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from ..database import get_payrolls_collection, get_users_collection
from ..models.payroll import (
    Payroll, PayrollCalculateRequest, PayrollApprove, PayrollPay,
    PayrollStatus, PayrollSummary, PayrollBonus
)
from ..models.user import UserRole, UserStatus
from ..services.payroll_service import payroll_service
from .auth import get_current_user

router = APIRouter(prefix="/api/payroll", tags=["Payroll"])

@router.post("/calculate")
async def calculate_payroll(
    data: PayrollCalculateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Calculate payroll for an employee (HR/Admin only)"""
    if current_user.get("role") not in [UserRole.HR_MANAGER.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Không có quyền tính lương")
    
    payrolls_col = get_payrolls_collection()
    
    # Check if payroll already exists for this month
    existing = await payrolls_col.find_one({
        "user_id": data.user_id,
        "month": data.month,
        "year": data.year
    })
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Bảng lương tháng {data.month}/{data.year} đã tồn tại"
        )
    
    # Calculate payroll
    bonuses = [PayrollBonus(**b) if isinstance(b, dict) else b for b in data.bonuses]
    payroll = await payroll_service.calculate_payroll(
        user_id=data.user_id,
        month=data.month,
        year=data.year,
        base_salary=data.base_salary,
        bonuses=[b.dict() for b in bonuses]
    )
    
    # Save to database
    payroll_dict = payroll.dict()
    result = await payrolls_col.insert_one(payroll_dict)
    
    return {
        "id": str(result.inserted_id),
        "message": "Tính lương thành công",
        "net_salary": payroll.net_salary,
        "deductions": payroll.total_deductions,
        "bonuses": payroll.total_bonuses
    }

@router.get("/list", response_model=List[dict])
async def get_payrolls(
    month: int = None,
    year: int = None,
    status: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get payroll list (HR/Accountant/Admin)"""
    if current_user.get("role") not in [
        UserRole.HR_MANAGER.value, 
        UserRole.ACCOUNTANT.value, 
        UserRole.SUPER_ADMIN.value
    ]:
        raise HTTPException(status_code=403, detail="Không có quyền xem bảng lương")
    
    payrolls_col = get_payrolls_collection()
    
    query = {}
    if month:
        query["month"] = month
    if year:
        query["year"] = year
    if status:
        query["status"] = status
    
    payrolls = await payrolls_col.find(query).sort([("year", -1), ("month", -1)]).to_list(None)
    
    result = []
    for p in payrolls:
        result.append({
            "id": str(p["_id"]),
            "user_id": p["user_id"],
            "user_name": p["user_name"],
            "department": p.get("department"),
            "month": p["month"],
            "year": p["year"],
            "base_salary": p["base_salary"],
            "total_deductions": p["total_deductions"],
            "total_bonuses": p["total_bonuses"],
            "net_salary": p["net_salary"],
            "status": p["status"],
            "working_days": f"{p['actual_working_days']}/{p['total_working_days']}",
            "late_days": p.get("late_days", 0),
            "created_at": p.get("created_at")
        })
    
    return result

@router.get("/my-payroll", response_model=List[dict])
async def get_my_payroll(
    current_user: dict = Depends(get_current_user)
):
    """Get current user's payroll history"""
    if current_user.get("status") != UserStatus.ACTIVE.value:
        raise HTTPException(status_code=403, detail="Tài khoản chưa được kích hoạt")
    
    payrolls_col = get_payrolls_collection()
    
    payrolls = await payrolls_col.find({
        "user_id": current_user["_id"]
    }).sort([("year", -1), ("month", -1)]).to_list(12)  # Last 12 months
    
    result = []
    for p in payrolls:
        result.append({
            "id": str(p["_id"]),
            "month": p["month"],
            "year": p["year"],
            "base_salary": p["base_salary"],
            "total_deductions": p["total_deductions"],
            "total_bonuses": p["total_bonuses"],
            "net_salary": p["net_salary"],
            "status": p["status"],
            "working_days": f"{p['actual_working_days']}/{p['total_working_days']}",
            "deductions": p.get("deductions", []),
            "bonuses": p.get("bonuses", []),
            "paid_at": p.get("paid_at")
        })
    
    return result

@router.get("/{payroll_id}", response_model=dict)
async def get_payroll_detail(
    payroll_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get payroll detail"""
    payrolls_col = get_payrolls_collection()
    
    payroll = await payrolls_col.find_one({"_id": ObjectId(payroll_id)})
    
    if not payroll:
        raise HTTPException(status_code=404, detail="Không tìm thấy bảng lương")
    
    # Check access: own payroll or HR/Accountant/Admin
    if payroll["user_id"] != current_user["_id"]:
        if current_user.get("role") not in [
            UserRole.HR_MANAGER.value,
            UserRole.ACCOUNTANT.value,
            UserRole.SUPER_ADMIN.value
        ]:
            raise HTTPException(status_code=403, detail="Không có quyền xem")
    
    return {
        "id": str(payroll["_id"]),
        "user_id": payroll["user_id"],
        "user_name": payroll["user_name"],
        "department": payroll.get("department"),
        "month": payroll["month"],
        "year": payroll["year"],
        "total_working_days": payroll["total_working_days"],
        "actual_working_days": payroll["actual_working_days"],
        "late_days": payroll.get("late_days", 0),
        "early_leave_days": payroll.get("early_leave_days", 0),
        "absent_days": payroll.get("absent_days", 0),
        "base_salary": payroll["base_salary"],
        "deductions": payroll.get("deductions", []),
        "bonuses": payroll.get("bonuses", []),
        "total_deductions": payroll["total_deductions"],
        "total_bonuses": payroll["total_bonuses"],
        "net_salary": payroll["net_salary"],
        "status": payroll["status"],
        "approved_by": payroll.get("approved_by"),
        "approved_at": payroll.get("approved_at"),
        "paid_by": payroll.get("paid_by"),
        "paid_at": payroll.get("paid_at"),
        "qr_code": payroll.get("qr_code")
    }

@router.put("/approve")
async def approve_payrolls(
    data: PayrollApprove,
    current_user: dict = Depends(get_current_user)
):
    """Approve payrolls (HR only) - Draft -> Approved"""
    if current_user.get("role") not in [UserRole.HR_MANAGER.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Không có quyền duyệt lương")
    
    payrolls_col = get_payrolls_collection()
    
    result = await payrolls_col.update_many(
        {
            "_id": {"$in": [ObjectId(id) for id in data.payroll_ids]},
            "status": PayrollStatus.DRAFT.value
        },
        {"$set": {
            "status": PayrollStatus.APPROVED.value,
            "approved_by": current_user["_id"],
            "approved_at": datetime.utcnow()
        }}
    )
    
    return {
        "message": f"Đã duyệt {result.modified_count} bảng lương",
        "approved_count": result.modified_count
    }

@router.put("/{payroll_id}/pay")
async def pay_payroll(
    payroll_id: str,
    data: PayrollPay,
    current_user: dict = Depends(get_current_user)
):
    """Mark payroll as paid (Accountant only) - Approved -> Paid"""
    if current_user.get("role") not in [UserRole.ACCOUNTANT.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Chỉ Kế toán mới có thể thanh toán")
    
    payrolls_col = get_payrolls_collection()
    
    payroll = await payrolls_col.find_one({
        "_id": ObjectId(payroll_id),
        "status": PayrollStatus.APPROVED.value
    })
    
    if not payroll:
        raise HTTPException(
            status_code=400, 
            detail="Bảng lương không tồn tại hoặc chưa được duyệt"
        )
    
    await payrolls_col.update_one(
        {"_id": ObjectId(payroll_id)},
        {"$set": {
            "status": PayrollStatus.PAID.value,
            "paid_by": current_user["_id"],
            "paid_at": datetime.utcnow(),
            "payment_method": data.payment_method
        }}
    )
    
    return {
        "message": "Đã thanh toán thành công",
        "payroll_id": payroll_id
    }

@router.get("/{payroll_id}/qr")
async def get_payment_qr(
    payroll_id: str,
    bank_account: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate QR code for payment (Accountant only)"""
    if current_user.get("role") not in [UserRole.ACCOUNTANT.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Chỉ Kế toán mới có thể tạo QR")
    
    payrolls_col = get_payrolls_collection()
    
    payroll = await payrolls_col.find_one({"_id": ObjectId(payroll_id)})
    if not payroll:
        raise HTTPException(status_code=404, detail="Không tìm thấy bảng lương")
    
    payroll_obj = Payroll(**payroll)
    qr_content = payroll_service.generate_payment_qr(payroll_obj, bank_account)
    
    # Save QR to database
    await payrolls_col.update_one(
        {"_id": ObjectId(payroll_id)},
        {"$set": {"qr_code": qr_content, "bank_account": bank_account}}
    )
    
    return {
        "qr_content": qr_content,
        "amount": payroll["net_salary"],
        "recipient": payroll["user_name"]
    }

@router.get("/summary/{month}/{year}", response_model=PayrollSummary)
async def get_payroll_summary(
    month: int,
    year: int,
    current_user: dict = Depends(get_current_user)
):
    """Get payroll summary for a month"""
    if current_user.get("role") not in [
        UserRole.HR_MANAGER.value,
        UserRole.ACCOUNTANT.value,
        UserRole.SUPER_ADMIN.value
    ]:
        raise HTTPException(status_code=403, detail="Không có quyền xem tổng hợp")
    
    payrolls_col = get_payrolls_collection()
    
    payrolls = await payrolls_col.find({
        "month": month,
        "year": year
    }).to_list(None)
    
    total_gross = sum(p["base_salary"] for p in payrolls)
    total_deductions = sum(p["total_deductions"] for p in payrolls)
    total_bonuses = sum(p["total_bonuses"] for p in payrolls)
    total_net = sum(p["net_salary"] for p in payrolls)
    
    draft_count = len([p for p in payrolls if p["status"] == PayrollStatus.DRAFT.value])
    approved_count = len([p for p in payrolls if p["status"] == PayrollStatus.APPROVED.value])
    paid_count = len([p for p in payrolls if p["status"] == PayrollStatus.PAID.value])
    
    return PayrollSummary(
        month=month,
        year=year,
        total_employees=len(payrolls),
        total_gross_salary=total_gross,
        total_deductions=total_deductions,
        total_bonuses=total_bonuses,
        total_net_salary=total_net,
        draft_count=draft_count,
        approved_count=approved_count,
        paid_count=paid_count
    )
