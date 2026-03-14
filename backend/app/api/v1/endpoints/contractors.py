"""
Contractor management endpoints — MongoDB version
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime

from app.core.database import contractors_col
from app.core.security import get_current_user, require_government
from app.schemas import ContractorCreate

router = APIRouter()


def _out(doc):
    doc["id"] = str(doc["_id"])
    doc.pop("_id", None)
    return doc


@router.get("/")
async def list_contractors(
    state: Optional[str] = Query(None),
    is_blacklisted: Optional[bool] = Query(False),
    limit: int = Query(50)
):
    col = contractors_col()
    filt = {}
    if state:
        filt["state"] = state
    if is_blacklisted is not None:
        filt["is_blacklisted"] = is_blacklisted
    cursor = col.find(filt).sort("quality_score", -1).limit(limit)
    return [_out(d) async for d in cursor]


@router.post("/", status_code=201)
async def register_contractor(
    data: ContractorCreate,
    _: dict = Depends(require_government)
):
    col = contractors_col()
    doc = data.model_dump()
    doc["contractor_code"] = f"CON-{uuid.uuid4().hex[:8].upper()}"
    doc["rating"] = 3.0
    doc["total_jobs_completed"] = 0
    doc["on_time_delivery_pct"] = 0.0
    doc["quality_score"] = 50.0
    doc["is_blacklisted"] = False
    doc["created_at"] = datetime.utcnow()
    result = await col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.get("/{contractor_id}")
async def get_contractor(contractor_id: str):
    col = contractors_col()
    try:
        doc = await col.find_one({"_id": ObjectId(contractor_id)})
    except Exception:
        doc = await col.find_one({"contractor_code": contractor_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return _out(doc)


@router.post("/{contractor_id}/blacklist")
async def blacklist_contractor(
    contractor_id: str,
    reason: str,
    _: dict = Depends(require_government)
):
    col = contractors_col()
    try:
        oid = ObjectId(contractor_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid contractor ID")
    doc = await col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Contractor not found")
    await col.update_one({"_id": oid}, {"$set": {"is_blacklisted": True, "blacklist_reason": reason}})
    return {"message": f"Contractor {doc['company_name']} blacklisted"}


@router.get("/{contractor_id}/assign-complaint")
async def auto_assign_contractor(
    complaint_id: str,
    state: str,
    severity: str
):
    col = contractors_col()
    doc = await col.find_one(
        {"state": state, "is_blacklisted": False},
        sort=[("quality_score", -1)]
    )
    if not doc:
        return {"assigned": False, "message": "No available contractor found"}

    return {
        "assigned": True,
        "contractor_id": str(doc["_id"]),
        "company_name": doc["company_name"],
        "quality_score": doc.get("quality_score", 0)
    }
