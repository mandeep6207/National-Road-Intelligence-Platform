"""
Super Admin Routes — RoadGuardian AI
All /admin/* endpoints with JWT authentication
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.database import (
    get_collection, city_admins_col, potholes_col,
    complaints_col, repairs_col, detection_logs_col,
    system_logs_col
)
from app.core.config import settings
from app.services.admin_service import (
    get_dashboard_stats, log_system_event, run_autonomous_pipeline
)

router = APIRouter()
security = HTTPBearer(auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SUPER_ADMIN_COLLECTION = "super_admins"

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    email: str
    password: str

class CityAdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    city: str
    department: str

# ─── Auth Helpers ─────────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    return pwd_context.hash(password)

def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False

def _create_token(payload: dict) -> str:
    data = payload.copy()
    data["exp"] = datetime.utcnow() + timedelta(hours=24)
    return jwt.encode(data, settings.JWT_SECRET_KEY, algorithm="HS256")

async def _get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="No token provided")
    try:
        payload = jwt.decode(credentials.credentials, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        if payload.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Super admin access required")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def _ensure_default_super_admin():
    """Create default super admin if none exists."""
    col = get_collection(SUPER_ADMIN_COLLECTION)
    existing = await col.find_one({"email": "superadmin@roadguardian.gov.in"})
    if not existing:
        await col.insert_one({
            "name": "Super Administrator",
            "email": "superadmin@roadguardian.gov.in",
            "password_hash": _hash_password("SuperAdmin@2024"),
            "role": "super_admin",
            "created_at": datetime.utcnow()
        })
        await log_system_event("SYSTEM_INIT", "Default super admin account created")

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/login", summary="Super Admin Login")
async def admin_login(body: AdminLoginRequest):
    """
    Authenticate Super Admin and return JWT token.
    Default credentials: superadmin@roadguardian.gov.in / SuperAdmin@2024
    """
    await _ensure_default_super_admin()
    col = get_collection(SUPER_ADMIN_COLLECTION)
    admin = await col.find_one({"email": body.email})

    # Demo-safe fallback: always allow the documented default super-admin credentials.
    if body.email == "superadmin@roadguardian.gov.in" and body.password == "SuperAdmin@2024":
        if not admin:
            admin = {
                "_id": str(uuid.uuid4()),
                "email": "superadmin@roadguardian.gov.in",
                "name": "Super Administrator",
            }
        token = _create_token({
            "sub": str(admin["_id"]),
            "email": admin["email"],
            "role": "super_admin",
            "name": admin.get("name", "Super Administrator")
        })
        await log_system_event("LOGIN", f"Super admin {admin['email']} logged in")
        return {
            "access_token": token,
            "token_type": "bearer",
            "role": "super_admin",
            "name": admin.get("name", "Super Administrator"),
            "email": admin["email"]
        }

    if not admin or not _verify_password(body.password, admin.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = _create_token({
        "sub": str(admin["_id"]),
        "email": admin["email"],
        "role": "super_admin",
        "name": admin["name"]
    })
    await log_system_event("LOGIN", f"Super admin {admin['email']} logged in")
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": "super_admin",
        "name": admin["name"],
        "email": admin["email"]
    }


@router.get("/dashboard", summary="Dashboard Overview")
async def admin_dashboard(admin=Depends(_get_current_admin)):
    """Return full system statistics for the Super Admin dashboard."""
    stats = await get_dashboard_stats()
    # Also expose flat keys for simple integrations
    flat = {
        "total_potholes":    stats["potholes"]["total"],
        "pending_repairs":   stats["repairs"]["pending"],
        "completed_repairs": stats["repairs"]["completed"],
        "total_complaints":  stats["complaints"]["total"],
    }
    return {"success": True, "data": stats, **flat}


@router.get("/potholes", summary="View All Potholes")
async def admin_potholes(
    city: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=500),
    skip: int = Query(0),
    admin=Depends(_get_current_admin)
):
    """List all potholes with optional filters."""
    query = {}
    if city:
        query["city"] = city
    if severity:
        query["severity"] = severity
    if status:
        query["status"] = status

    col = potholes_col()
    total = await col.count_documents(query)
    cursor = col.find(query).sort("detected_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    for d in docs:
        d["_id"] = str(d["_id"])
    return {"success": True, "total": total, "data": docs}


@router.get("/complaints", summary="View Complaint Status")
async def admin_complaints(
    city: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=500),
    skip: int = Query(0),
    admin=Depends(_get_current_admin)
):
    """List all auto-generated complaints."""
    query = {}
    if city:
        query["city"] = city
    if status:
        query["status"] = status

    col = complaints_col()
    total = await col.count_documents(query)
    cursor = col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    for d in docs:
        d["_id"] = str(d["_id"])
    return {"success": True, "total": total, "data": docs}


@router.get("/repairs", summary="View Repair Workflow")
async def admin_repairs(
    repair_status: Optional[str] = Query(None),
    limit: int = Query(50, le=500),
    skip: int = Query(0),
    admin=Depends(_get_current_admin)
):
    """List all repair records with pipeline status."""
    query = {}
    if repair_status:
        query["repair_status"] = repair_status

    col = repairs_col()
    total = await col.count_documents(query)
    cursor = col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    for d in docs:
        d["_id"] = str(d["_id"])
    return {"success": True, "total": total, "data": docs}


@router.get("/detection-logs", summary="View AI Detection Logs")
async def admin_detection_logs(
    limit: int = Query(50, le=200),
    skip: int = Query(0),
    admin=Depends(_get_current_admin)
):
    """View AI model detection run logs."""
    col = detection_logs_col()
    total = await col.count_documents({})
    cursor = col.find({}).sort("timestamp", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    for d in docs:
        d["_id"] = str(d["_id"])
    return {"success": True, "total": total, "data": docs}


@router.post("/city-admin", summary="Add City Admin")
async def add_city_admin(body: CityAdminCreate, admin=Depends(_get_current_admin)):
    """Create a new city admin account."""
    col = city_admins_col()
    existing = await col.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = {
        "name": body.name,
        "email": body.email,
        "password_hash": _hash_password(body.password),
        "city": body.city,
        "department": body.department,
        "status": "active",
        "created_at": datetime.utcnow()
    }
    result = await col.insert_one(doc)
    await log_system_event("CITY_ADMIN_ADDED", f"City admin {body.name} added for {body.city}")
    return {"success": True, "id": str(result.inserted_id), "message": f"City admin {body.name} created"}


@router.delete("/city-admin/{admin_id}", summary="Remove City Admin")
async def remove_city_admin(admin_id: str, admin=Depends(_get_current_admin)):
    """Deactivate a city admin account."""
    from bson import ObjectId
    col = city_admins_col()
    try:
        oid = ObjectId(admin_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid admin ID")

    existing = await col.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="City admin not found")

    await col.update_one({"_id": oid}, {"$set": {"status": "inactive", "deactivated_at": datetime.utcnow()}})
    await log_system_event("CITY_ADMIN_REMOVED", f"City admin {existing.get('name')} deactivated")
    return {"success": True, "message": f"City admin {existing.get('name')} deactivated"}


@router.get("/city-admins", summary="List City Admins")
async def list_city_admins(
    status: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    admin=Depends(_get_current_admin)
):
    """List all city admins with optional filters."""
    query = {}
    if status:
        query["status"] = status
    if city:
        query["city"] = city

    col = city_admins_col()
    docs = await col.find(query).sort("created_at", -1).to_list(200)
    for d in docs:
        d["_id"] = str(d["_id"])
        d.pop("password_hash", None)
    return {"success": True, "total": len(docs), "data": docs}


@router.get("/system-logs", summary="View System Logs")
async def admin_system_logs(
    log_type: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    skip: int = Query(0),
    admin=Depends(_get_current_admin)
):
    """Retrieve system event logs."""
    query = {}
    if log_type:
        query["log_type"] = log_type

    col = system_logs_col()
    total = await col.count_documents(query)
    cursor = col.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    for d in docs:
        d["_id"] = str(d["_id"])
    return {"success": True, "total": total, "data": docs}


@router.post("/seed", summary="Seed Demo Data")
async def seed_demo_data():
    """Seed demo city admins and simulate AI detection pipeline."""
    await _ensure_default_super_admin()

    # Seed city admins
    demo_admins = [
        {"name": "Rajesh Kumar", "city": "Delhi", "department": "PWD Delhi"},
        {"name": "Priya Sharma", "city": "Mumbai", "department": "MMRDA"},
        {"name": "Arun Singh", "city": "Bangalore", "department": "BBMP"},
        {"name": "Meena Patel", "city": "Hyderabad", "department": "GHMC"},
        {"name": "Vijay Nair", "city": "Chennai", "department": "GCC"},
    ]
    ca_col = city_admins_col()
    for a in demo_admins:
        exists = await ca_col.find_one({"email": f"{a['name'].split()[0].lower()}@{a['city'].lower()}.gov.in"})
        if not exists:
            await ca_col.insert_one({
                **a,
                "email": f"{a['name'].split()[0].lower()}@{a['city'].lower()}.gov.in",
                "password_hash": _hash_password("CityAdmin@2024"),
                "status": "active",
                "created_at": datetime.utcnow()
            })

    # Simulate AI detections
    import random
    cities = ["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai"]
    severities = ["high", "medium", "low"]
    sources = ["satellite", "drone", "camera", "dashcam"]
    roads = ["NH-48", "Ring Road", "Outer Ring Road", "JNTU Road", "Anna Salai"]

    seeded = 0
    p_col = potholes_col()
    for _ in range(10):
        lat = round(random.uniform(12.9, 28.6), 6)
        lng = round(random.uniform(77.2, 80.2), 6)
        city = random.choice(cities)
        severity = random.choice(severities)
        source = random.choice(sources)

        doc = {
            "detection_id": f"DET-{uuid.uuid4().hex[:8].upper()}",
            "latitude": lat,
            "longitude": lng,
            "location": {"lat": lat, "lng": lng},
            "road_name": random.choice(roads),
            "city": city,
            "severity": severity,
            "confidence_score": round(random.uniform(0.75, 0.99), 3),
            "detection_source": source,
            "detected_at": datetime.utcnow(),
            "status": "pending",
            "image_url": f"https://picsum.photos/seed/{uuid.uuid4().hex[:6]}/400/300",
            "is_active": True
        }
        existing = await p_col.find_one({"detection_id": doc["detection_id"]})
        if not existing:
            result = await p_col.insert_one(doc)
            doc["_id"] = result.inserted_id
            await run_autonomous_pipeline(doc)
            seeded += 1

    # Seed detection logs
    dl_col = detection_logs_col()
    for i in range(5):
        await dl_col.insert_one({
            "model_name": random.choice(["YOLOv8-road", "YOLOv8-nano", "ResNet-pothole"]),
            "detection_count": random.randint(1, 15),
            "processing_time": random.randint(200, 3000),
            "timestamp": datetime.utcnow() - timedelta(hours=i * 3)
        })

    await log_system_event("SEED", f"Demo data seeded: {seeded} potholes + {len(demo_admins)} city admins")
    return {
        "success": True,
        "message": f"Seeded {seeded} demo potholes, {len(demo_admins)} city admins",
        "super_admin": {"email": "superadmin@roadguardian.gov.in", "password": "SuperAdmin@2024"}
    }
