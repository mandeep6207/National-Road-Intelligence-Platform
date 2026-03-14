"""
9-Stage Autonomous Infrastructure Lifecycle Pipeline
RoadGuardian AI — Hackathon Demo

Stage 1 — Sensor Input (Satellite / CCTV / Dashcam)
Stage 2 — AI Damage Detection (YOLOv8 + OpenCV)
Stage 3 — Risk & Severity Engine
Stage 4 — Auto Complaint + Work Order
Stage 5 — Repair Execution
Stage 6 — AI Repair Verification
Stage 7 — Blockchain Ledger (simulated)
Stage 8 — Public Transparency Portal
Stage 9 — Policy Analytics Dashboard
"""

import uuid
import random
import hashlib
from datetime import datetime
from typing import Optional

from bson import ObjectId

from app.core.database import (
    potholes_col, complaints_col, repairs_col,
    pipeline_logs_col, dashboard_stats_col,
    blockchain_col, system_logs_col
)

# ─── Stage labels ─────────────────────────────────────────────────────────────
STAGE_NAMES = {
    1: "Sensor Input",
    2: "AI Damage Detection",
    3: "Risk & Severity Engine",
    4: "Auto Complaint + Work Order",
    5: "Repair Execution",
    6: "AI Repair Verification",
    7: "Blockchain Ledger",
    8: "Public Transparency Portal",
    9: "Policy Analytics Dashboard",
}

_CITIES = ["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai",
           "Kolkata", "Ahmedabad", "Pune", "Lucknow", "Raipur",
           "Jaipur", "Bhopal", "Nagpur", "Patna", "Surat"]

_ROADS = ["NH-48", "Ring Road", "Outer Ring Road", "JNTU Road", "Anna Salai",
          "VIP Road", "SG Highway", "Pune-Mumbai Expressway", "Kanpur Road",
          "GE Road", "Ajmer Road", "Bhopal-Nagpur Highway", "Airport Road",
          "Gandhi Setu", "Katargam Road"]

_TEAMS = [
    "City Repair Team A", "PWD Squad 1", "Emergency Repair Unit",
    "Municipal Road Crew", "Highway Maintenance Team",
    "Zone 3 Repair Squad", "NHAI Contractor Unit", "Urban Infrastructure Team"
]

_DEPTS = {
    "high":   "National Highways Authority",
    "medium": "Public Works Department",
    "low":    "Municipal Corporation",
}


# ─── Pipeline Logger ──────────────────────────────────────────────────────────

async def _log_stage(pothole_id: str, stage: int, status: str, detail: str = ""):
    await pipeline_logs_col().insert_one({
        "pothole_id": pothole_id,
        "stage": stage,
        "stage_name": STAGE_NAMES[stage],
        "status": status,          # "completed" | "failed" | "skipped"
        "detail": detail,
        "timestamp": datetime.utcnow(),
    })
    await system_logs_col().insert_one({
        "log_type": f"STAGE_{stage}_{status.upper()}",
        "description": f"[{STAGE_NAMES[stage]}] Pothole {pothole_id} — {detail}",
        "timestamp": datetime.utcnow(),
    })


async def _advance_stage(pothole_id_str: str, stage: int):
    """Update the pothole's current pipeline_stage in MongoDB."""
    col = potholes_col()
    try:
        oid = ObjectId(pothole_id_str)
    except Exception:
        return
    await col.update_one(
        {"_id": oid},
        {"$set": {"pipeline_stage": stage, "updated_at": datetime.utcnow()}}
    )


# ─── Main Pipeline ────────────────────────────────────────────────────────────

