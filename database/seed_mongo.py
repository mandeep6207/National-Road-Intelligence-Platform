"""
Seed demo users into MongoDB (roadguardian database)
Run from project root: python database/seed_mongo.py
"""
import asyncio
from datetime import datetime
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = "mongodb://localhost:27017"
DB_NAME = "roadguardian"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_USERS = [
    {"email": "admin@nrip.gov.in",      "full_name": "Super Administrator",   "role": "super_admin"},
    {"email": "govt@nrip.gov.in",        "full_name": "Government Authority",   "role": "government"},
    {"email": "contractor@nrip.gov.in",  "full_name": "Road Contractor",        "role": "contractor"},
    {"email": "citizen@nrip.gov.in",     "full_name": "Citizen User",           "role": "citizen"},
    {"email": "auditor@nrip.gov.in",     "full_name": "Infrastructure Auditor", "role": "auditor"},
]

DEMO_POTHOLES = [
    {"detection_id": "DET-DEMO001", "latitude": 28.6139, "longitude": 77.2090, "severity": "critical", "confidence_score": 0.95, "sensor_source": "dashcam", "is_active": True, "is_repaired": False},
    {"detection_id": "DET-DEMO002", "latitude": 19.0760, "longitude": 72.8777, "severity": "high",     "confidence_score": 0.88, "sensor_source": "cctv",    "is_active": True, "is_repaired": False},
    {"detection_id": "DET-DEMO003", "latitude": 12.9716, "longitude": 77.5946, "severity": "moderate", "confidence_score": 0.76, "sensor_source": "satellite","is_active": True, "is_repaired": False},
    {"detection_id": "DET-DEMO004", "latitude": 22.5726, "longitude": 88.3639, "severity": "low",      "confidence_score": 0.65, "sensor_source": "drone",   "is_active": True, "is_repaired": False},
    {"detection_id": "DET-DEMO005", "latitude": 17.3850, "longitude": 78.4867, "severity": "critical", "confidence_score": 0.92, "sensor_source": "dashcam", "is_active": True, "is_repaired": False},
]


async def seed():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DB_NAME]

    hashed = pwd_context.hash("Admin@1234")

    print(f"\n🌱 Seeding MongoDB: {DB_NAME}")
    print("=" * 50)

    # Seed users
    users_col = db["users"]
    await users_col.create_index("email", unique=True)
    for u in DEMO_USERS:
        doc = {
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
        }
        try:
            await users_col.insert_one(doc)
            print(f"  ✅ User created: {u['email']} ({u['role']})")
        except Exception:
            print(f"  ⚠️  User already exists: {u['email']}")

    # Seed potholes
    potholes_col = db["potholes"]
    await potholes_col.create_index("detection_id", unique=True)
    for p in DEMO_POTHOLES:
        p["detected_at"] = datetime.utcnow()
        p["created_at"] = datetime.utcnow()
        try:
            await potholes_col.insert_one(p)
            print(f"  ✅ Pothole: {p['detection_id']} ({p['severity']})")
        except Exception:
            print(f"  ⚠️  Pothole already exists: {p['detection_id']}")

    print("\n" + "=" * 50)
    print("✅ Seeding complete!")
    print("\nDemo Login Credentials:")
    print("  Email: admin@nrip.gov.in")
    print("  Password: Admin@1234")
    print("\nAll roles use the same password: Admin@1234")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
