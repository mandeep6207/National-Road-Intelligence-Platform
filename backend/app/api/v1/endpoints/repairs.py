"""
Repair management endpoints — MongoDB version
"""
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from bson import ObjectId

from app.core.database import repairs_col, complaints_col, potholes_col, notifications_col
from app.core.security import get_current_user, require_government
from app.schemas import RepairCreate, RepairUpdate
from app.services.verification_service import verify_repair_ai
from app.services.blockchain_service import log_event

router = APIRouter()


def _out(doc):
    doc["id"] = str(doc["_id"])
    doc.pop("_id", None)
    return doc


@router.post("/", status_code=201)
async def create_repair(
    data: RepairCreate,
    background_tasks: BackgroundTasks,
    _: dict = Depends(require_government)
):
    repair_number = f"WO-{datetime.utcnow().year}-{uuid.uuid4().hex[:8].upper()}"
    warranty_expires = datetime.utcnow() + timedelta(days=365)

    doc = data.model_dump()
    doc["repair_number"] = repair_number
    doc["warranty_expires"] = warranty_expires
    doc["status"] = "pending"
    doc["ai_verified"] = False
    doc["created_at"] = datetime.utcnow()
    doc["updated_at"] = datetime.utcnow()

    # Convert UUID fields to str
    for f in ["complaint_id", "pothole_id", "contractor_id"]:
        if doc.get(f):
            doc[f] = str(doc[f])

    col = repairs_col()
    result = await col.insert_one(doc)
    repair_id = str(result.inserted_id)

    # Update complaint status
    if data.complaint_id:
        await complaints_col().update_one(
            {"_id": ObjectId(str(data.complaint_id))},
            {"$set": {"status": "in_progress", "work_order_id": repair_number}}
        )

    background_tasks.add_task(
        log_event, "assignment", repair_id, "repair",
        {"work_order": repair_number, "contractor_id": str(data.contractor_id)}
    )
    doc["id"] = repair_id
    doc.pop("_id", None)
    return doc


@router.patch("/{repair_id}")
async def update_repair(
    repair_id: str,
    data: RepairUpdate,
    _: dict = Depends(get_current_user)
):
    col = repairs_col()
    try:
        oid = ObjectId(repair_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid repair ID")

    doc = await col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Repair not found")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.utcnow()
    await col.update_one({"_id": oid}, {"$set": updates})
    doc = await col.find_one({"_id": oid})
    return _out(doc)


@router.post("/{repair_id}/verify")
async def verify_repair(
    repair_id: str,
    background_tasks: BackgroundTasks,
    after_image: UploadFile = File(...),
    before_image: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    col = repairs_col()
    try:
        oid = ObjectId(repair_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid repair ID")

    doc = await col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Repair not found")

    import os
    os.makedirs("uploads/repairs", exist_ok=True)
    after_filename = f"{uuid.uuid4()}_after_{after_image.filename}"
    after_path = f"uploads/repairs/{after_filename}"
    with open(after_path, "wb") as f:
        f.write(await after_image.read())

    before_path = None
    if before_image:
        before_filename = f"{uuid.uuid4()}_before_{before_image.filename}"
        before_path = f"uploads/repairs/{before_filename}"
        with open(before_path, "wb") as f:
            f.write(await before_image.read())

    verification_result = await verify_repair_ai(after_path, before_path)

    updates = {
        "ai_verification_score": verification_result["score"],
        "ai_verified": verification_result["verified"],
        "ai_verified_at": datetime.utcnow(),
        "after_images": [after_path],
        "updated_at": datetime.utcnow()
    }

    if verification_result["verified"]:
        updates["status"] = "verified"
        updates["actual_end"] = datetime.utcnow()

        if doc.get("complaint_id"):
            complaint_oid = ObjectId(doc["complaint_id"])
            await complaints_col().update_one(
                {"_id": complaint_oid},
                {
                    "$set": {
                        "status": "REPAIR_COMPLETED",
                        "repair_completed_at": datetime.utcnow(),
                        "verified_by_citizen": False,
                        "resolved_at": datetime.utcnow(),
                    }
                }
            )
            complaint_doc = await complaints_col().find_one({"_id": complaint_oid})
            if complaint_doc and complaint_doc.get("reported_by"):
                await notifications_col().insert_one(
                    {
                        "recipient_user_id": str(complaint_doc.get("reported_by")),
                        "recipient_role": "citizen",
                        "title": "Repair Completed",
                        "message": "Your reported pothole has been repaired. Please verify it to earn tokens.",
                        "complaint_id": doc.get("complaint_id"),
                        "created_at": datetime.utcnow(),
                        "is_read": False,
                    }
                )
        if doc.get("pothole_id"):
            await potholes_col().update_one(
                {"_id": ObjectId(doc["pothole_id"])},
                {"$set": {"is_repaired": True, "is_active": False, "repaired_at": datetime.utcnow()}}
            )

    await col.update_one({"_id": oid}, {"$set": updates})

    background_tasks.add_task(
        log_event, "verification", repair_id, "repair",
        {"score": verification_result["score"], "verified": verification_result["verified"]}
    )

    return {
        "repair_id": repair_id,
        "ai_verified": verification_result["verified"],
        "verification_score": verification_result["score"],
        "status": updates.get("status", doc["status"]),
        "message": "Repair verified successfully" if verification_result["verified"] else "Verification failed — rework required"
    }


@router.get("/")
async def list_repairs():
    col = repairs_col()
    cursor = col.find({}).sort("created_at", -1).limit(100)
    return [_out(d) async for d in cursor]
