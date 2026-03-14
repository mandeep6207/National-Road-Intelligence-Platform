"""
Authentication endpoints — login, register (MongoDB version)
"""
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId

from app.core.database import users_col
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, get_current_user
)
from app.schemas import UserCreate, UserLogin, TokenResponse

router = APIRouter()

DEMO_USERS = [
    {"email": "admin@nrip.gov.in",     "full_name": "Super Administrator",   "role": "super_admin"},
    {"email": "govt@nrip.gov.in",       "full_name": "Government Authority",   "role": "government"},
    {"email": "contractor@nrip.gov.in", "full_name": "Road Contractor",        "role": "contractor"},
    {"email": "citizen@nrip.gov.in",    "full_name": "Citizen User",           "role": "citizen"},
    {"email": "auditor@nrip.gov.in",    "full_name": "Infrastructure Auditor", "role": "auditor"},
]


async def _ensure_demo_users():
    """Auto-create demo users if they don't exist."""
    col = users_col()
    hashed = hash_password("Admin@1234")
    for u in DEMO_USERS:
        existing = await col.find_one({"email": u["email"]})
        if not existing:
            await col.insert_one({
                "email": u["email"],
                "full_name": u["full_name"],
                "role": u["role"],
                "hashed_password": hashed,
                "phone": None,
                "is_active": True,
                "is_verified": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "last_login": None
            })


@router.post("/seed-demo")
async def seed_demo_users():
    """Create demo users (run once on fresh setup)."""
    await _ensure_demo_users()
    return {
        "message": "Demo users ready",
        "users": [u["email"] for u in DEMO_USERS],
        "password": "Admin@1234"
    }


@router.post("/register", status_code=201)
async def register(user_data: UserCreate):
    col = users_col()
    if await col.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = {
        "email": user_data.email,
        "phone": user_data.phone,
        "full_name": user_data.full_name,
        "hashed_password": hash_password(user_data.password),
        "role": user_data.role or "citizen",
        "is_active": True,
        "is_verified": False,
        "aadhaar_hash": getattr(user_data, "aadhaar_hash", None),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "last_login": None
    }
    result = await col.insert_one(doc)
    return {"id": str(result.inserted_id), "email": doc["email"],
            "full_name": doc["full_name"], "role": doc["role"]}


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Auto-create demo users on first login attempt
    await _ensure_demo_users()

    col = users_col()
    user = await col.find_one({"email": credentials.email})

    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    await col.update_one({"_id": user["_id"]}, {"$set": {"last_login": datetime.utcnow()}})

    user_id = str(user["_id"])
    token_data = {"sub": user_id, "role": user["role"], "email": user["email"]}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        role=user["role"],
        user_id=user_id,
        full_name=user["full_name"]
    )


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user.get("id"),
        "email": current_user.get("email"),
        "full_name": current_user.get("full_name"),
        "role": current_user.get("role"),
        "is_active": current_user.get("is_active", True)
    }


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}
