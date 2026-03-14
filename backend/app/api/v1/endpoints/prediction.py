"""
Predictive Maintenance AI endpoint — MongoDB version
"""
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime

from app.core.database import predictions_col, roads_col
from app.schemas import PredictionResponse
from app.services.prediction_service import predict_road_failure

router = APIRouter()


@router.get("/road/{road_id}", response_model=PredictionResponse)
async def predict_for_road(road_id: str):
    roads = roads_col()
    try:
        road = await roads.find_one({"_id": ObjectId(road_id)})
    except Exception:
        road = await roads.find_one({"road_code": road_id})
    if not road:
        raise HTTPException(status_code=404, detail="Road not found")

    prediction = await predict_road_failure(road)

    record = {
        "road_id": road_id,
        "prediction_date": datetime.utcnow(),
        "failure_probability": prediction["failure_probability"],
        "predicted_severity": prediction["predicted_severity"],
        "confidence": prediction["confidence"],
        "recommended_action": prediction["recommended_action"],
        "model_version": "v1.0",
        "input_features": prediction.get("features", {}),
        "created_at": datetime.utcnow()
    }
    await predictions_col().insert_one(record)

    return PredictionResponse(
        road_id=road_id,
        **prediction
    )


@router.get("/high-risk")
async def high_risk_roads(threshold: float = 0.7):
    col = predictions_col()
    cursor = col.find(
        {"failure_probability": {"$gte": threshold}}
    ).sort("failure_probability", -1).limit(50)
    predictions = []
    async for p in cursor:
        predictions.append({
            "road_id": p.get("road_id"),
            "failure_probability": p.get("failure_probability"),
            "predicted_severity": p.get("predicted_severity"),
            "recommended_action": p.get("recommended_action")
        })
    return {
        "high_risk_count": len(predictions),
        "threshold": threshold,
        "predictions": predictions
    }


@router.get("/infrastructure-failure-forecast")
async def infrastructure_forecast():
    col = roads_col()
    cursor = col.find({"condition": {"$in": ["poor", "critical"]}}).limit(20)
    forecasts = []
    async for road in cursor:
        pred = await predict_road_failure(road)
        forecasts.append({
            "road_id": str(road["_id"]),
            "road_name": road.get("road_name"),
            "state": road.get("state"),
            "current_condition": road.get("condition"),
            "health_score": road.get("health_score"),
            "30_day_probability": min(pred["failure_probability"] * 0.7, 1.0),
            "60_day_probability": min(pred["failure_probability"] * 0.9, 1.0),
            "90_day_probability": pred["failure_probability"],
            "action": pred["recommended_action"]
        })
    return {"forecast": forecasts, "total_roads_at_risk": len(forecasts)}
