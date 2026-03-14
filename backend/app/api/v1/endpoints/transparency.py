"""
Public Transparency Portal — MongoDB version
"""
from datetime import datetime
from fastapi import APIRouter, Query
from app.core.database import potholes_col, repairs_col, blockchain_col, contractors_col

router = APIRouter()


@router.get("/")
async def transparency_overview():
    active_potholes = await potholes_col().count_documents({"is_active": True})
    repairs_completed = await repairs_col().count_documents({"status": "verified"})
    blockchain_records = await blockchain_col().count_documents({})

    pipeline = [{"$match": {"status": "verified"}}, {"$group": {"_id": None, "total": {"$sum": "$actual_cost"}}}]
    spend = await repairs_col().aggregate(pipeline).to_list(1)
    total_spend = spend[0]["total"] if spend else 0.0

    return {
        "active_potholes": active_potholes,
        "repairs_completed": repairs_completed,
        "blockchain_records": blockchain_records,
        "total_government_spend_inr": float(total_spend),
        "platform": "National Road Intelligence Platform",
        "initiative": "Digital India | Government of India",
        "data_as_of": datetime.utcnow().isoformat()
    }


@router.get("/contractor-performance")
async def public_contractor_performance(state: str = Query(None), limit: int = Query(20)):
    col = contractors_col()
    filt = {}
    if state:
        filt["state"] = state
    cursor = col.find(filt).sort("quality_score", -1).limit(limit)
    results = []
    async for r in cursor:
        r["id"] = str(r["_id"])
        r.pop("_id", None)
        results.append(r)
    return results


@router.get("/blockchain-ledger")
async def public_blockchain_ledger(limit: int = Query(50, le=200), offset: int = Query(0)):
    col = blockchain_col()
    cursor = col.find({}).sort("created_at", -1).skip(offset).limit(limit)
    records = []
    async for r in cursor:
        records.append({
            "transaction_hash": r.get("transaction_hash"),
            "event_type": r.get("event_type"),
            "entity_type": r.get("entity_type"),
            "is_confirmed": r.get("is_confirmed", False),
            "network": r.get("network", "simulation"),
            "created_at": r["created_at"].isoformat() if r.get("created_at") else None
        })
    return {"records": records, "total": len(records)}


@router.get("/repair-tracker")
async def public_repair_tracker(status: str = Query(None), limit: int = Query(50)):
    col = repairs_col()
    filt = {}
    if status:
        filt["status"] = status
    cursor = col.find(filt).sort("created_at", -1).limit(limit)
    results = []
    async for r in cursor:
        results.append({
            "repair_number": r.get("repair_number"),
            "status": r.get("status"),
            "scheduled_start": r["scheduled_start"].isoformat() if r.get("scheduled_start") else None,
            "actual_end": r["actual_end"].isoformat() if r.get("actual_end") else None,
            "ai_verified": r.get("ai_verified", False),
            "ai_verification_score": r.get("ai_verification_score")
        })
    return results
