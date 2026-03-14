"""
Pydantic schemas for API request/response validation
"""
from datetime import datetime
from typing import List, Optional, Any, Dict
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, validator


# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    full_name: str

class UserCreate(BaseModel):
    email: EmailStr
    phone: Optional[str] = None
    full_name: str
    password: str = Field(..., min_length=8)
    role: str = "citizen"
    aadhaar_hash: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Pothole Schemas ──────────────────────────────────────────────────────────

class PotholeBase(BaseModel):
    latitude: float
    longitude: float
    severity: str = "moderate"
    sensor_source: str = "dashcam"

class PotholeCreate(PotholeBase):
    road_id: Optional[UUID] = None
    confidence_score: Optional[float] = None
    width_cm: Optional[float] = None
    depth_cm: Optional[float] = None
    area_sqcm: Optional[float] = None
    image_url: Optional[str] = None
    bounding_box: Optional[Dict] = None

class PotholeResponse(BaseModel):
    id: UUID
    detection_id: str
    latitude: float
    longitude: float
    severity: str
    confidence_score: Optional[float]
    is_active: bool
    is_repaired: bool
    sensor_source: str
    image_url: Optional[str]
    detected_at: datetime
    road_name: Optional[str] = None
    risk_score: Optional[float] = None

    class Config:
        from_attributes = True


# ─── Complaint Schemas ────────────────────────────────────────────────────────

class ComplaintCreate(BaseModel):
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    severity: str = "moderate"
    pothole_id: Optional[UUID] = None
    road_id: Optional[UUID] = None
    image_urls: Optional[List[str]] = []

class ComplaintResponse(BaseModel):
    id: UUID
    complaint_number: str
    title: str
    status: str
    severity: str
    latitude: float
    longitude: float
    priority_score: float
    is_auto_generated: bool
    citizen_votes: int
    upvotes: int
    downvotes: int
    created_at: datetime
    due_date: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Repair Schemas ───────────────────────────────────────────────────────────

class RepairCreate(BaseModel):
    complaint_id: UUID
    pothole_id: Optional[UUID] = None
    contractor_id: UUID
    scheduled_start: datetime
    scheduled_end: datetime
    material_used: Optional[str] = None
    repair_method: Optional[str] = None
    estimated_cost: Optional[float] = None

class RepairUpdate(BaseModel):
    status: Optional[str] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    material_used: Optional[str] = None
    actual_cost: Optional[float] = None
    supervisor_notes: Optional[str] = None
    after_images: Optional[List[str]] = None

class RepairResponse(BaseModel):
    id: UUID
    repair_number: str
    status: str
    scheduled_start: Optional[datetime]
    actual_end: Optional[datetime]
    ai_verified: bool
    ai_verification_score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Detection Schemas ────────────────────────────────────────────────────────

class DetectionResult(BaseModel):
    pothole_id: str
    confidence: float
    severity: str
    bbox: Dict[str, float]
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    width_cm: Optional[float] = None
    depth_cm: Optional[float] = None
    area_sqcm: Optional[float] = None
    image_url: Optional[str] = None

class DetectionResponse(BaseModel):
    job_id: str
    status: str
    total_detections: int
    detections: List[DetectionResult]
    processing_time_ms: Optional[int]


# ─── Dashboard Schemas ────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    active_potholes: int
    critical_potholes: int
    pending_complaints: int
    active_repairs: int
    verified_repairs: int
    blockchain_entries: int
    total_spent: float
    active_contractors: int


# ─── Contractor Schemas ───────────────────────────────────────────────────────

class ContractorCreate(BaseModel):
    user_id: UUID
    company_name: str
    license_number: str
    gstin: Optional[str] = None
    state: str
    specialization: Optional[List[str]] = []
    contact_person: str
    contact_phone: str
    contact_email: EmailStr

class ContractorResponse(BaseModel):
    id: UUID
    contractor_code: str
    company_name: str
    state: str
    rating: float
    total_jobs_completed: int
    quality_score: float
    is_blacklisted: bool
    on_time_delivery_pct: float

    class Config:
        from_attributes = True


# ─── Blockchain Schemas ───────────────────────────────────────────────────────

class BlockchainRecordResponse(BaseModel):
    id: UUID
    transaction_hash: str
    event_type: str
    entity_type: str
    entity_id: UUID
    is_confirmed: bool
    network: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Prediction Schemas ───────────────────────────────────────────────────────

class PredictionResponse(BaseModel):
    road_id: str
    failure_probability: float
    predicted_severity: str
    confidence: float
    recommended_action: str
    maintenance_window_start: Optional[datetime]
    estimated_maintenance_cost: Optional[float]

    class Config:
        from_attributes = True


# ─── Monitoring Automation Schemas ───────────────────────────────────────────

class ContractorSuggestion(BaseModel):
    contractor_id: str
    company_name: str
    district_match: bool
    availability_score: float
    performance_score: float
    recommendation_score: float


class HighRiskAlert(BaseModel):
    alert_id: str
    title: str
    message: str
    district: str
    road_name: str
    severity: str
    recipients: List[str]
    created_at: datetime


class MonitoringCaptureResponse(BaseModel):
    issue_id: str
    complaint_id: str
    source_type: str
    severity: str
    confidence: float
    latitude: float
    longitude: float
    road_name: str
    district: str
    state: str
    assigned_authority: str
    priority: str
    status: str
    image_url: Optional[str] = None
    high_risk_alert: Optional[HighRiskAlert] = None
    contractor_suggestions: List[ContractorSuggestion]
    lifecycle: List[Dict[str, Any]]
