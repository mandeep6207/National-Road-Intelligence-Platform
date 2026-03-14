"""
Blockchain ledger endpoints — MongoDB version
"""
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from bson import ObjectId

from app.core.database import blockchain_col

router = APIRouter()


@router.get("/")
async def list_blockchain_records(
    event_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0)
):
    col = blockchain_col()
    filt = {}
    if event_type:
        filt["event_type"] = event_type
    cursor = col.find(filt).sort("created_at", -1).skip(offset).limit(limit)
    records = []
    async for r in cursor:
        records.append({
            "id": str(r["_id"]),
            "transaction_hash": r.get("transaction_hash"),
            "event_type": r.get("event_type"),
            "entity_type": r.get("entity_type"),
            "entity_id": r.get("entity_id"),
            "is_confirmed": r.get("is_confirmed", False),
            "network": r.get("network", "simulation"),
            "created_at": r["created_at"].isoformat() if r.get("created_at") else None
        })
    return records


@router.get("/{tx_hash}")
async def get_by_hash(tx_hash: str):
    col = blockchain_col()
    record = await col.find_one({"transaction_hash": tx_hash})
    if not record:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {
        "transaction_hash": record["transaction_hash"],
        "block_number": record.get("block_number"),
        "event_type": record.get("event_type"),
        "entity_id": record.get("entity_id"),
        "entity_type": record.get("entity_type"),
        "data_hash": record.get("data_hash"),
        "network": record.get("network"),
        "is_confirmed": record.get("is_confirmed", False),
        "created_at": record["created_at"].isoformat() if record.get("created_at") else None
    }


@router.get("/entity/{entity_id}")
async def get_entity_history(entity_id: str):
    col = blockchain_col()
    cursor = col.find({"entity_id": entity_id}).sort("created_at", 1)
    records = []
    async for r in cursor:
        records.append({
            "event": r.get("event_type"),
            "tx_hash": r.get("transaction_hash"),
            "timestamp": r["created_at"].isoformat() if r.get("created_at") else None,
            "confirmed": r.get("is_confirmed", False)
        })
    return {
        "entity_id": entity_id,
        "total_events": len(records),
        "lifecycle": records
    }
