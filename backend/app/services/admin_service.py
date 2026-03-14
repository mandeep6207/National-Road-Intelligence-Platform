"""
Admin Service — Autonomous pipeline logic for RoadGuardian AI
Handles: auto complaint generation, city admin assignment, repair queuing, system logging
"""
import uuid
import random
from datetime import datetime
from typing import Optional

from app.core.database import (
    potholes_col, complaints_col, repairs_col,
    city_admins_col, system_logs_col, detection_logs_col, blockchain_col
)


# ─── System Logger ────────────────────────────────────────────────────────────

async def log_system_event(log_type: str, description: str):
    """Write an entry to system_logs collection."""
    await system_logs_col().insert_one({
        "log_type": log_type,
        "description": description,
        "timestamp": datetime.utcnow()
    })


# ─── Autonomous Pipeline ──────────────────────────────────────────────────────

async def run_autonomous_pipeline(pothole_doc: dict) -> dict:
    """
    Trigger the full autonomous pipeline for a detected pothole:
    1. Pothole already saved in DB (passed as arg)
    2. Auto-generate complaint
    3. Assign to city admin (if available)
    4. Add to repair queue
    5. Log events to blockchain simulation
    Returns: dict with complaint_id and repair_id
    """
    pothole_id = str(pothole_doc.get("_id", pothole_doc.get("id", "")))
    city = pothole_doc.get("city", "Unknown")
    severity = pothole_doc.get("severity", "medium")

    # Step 1 — Auto-generate complaint
    complaint_id = f"CMP-{uuid.uuid4().hex[:8].upper()}"
    dept = _severity_to_department(severity)
    complaint = {
        "pothole_id": pothole_id,
        "complaint_id": complaint_id,
        "department": dept,
        "city": city,
        "created_at": datetime.utcnow(),
        "status": "open",
        "auto_generated": True,
        "priority": severity
    }
    complaint_result = await complaints_col().insert_one(complaint)
    await log_system_event("COMPLAINT_CREATED", f"Auto-complaint {complaint_id} created for pothole in {city}")

    # Step 2 — Assign to city admin
    assigned_admin = await _assign_city_admin(city)
    if assigned_admin:
        await complaints_col().update_one(
            {"_id": complaint_result.inserted_id},
            {"$set": {"assigned_admin_id": str(assigned_admin["_id"]), "status": "in_progress"}}
        )
        await potholes_col().update_one(
            {"_id": pothole_doc["_id"]},
            {"$set": {"status": "assigned", "assigned_admin": str(assigned_admin["_id"])}}
        )
        await log_system_event("ADMIN_ASSIGNED", f"Pothole {pothole_id} assigned to city admin {assigned_admin.get('name')} in {city}")

    # Step 3 — Add to repair queue
    repair_id = f"REP-{uuid.uuid4().hex[:8].upper()}"
    team = _auto_assign_team(severity, city)
    repair = {
        "pothole_id": pothole_id,
        "complaint_id": complaint_id,
        "repair_number": repair_id,
        "assigned_team": team,
        "repair_status": "assigned",
        "verification_status": "pending",
        "repair_started_at": None,
        "repair_completed_at": None,
        "estimated_days": _severity_to_days(severity),
        "created_at": datetime.utcnow()
    }
    repair_result = await repairs_col().insert_one(repair)
    await log_system_event("REPAIR_QUEUED", f"Repair {repair_id} queued — Team: {team}")

    # Step 4 — Blockchain simulation
    tx_hash = f"0x{uuid.uuid4().hex}"
    await blockchain_col().insert_one({
        "transaction_hash": tx_hash,
        "event_type": "pothole_detected",
        "entity_id": pothole_id,
        "entity_type": "pothole",
        "data_hash": f"0x{uuid.uuid4().hex[:32]}",
        "network": "simulation",
        "is_confirmed": True,
        "created_at": datetime.utcnow()
    })

    return {
        "complaint_id": complaint_id,
        "repair_id": repair_id,
        "assigned_team": team,
        "tx_hash": tx_hash,
        "pipeline": "completed"
    }


