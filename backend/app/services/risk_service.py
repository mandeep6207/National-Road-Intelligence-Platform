"""
Risk Scoring Engine — calculates priority risk score for potholes (MongoDB version)
"""
import logging
from typing import Dict

logger = logging.getLogger(__name__)

SEVERITY_BASE_SCORES = {
    "critical": 90,
    "high": 70,
    "moderate": 50,
    "low": 30,
    "safe": 10
}

MODIFIERS = {
    "high_traffic": 15,
    "school_nearby": 12,
    "hospital_nearby": 10,
    "pedestrian_zone": 8,
    "accident_history": 5,
    "monsoon_season": 5,
    "highway": 8
}


async def calculate_risk_score(pothole: dict) -> Dict:
    """
    Multi-factor risk scoring algorithm.
    Returns risk score (0-100) and priority factors.
    """
    from app.core.database import risk_scores_col
    from datetime import datetime

    severity = pothole.get("severity", "moderate")
    base_score = SEVERITY_BASE_SCORES.get(severity, 50)
    factors = {}
    modifier = 0

    lat = pothole.get("latitude", 0)
    lng = pothole.get("longitude", 0)

    traffic = _estimate_traffic_volume(lat, lng)
    if traffic == "high":
        modifier += MODIFIERS["high_traffic"]
        factors["high_traffic"] = True

    school_nearby = _check_poi_proximity(lat, lng, "school")
    hospital_nearby = _check_poi_proximity(lat, lng, "hospital")

    if school_nearby:
        modifier += MODIFIERS["school_nearby"]
        factors["school_nearby"] = True
    if hospital_nearby:
        modifier += MODIFIERS["hospital_nearby"]
        factors["hospital_nearby"] = True

    confidence_modifier = (pothole.get("confidence_score") or 0.5) * 5
    final_score = min(100.0, base_score + modifier + confidence_modifier)

    recommended_actions = {
        "critical": "Immediate emergency repair within 24 hours — road closure advised",
        "high": "Priority repair within 7 days — safety barriers recommended",
        "moderate": "Schedule repair within 15 days",
        "low": "Include in next maintenance cycle",
        "safe": "Monitor and log"
    }
    recommended_action = recommended_actions.get(severity, "Monitor")

    # Save risk score to MongoDB
    try:
        await risk_scores_col().insert_one({
            "pothole_id": str(pothole.get("_id", "")),
            "road_id": pothole.get("road_id"),
            "risk_score": final_score,
            "traffic_volume": traffic,
            "school_nearby": school_nearby,
            "hospital_nearby": hospital_nearby,
            "factors": factors,
            "recommended_action": recommended_action,
            "calculated_at": datetime.utcnow()
        })
    except Exception as e:
        logger.warning(f"Failed to save risk score: {e}")

    return {
        "risk_score": final_score,
        "factors": factors,
        "recommended_action": recommended_action,
        "traffic_volume": traffic
    }


def _estimate_traffic_volume(lat: float, lng: float) -> str:
    high_traffic_zones = [
        (28.6, 77.2, 0.5),
        (19.0, 72.9, 0.3),
        (12.9, 77.6, 0.3),
        (22.5, 88.3, 0.3),
        (13.0, 80.2, 0.3),
    ]
    for zlat, zlng, radius in high_traffic_zones:
        if abs(lat - zlat) < radius and abs(lng - zlng) < radius:
            return "high"
    return "medium"


def _check_poi_proximity(lat: float, lng: float, poi_type: str) -> bool:
    import random
    return random.random() < 0.25
