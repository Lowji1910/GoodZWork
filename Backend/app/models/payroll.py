from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class PayrollStatus(str, Enum):
    DRAFT = "DRAFT"         # Initial calculation
    APPROVED = "APPROVED"   # HR approved
    PAID = "PAID"          # Accountant paid

class PayrollDeduction(BaseModel):
    type: str  # "late", "early_leave", "absent", "tax", etc.
    description: str
    amount: float

class PayrollBonus(BaseModel):
    type: str  # "performance", "project", "holiday", etc.
    description: str
    amount: float

class Payroll(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    user_name: str
    department: Optional[str] = None
    month: int  # 1-12
    year: int
    
    # Working days
    total_working_days: int = 0
    actual_working_days: int = 0
    late_days: int = 0
    early_leave_days: int = 0
    absent_days: int = 0
    
    # Salary calculation
    base_salary: float = 0
    deductions: List[PayrollDeduction] = []
    bonuses: List[PayrollBonus] = []
    total_deductions: float = 0
    total_bonuses: float = 0
    net_salary: float = 0
    
    # Status
    status: PayrollStatus = PayrollStatus.DRAFT
    
    # Workflow
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    paid_by: Optional[str] = None
    paid_at: Optional[datetime] = None
    
    # Payment
    payment_method: Optional[str] = None
    bank_account: Optional[str] = None
    qr_code: Optional[str] = None  # QR code image path
    
    class Config:
        populate_by_name = True

class PayrollCalculateRequest(BaseModel):
    user_id: str
    month: int
    year: int
    base_salary: float
    bonuses: List[PayrollBonus] = []

class PayrollApprove(BaseModel):
    payroll_ids: List[str]

class PayrollPay(BaseModel):
    payroll_id: str
    payment_method: str
    notes: Optional[str] = None

class PayrollSummary(BaseModel):
    month: int
    year: int
    total_employees: int
    total_gross_salary: float
    total_deductions: float
    total_bonuses: float
    total_net_salary: float
    draft_count: int
    approved_count: int
    paid_count: int
