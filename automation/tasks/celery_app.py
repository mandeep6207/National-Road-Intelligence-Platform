"""
Celery Application Configuration
"""
from celery import Celery
from celery.schedules import crontab
import os

REDIS_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "nrip_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "automation.tasks.detection_tasks",
        "automation.tasks.risk_tasks",
        "automation.tasks.repair_tasks",
        "automation.tasks.satellite_tasks",
        "automation.tasks.maintenance_tasks",
        "automation.tasks.reputation_tasks"
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600
)

# ─── Scheduled Tasks (Beat) ─────────────────────────────────────────────────
celery_app.conf.beat_schedule = {
    # Satellite scan every 6 hours
    "satellite-scan": {
        "task": "automation.tasks.satellite_tasks.run_satellite_scan",
        "schedule": crontab(minute=0, hour="*/6"),
        "args": ()
    },
    # Risk score recalculation every hour
    "recalculate-risk-scores": {
        "task": "automation.tasks.risk_tasks.recalculate_all_risk_scores",
        "schedule": crontab(minute=0, hour="*"),
    },
    # Predictive maintenance daily at 2 AM
    "predictive-maintenance": {
        "task": "automation.tasks.maintenance_tasks.run_predictive_maintenance",
        "schedule": crontab(minute=0, hour=2),
    },
    # Contractor reputation scoring — monthly
    "reputation-scoring": {
        "task": "automation.tasks.reputation_tasks.compute_reputation_scores",
        "schedule": crontab(minute=0, hour=3, day_of_month=1),
    },
    # Overdue complaint checker — every 4 hours
    "overdue-complaints": {
        "task": "automation.tasks.repair_tasks.check_overdue_complaints",
        "schedule": crontab(minute=0, hour="*/4"),
    },
    # Budget anomaly detection — daily
    "budget-anomaly-check": {
        "task": "automation.tasks.risk_tasks.detect_budget_anomalies",
        "schedule": crontab(minute=30, hour=1),
    }
}
