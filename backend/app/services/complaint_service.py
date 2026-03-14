"""
Auto Complaint Generation Service — MongoDB version
"""
import uuid
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


async def auto_generate_complaint(pothole: dict) -> None:
    """Auto-generate complaint for detected critical/high severity potholes."""
    from app.core.database import complaints_col

    severity = pothole.get("severity", "moderate")
    due_days = {"critical": 3, "high": 7, "moderate": 15}.get(severity, 15)
    lat = pothole.get("latitude", 0)
    lng = pothole.get("longitude", 0)
    confidence = pothole.get("confidence_score", 0)

    doc = {
        "complaint_number": f"AUTO-{datetime.utcnow().year}-{uuid.uuid4().hex[:8].upper()}",
        "pothole_id": str(pothole.get("_id", "")),
        "road_id": pothole.get("road_id"),
        "auto_generated": True,
        "title": f"[AUTO] {severity.upper()} Pothole Detected at ({lat:.4f}, {lng:.4f})",
        "description": (
            f"Automatically detected by AI system on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}. "
            f"Severity: {severity.upper()}. "
            f"Confidence: {confidence * 100:.1f}%."
        ),
        "latitude": lat,
        "longitude": lng,
        "severity": severity,
        "status": "pending",
        "priority_score": 50.0,
        "upvotes": 0,
        "downvotes": 0,
        "citizen_votes": 0,
        "due_date": datetime.utcnow() + timedelta(days=due_days),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    try:
        col = complaints_col()
        result = await col.insert_one(doc)
        logger.info(f"✅ Auto-complaint generated: {doc['complaint_number']}")
    except Exception as e:
        logger.error(f"Failed to auto-generate complaint: {e}")