async def process_pothole_pipeline(
    pothole_id: str,
    location: dict,
    severity: str,
    confidence: float,
    image_url: str = "",
    city: str = "",
    road_name: str = "",
) -> dict:
    """
    Run the full 9-stage lifecycle for a pothole.
    Returns a summary dict with all stage results.
    """
    results = {f"stage{i}": "pending" for i in range(1, 10)}
    complaint_id = None
    repair_id = None
    tx_hash = None

    # ── Stage 1: Sensor Input ────────────────────────────────────────────────
    await _advance_stage(pothole_id, 1)
    results["stage1"] = "completed"
    await _log_stage(pothole_id, 1, "completed",
                     f"Image received from sensor. Source: dashcam/camera")

    # ── Stage 2: AI Damage Detection ─────────────────────────────────────────
    await _advance_stage(pothole_id, 2)
    results["stage2"] = "completed"
    await _log_stage(pothole_id, 2, "completed",
                     f"YOLOv8 detection: confidence={confidence:.2f}, severity={severity}")

    # ── Stage 3: Risk & Severity Engine ──────────────────────────────────────
    risk_score = _calculate_risk(severity, confidence)
    await _advance_stage(pothole_id, 3)
    await potholes_col().update_one(
        {"_id": _to_oid(pothole_id)},
        {"$set": {"risk_score": risk_score, "pipeline_stage": 3}}
    )
    results["stage3"] = "completed"
    await _log_stage(pothole_id, 3, "completed",
                     f"Risk score: {risk_score}/10 | Priority: {_priority(severity)}")

    # ── Stage 4: Auto Complaint + Work Order ─────────────────────────────────
    complaint_id = f"CMP-{uuid.uuid4().hex[:8].upper()}"
    dept = _DEPTS.get(severity, "Public Works Department")
    if not city:
        city = random.choice(_CITIES)
    complaint_doc = {
        "pothole_id": pothole_id,
        "complaint_id": complaint_id,
        "department": dept,
        "city": city,
        "road_name": road_name or random.choice(_ROADS),
        "priority": severity,
        "status": "open",
        "auto_generated": True,
        "created_at": datetime.utcnow(),
    }
    await complaints_col().insert_one(complaint_doc)
    await _advance_stage(pothole_id, 4)
    results["stage4"] = "completed"
    await _log_stage(pothole_id, 4, "completed",
                     f"Complaint {complaint_id} created → {dept}")

    # ── Stage 5: Repair Execution ────────────────────────────────────────────
    repair_id = f"REP-{uuid.uuid4().hex[:8].upper()}"
    team = random.choice(_TEAMS)
    repair_doc = {
        "pothole_id": pothole_id,
        "complaint_id": complaint_id,
        "repair_number": repair_id,
        "assigned_team": team,
        "repair_status": "assigned",
        "verification_status": "pending",
        "estimated_days": _est_days(severity),
        "repair_started_at": None,
        "repair_completed_at": None,
        "created_at": datetime.utcnow(),
    }
    await repairs_col().insert_one(repair_doc)
    await potholes_col().update_one(
        {"_id": _to_oid(pothole_id)},
        {"$set": {"status": "assigned", "pipeline_stage": 5}}
    )
    results["stage5"] = "completed"
    await _log_stage(pothole_id, 5, "completed",
                     f"Repair {repair_id} assigned to {team}")

    # ── Stage 6: AI Repair Verification (simulated) ──────────────────────────
    verification_confidence = round(random.uniform(0.88, 0.99), 3)
    await potholes_col().update_one(
        {"_id": _to_oid(pothole_id)},
        {"$set": {"verification_confidence": verification_confidence,
                  "pipeline_stage": 6}}
    )
    results["stage6"] = "completed"
    await _log_stage(pothole_id, 6, "completed",
                     f"AI Verification score: {verification_confidence:.2f} — PASS")

    # ── Stage 7: Blockchain Ledger (simulated) ────────────────────────────────
    tx_hash = _generate_tx_hash(pothole_id, complaint_id, repair_id)
    await blockchain_col().insert_one({
        "transaction_hash": tx_hash,
        "event_type": "pothole_lifecycle",
        "entity_id": pothole_id,
        "entity_type": "pothole",
        "data_hash": hashlib.sha256(f"{pothole_id}{complaint_id}{repair_id}".encode()).hexdigest(),
        "network": "Polygon (simulation)",
        "is_confirmed": True,
        "created_at": datetime.utcnow(),
    })
    await _advance_stage(pothole_id, 7)
    results["stage7"] = "completed"
    await _log_stage(pothole_id, 7, "completed",
                     f"Blockchain tx: {tx_hash[:20]}…")

    # ── Stage 8: Public Transparency Portal ──────────────────────────────────
    await potholes_col().update_one(
        {"_id": _to_oid(pothole_id)},
        {"$set": {
            "public_visible": True,
            "transparency_record": {
                "complaint_id": complaint_id,
                "repair_id": repair_id,
                "tx_hash": tx_hash,
                "published_at": datetime.utcnow().isoformat(),
            },
            "pipeline_stage": 8,
        }}
    )
    results["stage8"] = "completed"
    await _log_stage(pothole_id, 8, "completed",
                     "Record published to public transparency portal")

    # ── Stage 9: Policy Analytics Dashboard ──────────────────────────────────
    await _update_dashboard_stats()
    await _advance_stage(pothole_id, 9)
    results["stage9"] = "completed"
    await _log_stage(pothole_id, 9, "completed",
                     "Policy analytics dashboard updated")

    # Final status update
    await potholes_col().update_one(
        {"_id": _to_oid(pothole_id)},
        {"$set": {"pipeline_stage": 9, "pipeline_completed": True,
                  "pipeline_completed_at": datetime.utcnow()}}
    )

    return {
        "pipeline_stages": results,
        "complaint_id": complaint_id,
        "repair_id": repair_id,
        "tx_hash": tx_hash,
        "risk_score": risk_score,
        "pipeline_completed": True,
    }


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _to_oid(id_str: str):
    try:
        return ObjectId(id_str)
    except Exception:
        return id_str


