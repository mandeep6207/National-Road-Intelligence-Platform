"""
Unified monitoring orchestration for multi-source AI road issue capture.
"""
import os
import re
import uuid
import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.core.database import (
    alerts_col,
    complaints_col,
    contractors_col,
    districts_col,
    issues_col,
    notifications_col,
    potholes_col,
    repairs_col,
)
from app.services.detection_service import run_detection_on_image


DISTRICT_CATALOG: Dict[str, Dict[str, Any]] = {
    "Delhi": {
        "state": "Delhi",
        "center": (28.6139, 77.2090),
        "roads": ["NH-48", "Outer Ring Road", "Mathura Road", "Ring Road"],
    },
    "Mumbai": {
        "state": "Maharashtra",
        "center": (19.0760, 72.8777),
        "roads": ["Western Express Highway", "Eastern Express Highway", "LBS Marg", "JVLR"],
    },
    "Bengaluru Urban": {
        "state": "Karnataka",
        "center": (12.9716, 77.5946),
        "roads": ["Outer Ring Road", "Mysuru Road", "Old Madras Road", "Bellary Road"],
    },
    "Hyderabad": {
        "state": "Telangana",
        "center": (17.3850, 78.4867),
        "roads": ["NH-44", "Outer Ring Road", "JNTU Road", "Banjara Hills Road"],
    },
    "Chennai": {
        "state": "Tamil Nadu",
        "center": (13.0827, 80.2707),
        "roads": ["NH-32", "Anna Salai", "OMR", "GST Road"],
    },
    "Kolkata": {
        "state": "West Bengal",
        "center": (22.5726, 88.3639),
        "roads": ["NH-12", "EM Bypass", "VIP Road", "AJC Bose Road"],
    },
    "Pune": {
        "state": "Maharashtra",
        "center": (18.5204, 73.8567),
        "roads": ["Mumbai Pune Expressway", "NH-48", "Nagar Road", "Paud Road"],
    },
    "Lucknow": {
        "state": "Uttar Pradesh",
        "center": (26.8467, 80.9462),
        "roads": ["NH-27", "Shaheed Path", "Kanpur Road", "Sitapur Road"],
    },
    "Raipur": {
        "state": "Chhattisgarh",
        "center": (21.2514, 81.6296),
        "roads": ["NH-53", "GE Road", "VIP Road", "Ring Road"],
    },
}

SOURCE_TYPES = {"satellite", "dashcam", "cctv", "citizen_mobile"}
SEVERITY_ORDER = {"critical": 4, "high": 3, "moderate": 2, "low": 1}


def _normalize_source_type(source_type: str) -> str:
    source = (source_type or "dashcam").strip().lower()
    if source == "citizen":
        source = "citizen_mobile"
    if source not in SOURCE_TYPES:
        source = "dashcam"
    return source


def _coerce_lat_lng(latitude: float, longitude: float) -> Tuple[float, float, str, str]:
    if latitude and longitude:
        district = _nearest_district(latitude, longitude)
        district_data = DISTRICT_CATALOG.get(district, DISTRICT_CATALOG["Raipur"])
        return latitude, longitude, district, district_data["state"]

    district = random.choice(list(DISTRICT_CATALOG.keys()))
    district_data = DISTRICT_CATALOG[district]
    base_lat, base_lng = district_data["center"]
    lat = round(base_lat + random.uniform(-0.02, 0.02), 6)
    lng = round(base_lng + random.uniform(-0.02, 0.02), 6)
    return lat, lng, district, district_data["state"]


def _nearest_district(latitude: float, longitude: float) -> str:
    best_district = "Raipur"
    best_distance = 10**9
    for district, data in DISTRICT_CATALOG.items():
        d_lat, d_lng = data["center"]
        distance = (latitude - d_lat) ** 2 + (longitude - d_lng) ** 2
        if distance < best_distance:
            best_distance = distance
            best_district = district
    return best_district


