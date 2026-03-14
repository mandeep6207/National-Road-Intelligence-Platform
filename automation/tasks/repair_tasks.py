"""
Repair & Complaint Management Tasks
"""
import logging
from datetime import datetime, timedelta
from automation.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="automation.tasks.repair_tasks.check_overdue_complaints")
def check_overdue_complaints():
    """Flag complaints past their due date and escalate."""
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_async_check_overdue())
    finally:
        loop.close()


async def _async_check_overdue():
    from backend.app.core.database import AsyncSessionLocal
    from backend.app.models import Complaint, Notification
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        result = await db.execute(
            select(Complaint).where(
                Complaint.due_date < now,
                Complaint.status.in_(["pending", "assigned", "in_progress"])
            ).limit(50)
        )
        overdue = result.scalars().all()

        for complaint in overdue:
            days_overdue = (now - complaint.due_date).days
            logger.warning(f"⚠️  Complaint {complaint.complaint_number} overdue by {days_overdue} days")

            # Send escalation notification
            notification = Notification(
                title="⚠️ OVERDUE COMPLAINT ESCALATION",
                message=(
                    f"Complaint {complaint.complaint_number} is {days_overdue} days overdue. "
                    f"Severity: {complaint.severity.upper()}. Immediate action required."
                ),
                notification_type="escalation",
                entity_type="complaint",
                entity_id=complaint.id
            ) if hasattr(__import__('backend.app.models', fromlist=['Notification']), 'Notification') else None

        return {"overdue_count": len(overdue)}


@celery_app.task(name="automation.tasks.repair_tasks.auto_assign_contractors")
def auto_assign_contractors():
    """Automatically assign contractors to pending high-priority complaints."""
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_async_auto_assign())
    finally:
        loop.close()


async def _async_auto_assign():
    from backend.app.core.database import AsyncSessionLocal
    from backend.app.models import Complaint, Contractor, Road
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        # Get pending high-priority complaints
        result = await db.execute(
            select(Complaint).where(
                Complaint.status == "pending",
                Complaint.severity.in_(["critical", "high"]),
                Complaint.assigned_to == None
            ).order_by(Complaint.priority_score.desc()).limit(20)
        )
        complaints = result.scalars().all()
        assigned_count = 0

        for complaint in complaints:
            # Find best contractor (simplified — no state filter here)
            contractor_result = await db.execute(
                select(Contractor).where(
                    Contractor.is_blacklisted == False,
                    Contractor.active_jobs < Contractor.max_concurrent_jobs
                ).order_by(Contractor.quality_score.desc()).limit(1)
            )
            contractor = contractor_result.scalar_one_or_none()
            if contractor:
                complaint.assigned_to = contractor.user_id
                complaint.assigned_at = datetime.utcnow()
                complaint.status = "assigned"
                contractor.active_jobs += 1
                assigned_count += 1

        await db.commit()
        logger.info(f"✅ Auto-assigned {assigned_count} complaints")
        return {"assigned": assigned_count}
