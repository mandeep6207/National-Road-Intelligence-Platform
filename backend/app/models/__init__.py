"""
Pydantic document models for MongoDB collections
"""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, EmailStr
import uuid


def new_id() -> str:
    return str(uuid.uuid4())


class UserDoc(BaseModel):
    email: str
    phone: Optional[str] = None
    full_name: str
    hashed_password: str
    role: str = "citizen"  # super_admin, government, contractor, citizen, auditor
    is_active: bool = True
    is_verified: bool = False
    avatar_url: Optional[str] = None
    aadhaar_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None


class RoadDoc(BaseModel):
    road_code: str
    road_name: str
    road_type: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None
    length_km: Optional[float] = None
    width_meters: Optional[float] = None
    surface_type: Optional[str] = None
    condition: str = "fair"
    health_score: float = 70.0
    last_inspected: Optional[datetime] = None
    last_repaired: Optional[datetime] = None
    construction_year: Optional[int] = None
    responsible_authority: Optional[str] = None
    budget_allocated: float = 0
    road_metadata: dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PotholeDoc(BaseModel):
    detection_id: str = Field(default_factory=lambda: f"DET-{uuid.uuid4().hex[:10].upper()}")
    road_id: Optional[str] = None
    latitude: float
    longitude: float
    severity: str = "moderate"  # critical, high, moderate, low, safe
    confidence_score: Optional[float] = None
    width_cm: Optional[float] = None
    depth_cm: Optional[float] = None
    area_sqcm: Optional[float] = None
    sensor_source: str = "dashcam"  # satellite, dashcam, cctv, drone, manual
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    bounding_box: Optional[List[float]] = None
    is_active: bool = True
    is_repaired: bool = False
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ComplaintDoc(BaseModel):
    complaint_number: str = Field(default_factory=lambda: f"CMP-{uuid.uuid4().hex[:8].upper()}")
    pothole_id: Optional[str] = None
    reported_by: Optional[str] = None
    title: str
    description: str
    priority: str = "medium"  # critical, high, medium, low
    status: str = "pending"  # pending, assigned, in_progress, resolved, closed
    verified_by_citizen: bool = False
    repair_completed_at: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    state: Optional[str] = None
    district: Optional[str] = None
    assigned_to: Optional[str] = None
    auto_generated: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ContractorDoc(BaseModel):
    user_id: Optional[str] = None
    contractor_code: str = Field(default_factory=lambda: f"CTR-{uuid.uuid4().hex[:8].upper()}")
    company_name: str
    license_number: str
    state: Optional[str] = None
    specialization: List[str] = []
    rating: float = 3.0
    total_jobs_completed: int = 0
    on_time_delivery_pct: float = 0.0
    quality_score: float = 50.0
    is_blacklisted: bool = False
    blacklist_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RepairDoc(BaseModel):
    repair_number: str = Field(default_factory=lambda: f"REP-{uuid.uuid4().hex[:8].upper()}")
    pothole_id: Optional[str] = None
    complaint_id: Optional[str] = None
    contractor_id: Optional[str] = None
    status: str = "pending"  # pending, assigned, in_progress, completed, verified, rejected
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    ai_verified: bool = False
    ai_verification_score: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BlockchainRecordDoc(BaseModel):
    transaction_hash: str
    event_type: str  # detection, complaint, repair, verification
    entity_id: str
    entity_type: str
    data_hash: str
    block_number: Optional[int] = None
    network: str = "simulation"
    is_confirmed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DetectionJobDoc(BaseModel):
    job_id: str
    source_type: str
    source_url: Optional[str] = None
    status: str = "queued"  # queued, processing, completed, failed
    submitted_by: Optional[str] = None
    potholes_detected: int = 0
    processing_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PredictionDoc(BaseModel):
    road_id: str
    predicted_potholes: int = 0
    probability_score: float = 0.0
    confidence: float = 0.0
    risk_level: str = "low"
    recommendation: str = ""
    predicted_for_date: Optional[datetime] = None
    weather_factor: Optional[float] = None
    traffic_factor: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Keep User as alias for compatibility
User = UserDoc