def _pick_detection(detections: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not detections:
        return {
            "pothole_id": f"SIM-{uuid.uuid4().hex[:10].upper()}",
            "confidence": 0.72,
            "severity": "moderate",
            "bbox": None,
        }

    def score(item: Dict[str, Any]) -> float:
        severity_weight = SEVERITY_ORDER.get(str(item.get("severity", "low")).lower(), 1)
        confidence = float(item.get("confidence", 0.0) or 0.0)
        return severity_weight * 100 + confidence

    return max(detections, key=score)


def _priority_from_severity(severity: str) -> str:
    if severity in {"critical", "high"}:
        return "HIGH"
    if severity == "moderate":
        return "MEDIUM"
    return "LOW"


def _is_highway_road(road_name: str) -> bool:
    return bool(re.search(r"\b(NH|SH|Expressway|Highway)\b", road_name or "", flags=re.IGNORECASE))


async def get_contractor_suggestions(
    district: str,
    state: str,
    severity: str,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    col = contractors_col()
    docs = await col.find({"is_blacklisted": False}).to_list(200)

    scored: List[Dict[str, Any]] = []
    severity_bonus = 1.15 if severity in {"critical", "high"} else 1.0

    for doc in docs:
        on_time = float(doc.get("on_time_delivery_pct", 0.0) or 0.0)
        quality = float(doc.get("quality_score", 50.0) or 50.0)
        rating = float(doc.get("rating", 3.0) or 3.0)
        availability = 1.0 if doc.get("is_available", True) else 0.45

        district_match = str(doc.get("district", "")).strip().lower() == district.strip().lower()
        state_match = str(doc.get("state", "")).strip().lower() == state.strip().lower()

        district_score = 15.0 if district_match else (8.0 if state_match else 0.0)
        performance_score = min(100.0, (quality * 0.62) + (on_time * 0.25) + (rating * 8.0))
        recommendation_score = round((performance_score + district_score) * availability * severity_bonus, 2)

        scored.append(
            {
                "contractor_id": str(doc.get("_id")),
                "company_name": doc.get("company_name", "Unknown Contractor"),
                "district_match": district_match,
                "availability_score": round(availability * 100, 1),
                "performance_score": round(performance_score, 1),
                "recommendation_score": recommendation_score,
            }
        )

    scored.sort(key=lambda item: item["recommendation_score"], reverse=True)
    return scored[:limit]


async def list_high_risk_alerts(limit: int = 50) -> List[Dict[str, Any]]:
    cursor = alerts_col().find({}).sort("created_at", -1).limit(limit)
    return [doc async for doc in cursor]


async def list_issues(limit: int = 100) -> List[Dict[str, Any]]:
    cursor = issues_col().find({}).sort("created_at", -1).limit(limit)
    return [doc async for doc in cursor]


async def process_monitoring_capture(
    image_path: str,
    image_url: str,
    source_type: str,
    latitude: float,
    longitude: float,
    submitted_by: str,
    district_hint: Optional[str] = None,
    road_hint: Optional[str] = None,
) -> Dict[str, Any]:
    now = datetime.utcnow()
    source = _normalize_source_type(source_type)
    lat, lng, inferred_district, inferred_state = _coerce_lat_lng(latitude, longitude)

    district = district_hint or inferred_district
    state = DISTRICT_CATALOG.get(district, {}).get("state", inferred_state)
    road_options = DISTRICT_CATALOG.get(district, DISTRICT_CATALOG["Raipur"])["roads"]
    road_name = road_hint or random.choice(road_options)

    detections = await run_detection_on_image(image_path, lat, lng)
    picked = _pick_detection(detections)

    severity = str(picked.get("severity", "moderate")).lower()
    if severity not in {"critical", "high", "moderate", "low"}:
        severity = "moderate"

    confidence = float(picked.get("confidence", 0.72) or 0.72)
    issue_id = f"ISS-{uuid.uuid4().hex[:10].upper()}"
    complaint_id = f"CMP-AI-{uuid.uuid4().hex[:8].upper()}"
    complaint_number = f"NRIP-AI-{now.year}-{uuid.uuid4().hex[:6].upper()}"
    assigned_authority = f"{district} District Authority"
    priority = _priority_from_severity(severity)

    issue_doc = {
        "issue_id": issue_id,
        "source_type": source,
        "image_url": image_url,
        "latitude": lat,
        "longitude": lng,
        "road_name": road_name,
        "district": district,
        "state": state,
        "severity": severity,
        "confidence": round(confidence, 4),
        "status": "detected",
        "reported_by": submitted_by,
        "complaint_id": complaint_id,
        "created_at": now,
        "updated_at": now,
    }
    issue_result = await issues_col().insert_one(issue_doc)

    await districts_col().update_one(
        {"district": district},
        {
            "$set": {
                "district": district,
                "state": state,
                "center": DISTRICT_CATALOG.get(district, DISTRICT_CATALOG["Raipur"])["center"],
                "updated_at": now,
            },
            "$inc": {"issues_detected": 1},
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    # Mirror in potholes collection to keep existing dashboard APIs compatible.
    await potholes_col().insert_one(
        {
            "detection_id": issue_id,
            "latitude": lat,
            "longitude": lng,
            "severity": severity,
            "confidence_score": round(confidence, 4),
            "sensor_source": source,
            "image_url": image_url,
            "road_name": road_name,
            "city": district,
            "district": district,
            "state": state,
            "is_active": True,
            "is_repaired": False,
            "pipeline_stage": 3,
            "status": "assigned",
            "detected_at": now,
            "created_at": now,
        }
    )

    due_days = {"critical": 2, "high": 5, "moderate": 12, "low": 20}
    complaint_doc = {
        "complaint_number": complaint_number,
        "complaint_id": complaint_id,
        "issue_id": issue_id,
        "reported_by": submitted_by,
        "title": f"{severity.upper()} pothole on {road_name}",
        "description": f"Automatically generated from {source} source via AI detection.",
        "latitude": lat,
        "longitude": lng,
        "district": district,
        "state": state,
        "road_name": road_name,
        "severity": severity,
        "priority": priority,
        "assigned_authority": assigned_authority,
        "report_source": source,
        "status": "ASSIGNED_TO_AUTHORITY",
        "verified_by_citizen": False,
        "repair_completed_at": None,
        "is_auto_generated": True,
        "priority_score": {"critical": 95.0, "high": 82.0, "moderate": 60.0, "low": 35.0}[severity],
        "due_date": now + timedelta(days=due_days[severity]),
        "created_at": now,
        "updated_at": now,
    }
    complaint_result = await complaints_col().insert_one(complaint_doc)

    suggestions = await get_contractor_suggestions(district=district, state=state, severity=severity, limit=5)

    # Stage progression with contractor recommendation stored in repair worklist.
    if suggestions:
        top = suggestions[0]
        await repairs_col().insert_one(
            {
                "repair_number": f"REP-AI-{uuid.uuid4().hex[:8].upper()}",
                "complaint_id": str(complaint_result.inserted_id),
                "issue_id": issue_id,
                "contractor_id": top["contractor_id"],
                "contractor_name": top["company_name"],
                "district": district,
                "state": state,
                "repair_status": "assigned",
                "verification_status": "pending",
                "created_at": now,
                "updated_at": now,
            }
        )

    high_risk_alert = None
    if severity == "critical" and _is_highway_road(road_name):
        alert_id = f"ALT-{uuid.uuid4().hex[:10].upper()}"
        alert_doc = {
            "alert_id": alert_id,
            "title": "High Risk Alert",
            "message": "Critical pothole detected on major road.",
            "district": district,
            "state": state,
            "road_name": road_name,
            "severity": severity,
            "issue_id": issue_id,
            "complaint_id": complaint_id,
            "recipients": ["super_admin", "government"],
            "created_at": now,
        }
        await alerts_col().insert_one(alert_doc)
        await notifications_col().insert_many(
            [
                {
                    "recipient_role": "super_admin",
                    "title": alert_doc["title"],
                    "message": alert_doc["message"],
                    "alert_id": alert_id,
                    "issue_id": issue_id,
                    "district": district,
                    "created_at": now,
                    "is_read": False,
                },
                {
                    "recipient_role": "government",
                    "title": alert_doc["title"],
                    "message": alert_doc["message"],
                    "alert_id": alert_id,
                    "issue_id": issue_id,
                    "district": district,
                    "created_at": now,
                    "is_read": False,
                },
            ]
        )
        high_risk_alert = alert_doc

    lifecycle = [
        {"stage": "AI Detection", "status": "completed", "timestamp": now.isoformat()},
        {"stage": "Complaint Created", "status": "completed", "timestamp": now.isoformat()},
        {"stage": "Authority Assigned", "status": "completed", "timestamp": now.isoformat()},
        {
            "stage": "Contractor Assigned",
            "status": "suggested" if suggestions else "pending",
            "timestamp": now.isoformat(),
        },
        {"stage": "Repair Completed", "status": "pending", "timestamp": None},
        {"stage": "Citizen Verification", "status": "pending", "timestamp": None},
        {"stage": "Auditor Audit", "status": "pending", "timestamp": None},
    ]

    return {
        "issue_id": issue_id,
        "issue_db_id": str(issue_result.inserted_id),
        "complaint_id": complaint_id,
        "source_type": source,
        "severity": severity,
        "confidence": round(confidence, 4),
        "latitude": lat,
        "longitude": lng,
        "road_name": road_name,
        "district": district,
        "state": state,
        "assigned_authority": assigned_authority,
        "priority": priority,
        "status": "ASSIGNED_TO_AUTHORITY",
        "image_url": image_url,
        "high_risk_alert": high_risk_alert,
        "contractor_suggestions": suggestions,
        "lifecycle": lifecycle,
    }
