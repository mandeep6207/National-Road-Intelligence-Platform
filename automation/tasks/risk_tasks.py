"""
Risk & Budget Anomaly Tasks
"""
import logging
from automation.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="automation.tasks.risk_tasks.recalculate_all_risk_scores")
def recalculate_all_risk_scores():
    """Recalculate risk scores for all active potholes."""
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(_async_recalculate())
        logger.info(f"✅ Risk recalculation: {result['updated']} potholes updated")
        return result
    finally:
        loop.close()


async def _async_recalculate():
    from backend.app.core.database import AsyncSessionLocal
    from backend.app.models import Pothole
    from backend.app.services.risk_service import calculate_risk_score
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Pothole).where(Pothole.is_active == True).limit(100)
        )
        potholes = result.scalars().all()
        updated = 0
        for p in potholes:
            try:
                await calculate_risk_score(p, db)
                updated += 1
            except Exception as e:
                logger.error(f"Risk calc failed for {p.id}: {e}")
        await db.commit()
        return {"updated": updated}


@celery_app.task(name="automation.tasks.risk_tasks.detect_budget_anomalies")
def detect_budget_anomalies():
    """
    Detect budget anomalies using statistical analysis.
    Flags unusually high costs for similar repair types.
    """
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_async_detect_anomalies())
    finally:
        loop.close()


async def _async_detect_anomalies():
    from backend.app.core.database import AsyncSessionLocal
    from backend.app.models import BudgetRecord, Repair
    from sqlalchemy import select, func
    import numpy as np

    async with AsyncSessionLocal() as db:
        # Get repair costs
        result = await db.execute(
            select(Repair.id, Repair.actual_cost, Repair.repair_method)
            .where(Repair.actual_cost > 0)
        )
        repairs = result.all()

        if not repairs:
            return {"anomalies_found": 0}

        costs = [float(r.actual_cost) for r in repairs if r.actual_cost]
        if len(costs) < 3:
            return {"anomalies_found": 0}

        mean = sum(costs) / len(costs)
        std = (sum((c - mean) ** 2 for c in costs) / len(costs)) ** 0.5
        threshold = mean + 2 * std  # 2σ threshold

        anomaly_count = 0
        for r in repairs:
            if r.actual_cost and float(r.actual_cost) > threshold:
                # Flag as anomaly
                record = BudgetRecord(
                    record_type="expenditure",
                    repair_id=r.id,
                    amount=r.actual_cost,
                    is_anomaly=True,
                    anomaly_reason=f"Cost {r.actual_cost:.0f} exceeds 2σ threshold ({threshold:.0f})",
                    anomaly_score=round((float(r.actual_cost) - mean) / max(std, 1), 2)
                )
                db.add(record)
                anomaly_count += 1

        await db.commit()
        logger.info(f"🚨 Budget anomalies detected: {anomaly_count}")
        return {"anomalies_found": anomaly_count, "threshold": threshold, "mean": mean}
