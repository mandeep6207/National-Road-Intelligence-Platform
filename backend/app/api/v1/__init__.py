"""
API v1 router — aggregates all endpoint modules
"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, detection, potholes, complaints,
    contractors, repairs, dashboard, transparency,
    blockchain, prediction, admin, demo, pipeline, monitoring, citizen_engagement
)

router = APIRouter()

router.include_router(auth.router,         prefix="/auth",        tags=["Authentication"])
router.include_router(detection.router,    prefix="/detect",      tags=["AI Detection"])
router.include_router(pipeline.router,     prefix="",             tags=["Pipeline"])
router.include_router(demo.router,         prefix="",             tags=["Demo"])
router.include_router(potholes.router,     prefix="/potholes",    tags=["Potholes"])
router.include_router(complaints.router,   prefix="/complaints",  tags=["Complaints"])
router.include_router(contractors.router,  prefix="/contractors", tags=["Contractors"])
router.include_router(repairs.router,      prefix="/repairs",     tags=["Repairs"])
router.include_router(dashboard.router,    prefix="/dashboard",   tags=["Dashboard"])
router.include_router(transparency.router, prefix="/transparency",tags=["Transparency"])
router.include_router(blockchain.router,   prefix="/blockchain",  tags=["Blockchain"])
router.include_router(prediction.router,   prefix="/predict",     tags=["Predictive AI"])
router.include_router(admin.router,        prefix="/admin",       tags=["Super Admin"])
router.include_router(monitoring.router,   prefix="/monitoring",  tags=["Advanced Monitoring"])
router.include_router(citizen_engagement.router, prefix="",        tags=["Citizen Engagement"])
