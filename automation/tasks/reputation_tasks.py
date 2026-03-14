"""
Contractor Reputation Scoring Tasks
"""
import logging
from datetime import datetime
from automation.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="automation.tasks.reputation_tasks.compute_reputation_scores")
def compute_reputation_scores():
    """Monthly computation of contractor reputation scores."""
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_async_compute_reputation())
    finally:
        loop.close()


async def _async_compute_reputation():
    from backend.app.core.database import AsyncSessionLocal
    from backend.app.models import Contractor, Repair, ReputationScore, CitizenVote
    from sqlalchemy import select, func
    from datetime import timedelta

    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        month = now.month
        year = now.year

        # Previous month
        if month == 1:
            month = 12
            year -= 1
        else:
            month -= 1

        period_start = datetime(year, month, 1)
        period_end = datetime(year, month + 1 if month < 12 else 1, 1) if month < 12 else datetime(year + 1, 1, 1)

        contractors = await db.execute(select(Contractor))
        contractors_list = contractors.scalars().all()

        scores_computed = 0
        for contractor in contractors_list:
            try:
                # Count repairs in period
                repairs_result = await db.execute(
                    select(Repair).where(
                        Repair.contractor_id == contractor.id,
                        Repair.created_at.between(period_start, period_end)
                    )
                )
                repairs = repairs_result.scalars().all()
                total = len(repairs)
                if total == 0:
                    continue

                on_time = sum(1 for r in repairs
                             if r.actual_end and r.scheduled_end and r.actual_end <= r.scheduled_end)
                verified = sum(1 for r in repairs if r.ai_verified)
                failed = sum(1 for r in repairs if r.status == "failed")

                # Quality score
                quality = (verified / max(total, 1)) * 100
                on_time_pct = (on_time / max(total, 1)) * 100
                efficiency = max(0, 100 - (failed / max(total, 1)) * 50)

                # Final weighted score
                final = quality * 0.4 + on_time_pct * 0.35 + efficiency * 0.25
                grade = _score_to_grade(final)

                # Update contractor metrics
                contractor.total_jobs_completed += total
                contractor.total_jobs_failed += failed
                contractor.quality_score = (contractor.quality_score * 0.7 + quality * 0.3)
                contractor.on_time_delivery_pct = on_time_pct
                contractor.rating = min(5.0, final / 20)

                # Save reputation record
                rep = ReputationScore(
                    contractor_id=contractor.id,
                    period_month=month,
                    period_year=year,
                    jobs_completed=total,
                    jobs_on_time=on_time,
                    avg_quality_score=quality,
                    final_score=final,
                    grade=grade
                )
                db.add(rep)
                scores_computed += 1

            except Exception as e:
                logger.error(f"Reputation calc failed for {contractor.id}: {e}")

        await db.commit()
        logger.info(f"✅ Reputation scores computed for {scores_computed} contractors")
        return {"scores_computed": scores_computed, "period": f"{year}-{month:02d}"}


def _score_to_grade(score: float) -> str:
    if score >= 90: return "A+"
    if score >= 80: return "A"
    if score >= 70: return "B"
    if score >= 60: return "C"
    if score >= 50: return "D"
    return "F"