def _calculate_risk(severity: str, confidence: float) -> float:
    base = {"high": 8.0, "medium": 5.5, "low": 2.5}.get(severity, 5.0)
    return round(min(10.0, base + (confidence - 0.5) * 2), 1)


def _priority(severity: str) -> str:
    return {"high": "P1-Critical", "medium": "P2-Moderate", "low": "P3-Low"}.get(severity, "P2-Moderate")


def _est_days(severity: str) -> int:
    return {"high": 2, "medium": 5, "low": 10}.get(severity, 5)


def _generate_tx_hash(pothole_id: str, complaint_id: str, repair_id: str) -> str:
    raw = f"{pothole_id}{complaint_id}{repair_id}{datetime.utcnow().isoformat()}"
    return "0x" + hashlib.sha256(raw.encode()).hexdigest()


async def _update_dashboard_stats():
    """Refresh materialized stats document for fast dashboard reads."""
    p_col = potholes_col()
    c_col = complaints_col()
    r_col = repairs_col()
    total_potholes    = await p_col.count_documents({})
    repairs_pending   = await r_col.count_documents({"repair_status": {"$in": ["assigned", "repairing"]}})
    repairs_completed = await r_col.count_documents({"repair_status": "completed"})
    complaints_total  = await c_col.count_documents({})

    await dashboard_stats_col().replace_one(
        {"_id": "global"},
        {
            "_id": "global",
            "total_potholes": total_potholes,
            "repairs_pending": repairs_pending,
            "repairs_completed": repairs_completed,
            "complaints_generated": complaints_total,
            "updated_at": datetime.utcnow(),
        },
        upsert=True
    )


# ─── Pipeline status reader ───────────────────────────────────────────────────

async def get_pipeline_status(pothole_id: str) -> dict:
    """
    Return per-stage status dict for a given pothole.
    Derives from the stored pipeline_logs if available;
    falls back to pothole.pipeline_stage number.
    """
    # Fetch logs for this pothole
    cursor = pipeline_logs_col().find({"pothole_id": pothole_id}).sort("stage", 1)
    logs = await cursor.to_list(None)

    stage_status = {f"stage{i}": "pending" for i in range(1, 10)}

    if logs:
        for log in logs:
            key = f"stage{log['stage']}"
            stage_status[key] = log["status"]
    else:
        # Fall back: read pipeline_stage integer from pothole document
        try:
            oid = ObjectId(pothole_id)
        except Exception:
            oid = None
        if oid:
            doc = await potholes_col().find_one({"_id": oid})
        else:
            doc = await potholes_col().find_one({"detection_id": pothole_id})

        if doc:
            current = doc.get("pipeline_stage", 0)
            for i in range(1, 10):
                stage_status[f"stage{i}"] = "completed" if i <= current else "pending"

    # Attach stage names
    named = {}
    for i in range(1, 10):
        key = f"stage{i}"
        named[key] = {
            "status": stage_status[key],
            "name": STAGE_NAMES[i],
        }
    return named


# ─── Startup seeder (15 records) ─────────────────────────────────────────────

_LOCATIONS_15 = [
    (28.6139, 77.2090, "NH-48",                    "Delhi"),
    (28.5355, 77.3910, "Noida Expressway",          "Delhi"),
    (19.0760, 72.8777, "Western Express Highway",   "Mumbai"),
    (19.1136, 72.8697, "Link Road Andheri",         "Mumbai"),
    (12.9716, 77.5946, "Outer Ring Road",           "Bangalore"),
    (17.3850, 78.4867, "JNTU Road",                 "Hyderabad"),
    (13.0827, 80.2707, "Anna Salai",                "Chennai"),
    (22.5726, 88.3639, "VIP Road",                  "Kolkata"),
    (23.0225, 72.5714, "SG Highway",                "Ahmedabad"),
    (18.5204, 73.8567, "Pune-Mumbai Expressway",    "Pune"),
    (26.8467, 80.9462, "Kanpur Road",               "Lucknow"),
    (21.2514, 81.6296, "GE Road",                   "Raipur"),
    (26.9124, 75.7873, "Ajmer Road",                "Jaipur"),
    (21.1458, 79.0882, "Nagpur-Bhopal Highway",     "Nagpur"),
    (23.2599, 77.4126, "Bhopal Ring Road",          "Bhopal"),
]
_SEVERITY_CYCLE = ["high", "medium", "low", "high", "medium",
                   "medium", "low", "high", "medium", "low",
                   "high", "medium", "medium", "low", "high"]
