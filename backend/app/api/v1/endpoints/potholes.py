"""
Pothole endpoints — MongoDB version
"""
from typing import Optional
from datetime import datetime
import uuid

from fastapi import APIRouter, HTTPException, Query, Depends
from bson import ObjectId

from app.core.database import potholes_col
from app.core.security import get_current_user
from app.schemas import PotholeCreate

router = APIRouter()


def _out(doc):
    doc["id"] = str(doc["_id"])
    doc.pop("_id", None)
    return doc


@router.get("/")
async def list_potholes(
    severity: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    limit: int = Query(100, le=500),
    offset: int = Query(0)
):
    col = potholes_col()
    filt = {}
    if is_active is not None:
        filt["is_active"] = is_active
    if severity:
        filt["severity"] = severity
    cursor = col.find(filt).sort("detected_at", -1).skip(offset).limit(limit)
    return [_out(d) async for d in cursor]


@router.get("/map-data")
async def get_map_data(
    lat_min: float = Query(8.0), lat_max: float = Query(37.0),
    lng_min: float = Query(68.0), lng_max: float = Query(97.0)
):
    col = potholes_col()
    cursor = col.find({
        "is_active": True,
        "latitude": {"$gte": lat_min, "$lte": lat_max},
        "longitude": {"$gte": lng_min, "$lte": lng_max}
    }).limit(2000)

    color_map = {"critical": "#DC2626", "high": "#EA580C", "moderate": "#D97706",
                 "low": "#65A30D", "safe": "#16A34A"}
    features = []
    async for p in cursor:
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [p["longitude"], p["latitude"]]},
            "properties": {
                "id": str(p["_id"]),
                "detection_id": p.get("detection_id"),
                "severity": p.get("severity", "moderate"),
                "color": color_map.get(p.get("severity", "moderate"), "#6B7280"),
                "confidence": p.get("confidence_score"),
                "is_repaired": p.get("is_repaired", False),
                "sensor_source": p.get("sensor_source"),
                "detected_at": p["detected_at"].isoformat() if p.get("detected_at") else None,
                "image_url": p.get("image_url")
            }
        })
    return {"type": "FeatureCollection", "features": features, "total": len(features)}


@router.get("/stats/summary")
async def pothole_stats():
    col = potholes_col()
    pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
    ]
    result = await col.aggregate(pipeline).to_list(None)
    stats = {r["_id"]: r["count"] for r in result}
    total = sum(stats.values())
    return {
        "total_active": total,
        "by_severity": stats,
        "critical_percentage": round((stats.get("critical", 0) / max(total, 1)) * 100, 1)
    }


@router.get("/{pothole_id}")
async def get_pothole(pothole_id: str):
    col = potholes_col()
    try:
        doc = await col.find_one({"_id": ObjectId(pothole_id)})
    except Exception:
        doc = await col.find_one({"detection_id": pothole_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Pothole not found")
    return _out(doc)


@router.post("/", status_code=201)
async def create_pothole(data: PotholeCreate, current_user: dict = Depends(get_current_user)):
    col = potholes_col()
    doc = data.model_dump()
    doc["detection_id"] = f"MAN-{uuid.uuid4().hex[:10].upper()}"
    doc["detected_at"] = datetime.utcnow()
    doc["created_at"] = datetime.utcnow()
    doc["is_active"] = True
    doc["is_repaired"] = False
    result = await col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc
