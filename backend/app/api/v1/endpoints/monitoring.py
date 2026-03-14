"""
Advanced monitoring endpoints for multi-source AI road issue detection and routing.
"""
import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from app.core.security import get_current_user, require_government
from app.schemas import MonitoringCaptureResponse
from app.services.monitoring_service import (
    get_contractor_suggestions,
    list_high_risk_alerts,
    list_issues,
    process_monitoring_capture,
)

router = APIRouter()


@router.post("/capture", response_model=MonitoringCaptureResponse)
async def capture_road_issue(
    file: UploadFile = File(...),
    source_type: str = Form("citizen_mobile"),
    latitude: float = Form(0.0),
    longitude: float = Form(0.0),
    district: Optional[str] = Form(None),
    road_name: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    upload_dir = os.path.join("uploads", "monitoring")
    os.makedirs(upload_dir, exist_ok=True)

    filename = f"{uuid.uuid4().hex}_{file.filename}"
    filepath = os.path.join(upload_dir, filename)
    contents = await file.read()
    with open(filepath, "wb") as stream:
        stream.write(contents)

    image_url = f"/uploads/monitoring/{filename}"
    payload = await process_monitoring_capture(
        image_path=filepath,
        image_url=image_url,
        source_type=source_type,
        latitude=latitude,
        longitude=longitude,
        submitted_by=str(current_user.get("id", "anonymous")),
        district_hint=district,
        road_hint=road_name,
    )
    return payload


@router.get("/issues")
async def monitoring_issues(
    limit: int = Query(100, ge=1, le=500),
    _: dict = Depends(get_current_user),
):
    docs = await list_issues(limit=limit)
    output = []
    for doc in docs:
        doc["id"] = str(doc.get("_id"))
        doc.pop("_id", None)
        output.append(doc)
    return output


@router.get("/alerts")
async def high_risk_alerts(
    limit: int = Query(50, ge=1, le=200),
    _: dict = Depends(get_current_user),
):
    docs = await list_high_risk_alerts(limit=limit)
    output = []
    for doc in docs:
        doc["id"] = str(doc.get("_id"))
        doc.pop("_id", None)
        output.append(doc)
    return output


@router.get("/contractor-suggestions")
async def contractor_suggestions(
    district: str = Query(...),
    state: str = Query(...),
    severity: str = Query("moderate"),
    limit: int = Query(5, ge=1, le=20),
    _: dict = Depends(require_government),
):
    suggestions = await get_contractor_suggestions(
        district=district,
        state=state,
        severity=severity,
        limit=limit,
    )
    return {
        "district": district,
        "state": state,
        "severity": severity,
        "suggestions": suggestions,
    }