_PIPELINE_STAGES = [9, 9, 8, 7, 6, 5, 4, 9, 9, 8, 6, 5, 9, 7, 9]


async def seed_pipeline_demo_data():
    """
    Seed 15 potholes, each at a different pipeline stage,
    so the dashboard and pipeline visualizer always have demo data.
    Only runs if potholes collection is empty.
    """
    if await potholes_col().count_documents({}) > 0:
        return

    for i, (lat, lng, road, city) in enumerate(_LOCATIONS_15):
        severity   = _SEVERITY_CYCLE[i]
        confidence = round(random.uniform(0.72, 0.97), 3)
        stage      = _PIPELINE_STAGES[i]
        det_id     = f"DET-SEED-{i+1:03d}"

        pothole = {
            "detection_id": det_id,
            "latitude": lat,
            "longitude": lng,
            "location": {"lat": lat, "lng": lng},
            "road_name": road,
            "city": city,
            "severity": severity,
            "confidence_score": confidence,
            "risk_score": _calculate_risk(severity, confidence),
            "detection_source": random.choice(["satellite", "drone", "camera", "dashcam"]),
            "status": "assigned" if stage >= 5 else "pending",
            "pipeline_stage": stage,
            "pipeline_completed": stage == 9,
            "is_active": True,
            "public_visible": stage >= 8,
            "detected_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
        }
        p_res = await potholes_col().insert_one(pothole)
        pid = str(p_res.inserted_id)

        # Complaint (stage 4+)
        if stage >= 4:
            cmp_id = f"CMP-SEED-{i+1:03d}"
            await complaints_col().insert_one({
                "pothole_id": pid,
                "complaint_id": cmp_id,
                "department": _DEPTS.get(severity, "PWD"),
                "city": city,
                "road_name": road,
                "priority": severity,
                "status": "resolved" if stage == 9 else ("in_progress" if stage >= 6 else "open"),
                "auto_generated": True,
                "created_at": datetime.utcnow(),
            })

        # Repair (stage 5+)
        if stage >= 5:
            rep_id = f"REP-SEED-{i+1:03d}"
            rep_status = "completed" if stage == 9 else ("repairing" if stage >= 6 else "assigned")
            await repairs_col().insert_one({
                "pothole_id": pid,
                "complaint_id": f"CMP-SEED-{i+1:03d}",
                "repair_number": rep_id,
                "assigned_team": random.choice(_TEAMS),
                "repair_status": rep_status,
                "verification_status": "verified" if stage >= 6 else "pending",
                "estimated_days": _est_days(severity),
                "repair_started_at": datetime.utcnow() if stage >= 6 else None,
                "repair_completed_at": datetime.utcnow() if stage == 9 else None,
                "created_at": datetime.utcnow(),
            })

        # Blockchain (stage 7+)
        if stage >= 7:
            tx = "0x" + hashlib.sha256(f"{pid}{i}".encode()).hexdigest()
            try:
                await blockchain_col().insert_one({
                    "transaction_hash": tx,
                    "event_type": "pothole_lifecycle",
                    "entity_id": pid,
                    "entity_type": "pothole",
                    "data_hash": hashlib.sha256(pid.encode()).hexdigest(),
                    "network": "Polygon (simulation)",
                    "is_confirmed": True,
                    "created_at": datetime.utcnow(),
                })
            except Exception:
                pass  # tx_hash unique constraint — skip if already exists

        # Pipeline logs
        for s in range(1, min(stage + 1, 10)):
            await pipeline_logs_col().insert_one({
                "pothole_id": pid,
                "stage": s,
                "stage_name": STAGE_NAMES[s],
                "status": "completed",
                "detail": f"Seeded demo data — stage {s}",
                "timestamp": datetime.utcnow(),
            })

    await _update_dashboard_stats()
    await system_logs_col().insert_one({
        "log_type": "SEED",
        "description": "Pipeline demo data seeded: 15 potholes across 9-stage lifecycle",
        "timestamp": datetime.utcnow(),
    })
