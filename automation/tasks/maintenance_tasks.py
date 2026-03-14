"""
Predictive Maintenance Scheduled Tasks
"""
import logging
from automation.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="automation.tasks.maintenance_tasks.run_predictive_maintenance")
def run_predictive_maintenance():
    """Run predictive maintenance AI for all roads."""
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_async_predict())
    finally:
        loop.close()


async def _async_predict():
    from backend.app.core.database import AsyncSessionLocal
    from backend.app.models import Road, PredictiveMaintenance
    from backend.app.services.prediction_service import predict_road_failure
    from sqlalchemy import select
    from datetime import datetime

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Road).limit(50))
        roads = result.scalars().all()
        predictions_made = 0
        high_risk = 0

        for road in roads:
            try:
                pred = await predict_road_failure(road, db)
                record = PredictiveMaintenance(
                    road_id=road.id,
                    prediction_date=datetime.utcnow(),
                    failure_probability=pred["failure_probability"],
                    predicted_severity=pred["predicted_severity"],
                    confidence=pred["confidence"],
                    recommended_action=pred["recommended_action"],
                    model_version="v1.0",
                    input_features=pred.get("features", {})
                )
                db.add(record)

                if pred["failure_probability"] >= 0.7:
                    high_risk += 1
                    logger.warning(
                        f"🚨 HIGH RISK: {road.road_name} — "
                        f"{pred['failure_probability']*100:.0f}% failure probability"
                    )
                predictions_made += 1
            except Exception as e:
                logger.error(f"Prediction failed for road {road.id}: {e}")

        await db.commit()
        logger.info(f"✅ Predictive maintenance: {predictions_made} roads analyzed, {high_risk} high risk")
        return {"predictions_made": predictions_made, "high_risk_roads": high_risk}
