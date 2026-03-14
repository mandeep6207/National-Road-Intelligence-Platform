"""
NRIP Demo Data Seeder
Seeds the database with demo users and sample data.
Run: cd backend && python -m app.seed_demo
Or:  cd "Project Root" && python database/seed_demo.py
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_USERS = [
    {
        "email": "admin@nrip.gov.in",
        "full_name": "System Administrator",
        "password": "Admin@1234",
        "role": "super_admin",
        "is_active": True,
        "is_verified": True,
        "phone": "9000000001",
    },
    {
        "email": "authority@nh.gov.in",
        "full_name": "National Highway Authority",
        "password": "Admin@1234",
        "role": "government",
        "is_active": True,
        "is_verified": True,
        "phone": "9000000002",
    },
    {
        "email": "contractor@roads.com",
        "full_name": "RoadBuild Contractors Pvt Ltd",
        "password": "Admin@1234",
        "role": "contractor",
        "is_active": True,
        "is_verified": True,
        "phone": "9000000003",
    },
    {
        "email": "citizen@example.com",
        "full_name": "Rahul Kumar",
        "password": "Admin@1234",
        "role": "citizen",
        "is_active": True,
        "is_verified": True,
        "phone": "9000000004",
    },
    {
        "email": "auditor@nrip.gov.in",
        "full_name": "Infrastructure Auditor",
        "password": "Admin@1234",
        "role": "auditor",
        "is_active": True,
        "is_verified": True,
        "phone": "9000000005",
    },
]


async def seed():
    try:
        from app.core.database import AsyncSessionLocal, engine, Base
        from app.models import User, Contractor
        from sqlalchemy import select
        import uuid

        print("\n🌱 NRIP Demo Data Seeder")
        print("=" * 50)

        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Tables created/verified")

        async with AsyncSessionLocal() as db:
            for user_data in DEMO_USERS:
                # Check if exists
                result = await db.execute(
                    select(User).where(User.email == user_data["email"])
                )
                existing = result.scalar_one_or_none()

                if existing:
                    # Update password hash
                    existing.hashed_password = pwd_context.hash(user_data["password"])
                    print(f"  🔄 Updated: {user_data['email']} ({user_data['role']})")
                else:
                    user = User(
                        email=user_data["email"],
                        full_name=user_data["full_name"],
                        hashed_password=pwd_context.hash(user_data["password"]),
                        role=user_data["role"],
                        is_active=user_data["is_active"],
                        is_verified=user_data["is_verified"],
                        phone=user_data.get("phone"),
                    )
                    db.add(user)
                    print(f"  ✅ Created: {user_data['email']} ({user_data['role']})")

            await db.commit()

            # Seed contractor profile
            result = await db.execute(
                select(User).where(User.email == "contractor@roads.com")
            )
            contractor_user = result.scalar_one_or_none()
            if contractor_user:
                result2 = await db.execute(
                    select(Contractor).where(Contractor.user_id == contractor_user.id)
                )
                existing_contractor = result2.scalar_one_or_none()
                if not existing_contractor:
                    contractor = Contractor(
                        user_id=contractor_user.id,
                        contractor_code="CON-DEMO-001",
                        company_name="RoadBuild Contractors Pvt Ltd",
                        license_number="MH-CON-2024-001",
                        gstin="27AABCS1429B1Z1",
                        state="Maharashtra",
                        specialization=["pothole_repair", "road_resurfacing"],
                        max_concurrent_jobs=10,
                        active_jobs=2,
                        rating=4.2,
                        total_jobs_completed=47,
                        on_time_delivery_pct=91.5,
                        quality_score=82.0,
                        contact_person="Suresh Patel",
                        contact_phone="9000000003",
                        contact_email="contractor@roads.com",
                    )
                    db.add(contractor)
                    print("  ✅ Created: Contractor profile")
                    await db.commit()

        print("\n✅ Demo seeding complete!")
        print("\n📋 Login credentials:")
        print("  Email                   | Password   | Role")
        print("  " + "-" * 50)
        for u in DEMO_USERS:
            print(f"  {u['email']:<24} | Admin@1234 | {u['role']}")
        print()

    except ImportError as e:
        print(f"\n❌ Import error: {e}")
        print("   Make sure you're running from the project root:")
        print("   cd backend && python -m app.seed_demo")
    except Exception as e:
        print(f"\n❌ Seeding failed: {e}")
        print(f"   Make sure PostgreSQL is running and DATABASE_URL is configured in .env")
        import traceback
        traceback.print_exc()


def main():
    # Also generate SQL for manual insertion
    print("\n📝 SQL for manual insertion (copy-paste into psql):")
    print("=" * 60)
    print("-- Demo users with bcrypt hashed passwords (Admin@1234)")
    print("-- Run this in psql: \\c nrip_db")
    print()

    for user_data in DEMO_USERS:
        hashed = pwd_context.hash(user_data["password"])
        phone_val = f"'{user_data['phone']}'" if user_data.get("phone") else "NULL"
        print(f"""INSERT INTO users (email, full_name, hashed_password, role, phone, is_active, is_verified)
VALUES ('{user_data["email"]}', '{user_data["full_name"]}', '{hashed}', '{user_data["role"]}', {phone_val}, true, true)
ON CONFLICT (email) DO UPDATE SET hashed_password = EXCLUDED.hashed_password;
""")

    print("=" * 60)
    print("\n🚀 Running async seeder...")
    asyncio.run(seed())


if __name__ == "__main__":
    main()