# ─── Dashboard Statistics ─────────────────────────────────────────────────────

async def get_dashboard_stats() -> dict:
    """Aggregate full system statistics for Super Admin dashboard."""
    p_col = potholes_col()
    c_col = complaints_col()
    r_col = repairs_col()
    ca_col = city_admins_col()
    dl_col = detection_logs_col()

    # Potholes
    total_potholes = await p_col.count_documents({})
    pending_potholes = await p_col.count_documents({"status": "pending"})
    assigned_potholes = await p_col.count_documents({"status": "assigned"})
    repaired_potholes = await p_col.count_documents({"status": "repaired"})

    # By severity
    severity_pipeline = [{"$group": {"_id": "$severity", "count": {"$sum": 1}}}]
    sev_data = await p_col.aggregate(severity_pipeline).to_list(None)
    severity_breakdown = {s["_id"]: s["count"] for s in sev_data}

    # Complaints
    total_complaints = await c_col.count_documents({})
    open_complaints = await c_col.count_documents({"status": "open"})
    resolved_complaints = await c_col.count_documents({"status": "resolved"})

    # Repairs
    pending_repairs = await r_col.count_documents({"repair_status": {"$in": ["assigned", "repairing"]}})
    completed_repairs = await r_col.count_documents({"repair_status": "completed"})

    # City admins
    total_city_admins = await ca_col.count_documents({})
    active_city_admins = await ca_col.count_documents({"status": "active"})

    # Active cities (distinct)
    cities = await p_col.distinct("city")
    active_cities = len([c for c in cities if c and c != "Unknown"])

    # Recent detection log stats
    last_detection = await dl_col.find_one({}, sort=[("timestamp", -1)])

    # System health
    pipeline_health = "healthy"
    if pending_potholes > 100:
        pipeline_health = "overloaded"
    elif open_complaints > 50:
        pipeline_health = "degraded"

    return {
        "potholes": {
            "total": total_potholes,
            "pending": pending_potholes,
            "assigned": assigned_potholes,
            "repaired": repaired_potholes,
            "by_severity": severity_breakdown
        },
        "complaints": {
            "total": total_complaints,
            "open": open_complaints,
            "resolved": resolved_complaints
        },
        "repairs": {
            "pending": pending_repairs,
            "completed": completed_repairs
        },
        "city_admins": {
            "total": total_city_admins,
            "active": active_city_admins
        },
        "active_cities": active_cities,
        "pipeline_health": pipeline_health,
        "last_ai_detection": last_detection["timestamp"].isoformat() if last_detection else None,
        "generated_at": datetime.utcnow().isoformat()
    }


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _severity_to_department(severity: str) -> str:
    return {
        "high": "National Highways Authority",
        "medium": "Public Works Department",
        "low": "Municipal Corporation"
    }.get(severity, "Public Works Department")


def _severity_to_days(severity: str) -> int:
    return {"high": 2, "medium": 5, "low": 10}.get(severity, 5)


def _auto_assign_team(severity: str, city: str) -> str:
    teams = {
        "high": ["Emergency Repair Squad A", "Priority Team Delta", "Rapid Response Unit"],
        "medium": ["PWD Team 1", "PWD Team 2", "Municipal Road Crew"],
        "low": ["Maintenance Squad B", "Ward Repair Team", "Local Contractor Unit"]
    }
    options = teams.get(severity, teams["medium"])
    return random.choice(options)


async def _assign_city_admin(city: str) -> Optional[dict]:
    """Find an active city admin for the given city, or any active admin."""
    col = city_admins_col()
    admin = await col.find_one({"city": city, "status": "active"})
    if not admin:
        admin = await col.find_one({"status": "active"})
    return admin


async def log_detection(model_name: str, detection_count: int, processing_time_ms: int):
    """Log an AI detection run."""
    await detection_logs_col().insert_one({
        "model_name": model_name,
        "detection_count": detection_count,
        "processing_time": processing_time_ms,
        "timestamp": datetime.utcnow()
    })
    await log_system_event(
        "AI_DETECTION",
        f"Model {model_name} detected {detection_count} potholes in {processing_time_ms}ms"
    )
