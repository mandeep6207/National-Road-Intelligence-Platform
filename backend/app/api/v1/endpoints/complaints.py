"""
Complaint management endpoints — MongoDB version
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from bson import ObjectId

from app.core.database import complaints_col
from app.core.security import get_current_user, require_government
from app.schemas import ComplaintCreate
from app.services.blockchain_service import log_event

router = APIRouter()


def generate_complaint_number() -> str:
    now = datetime.utcnow()
    return f"NRIP-{now.year}-{now.month:02d}-{uuid.uuid4().hex[:6].upper()}"


def _out(doc):
    doc["id"] = str(doc["_id"])
    doc.pop("_id", None)
    return doc


@router.post("/", status_code=201)
async def create_complaint(
    data: ComplaintCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    due_days = {"critical": 3, "high": 7, "moderate": 15, "low": 30, "safe": 60}
    days = due_days.get(data.severity, 15)
    due_date = datetime.utcnow() + timedelta(days=days)

    severity_scores = {"critical": 95, "high": 80, "moderate": 60, "low": 40, "safe": 20}
    priority = float(severity_scores.get(data.severity, 60))

    doc = data.model_dump()
    doc["complaint_number"] = generate_complaint_number()
    doc["reported_by"] = current_user.get("id")
    doc["is_auto_generated"] = False
    doc["due_date"] = due_date
    doc["priority_score"] = priority
    doc["status"] = doc.get("status", "pending")
    doc["verified_by_citizen"] = bool(doc.get("verified_by_citizen", False))
    doc["repair_completed_at"] = doc.get("repair_completed_at")
    doc["upvotes"] = 0
    doc["downvotes"] = 0
    doc["citizen_votes"] = 0
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = datetime.utcnow()

    col = complaints_col()
    result = await col.insert_one(doc)
    complaint_id = str(result.inserted_id)

    background_tasks.add_task(
        log_event, "complaint", complaint_id, "complaint",
        {"number": doc["complaint_number"], "severity": data.severity}
    )
    doc["id"] = complaint_id
    doc.pop("_id", None)
    return doc


@router.get("/")
async def list_complaints(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0)
):
    col = complaints_col()
    filt = {}
    if status:
        filt["status"] = status
    if severity:
        filt["severity"] = severity
    cursor = col.find(filt).sort("priority_score", -1).skip(offset).limit(limit)
    return [_out(d) async for d in cursor]


@router.get("/{complaint_id}")
async def get_complaint(complaint_id: str):
    col = complaints_col()
    try:
        doc = await col.find_one({"_id": ObjectId(complaint_id)})
    except Exception:
        doc = await col.find_one({"complaint_number": complaint_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return _out(doc)


@router.post("/{complaint_id}/vote")
async def vote_on_complaint(
    complaint_id: str,
    vote: str = Query(..., regex="^(up|down)$"),
    current_user: dict = Depends(get_current_user)
):
    col = complaints_col()
    try:
        oid = ObjectId(complaint_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid complaint ID")

    doc = await col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Complaint not found")

    field = "upvotes" if vote == "up" else "downvotes"
    await col.update_one({"_id": oid}, {"$inc": {field: 1, "citizen_votes": 1}})
    doc = await col.find_one({"_id": oid})
    return {"message": "Vote recorded", "upvotes": doc.get("upvotes", 0), "downvotes": doc.get("downvotes", 0)}


@router.patch("/{complaint_id}/assign")
async def assign_complaint(
    complaint_id: str,
    contractor_user_id: str,
    current_user: dict = Depends(require_government)
):
    col = complaints_col()
    try:
        oid = ObjectId(complaint_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid complaint ID")

    doc = await col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Complaint not found")

    await col.update_one({"_id": oid}, {"$set": {
        "assigned_to": contractor_user_id,
        "assigned_at": datetime.utcnow(),
        "status": "assigned",
        "updated_at": datetime.utcnow()
    }})
    return {"message": "Complaint assigned successfully"}
