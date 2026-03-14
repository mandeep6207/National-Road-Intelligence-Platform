"""
Dashboard statistics endpoint — MongoDB version
"""
from fastapi import APIRouter, Depends
from app.core.database import potholes_col, complaints_col, repairs_col, contractors_col, blockchain_col

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats():
    p_col = potholes_col()
    c_col = complaints_col()
    r_col = repairs_col()
    ct_col = contractors_col()
    b_col = blockchain_col()

    active_potholes = await p_col.count_documents({"is_active": True})
    critical_potholes = await p_col.count_documents({"is_active": True, "severity": "critical"})
    pending_complaints = await c_col.count_documents({"status": "pending"})
    active_repairs = await r_col.count_documents({"status": "in_progress"})
    verified_repairs = await r_col.count_documents({"status": "verified"})
    blockchain_entries = await b_col.count_documents({})
    active_contractors = await ct_col.count_documents({"is_blacklisted": False})

    pipeline = [{"$match": {"status": "verified"}}, {"$group": {"_id": None, "total": {"$sum": "$actual_cost"}}}]
    spend_result = await r_col.aggregate(pipeline).to_list(1)
    total_spent = spend_result[0]["total"] if spend_result else 0.0

    return {
        "active_potholes": active_potholes,
        "critical_potholes": critical_potholes,
        "pending_complaints": pending_complaints,
        "active_repairs": active_repairs,
        "verified_repairs": verified_repairs,
        "blockchain_entries": blockchain_entries,
        "total_spent": float(total_spent or 0),
        "active_contractors": active_contractors
    }


@router.get("/charts/potholes-by-severity")
async def potholes_by_severity():
    col = potholes_col()
    pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
    ]
    result = await col.aggregate(pipeline).to_list(None)
    return [{"severity": r["_id"], "count": r["count"]} for r in result]


@router.get("/charts/repair-status")
async def repair_status_chart():
    col = repairs_col()
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    result = await col.aggregate(pipeline).to_list(None)
    return [{"status": r["_id"], "count": r["count"]} for r in result]


@router.get("/charts/contractor-rankings")
async def contractor_rankings():
    col = contractors_col()
    cursor = col.find({"is_blacklisted": False}, {"company_name": 1, "quality_score": 1, "rating": 1, "total_jobs_completed": 1}).sort("quality_score", -1).limit(10)
    return [{"name": r["company_name"], "quality_score": r.get("quality_score", 0), "rating": r.get("rating", 0), "jobs": r.get("total_jobs_completed", 0)} async for r in cursor]
