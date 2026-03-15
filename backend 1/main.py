from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any

from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from ultralytics import YOLO

from image_detect import decode_image_bytes, run_image_detection, save_image, resolve_model_path, resolve_object_model_path
from video_detect import run_dashcam_detection
from webcam_detect import (
    generate_webcam_stream,
    get_detection_report,
    get_detection_reports,
    get_latest_detection,
    register_detection_report,
    stop_webcam_stream,
)

app = FastAPI(title="RoadGuardian AI Detection Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
(UPLOADS_DIR / "pothole_snaps").mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

MODEL_PATH = resolve_model_path()
OBJECT_MODEL_PATH = resolve_object_model_path()
model: YOLO | None = None
object_model: YOLO | None = None

users: dict[str, dict[str, str]] = {
    "citizen@test.com": {
        "password": "1234",
        "role": "citizen",
        "name": "Citizen User",
    },
    "authority@test.com": {
        "password": "1234",
        "role": "authority",
        "name": "Road Authority",
    },
    "admin@test.com": {
        "password": "1234",
        "role": "admin",
        "name": "System Admin",
    },
    "contractor@test.com": {
        "password": "1234",
        "role": "contractor",
        "name": "Road Contractor",
    },
}

SATELLITE_SIMULATION_ACTIVE = True
SIMULATED_SATELLITE_REPORTS: list[dict[str, Any]] = [
    {
        "id": "SAT-1001",
        "complaint_id": "SAT-1001",
        "type": "pothole",
        "source": "satellite",
        "severity": "HIGH",
        "risk_score": 90,
        "confidence": 0.90,
        "state": "Chhattisgarh",
        "district": "Raipur",
        "pincode": "492001",
        "road_name": "Ring Road",
        "latitude": 21.251,
        "longitude": 81.629,
        "timestamp": "2026-03-15T08:45:00",
        "status": "SIMULATED SATELLITE DETECTION",
        "image": "/uploads/satellite/pothole_sat1.svg",
    },
    {
        "id": "SAT-1002",
        "complaint_id": "SAT-1002",
        "type": "pothole",
        "source": "satellite",
        "severity": "MEDIUM",
        "risk_score": 65,
        "confidence": 0.65,
        "state": "Maharashtra",
        "district": "Mumbai City",
        "pincode": "400001",
        "road_name": "Eastern Express Highway",
        "latitude": 19.076,
        "longitude": 72.877,
        "timestamp": "2026-03-15T08:30:00",
        "status": "SIMULATED SATELLITE DETECTION",
        "image": "/uploads/satellite/pothole_sat2.svg",
    },
    {
        "id": "SAT-1003",
        "complaint_id": "SAT-1003",
        "type": "pothole",
        "source": "satellite",
        "severity": "LOW",
        "risk_score": 42,
        "confidence": 0.42,
        "state": "Andhra Pradesh",
        "district": "Visakhapatnam",
        "pincode": "530001",
        "road_name": "Beach Road",
        "latitude": 17.6868,
        "longitude": 83.2185,
        "timestamp": "2026-03-15T08:15:00",
        "status": "SIMULATED SATELLITE DETECTION",
        "image": "/uploads/satellite/pothole_sat3.svg",
    },
]

STATE_ADMIN_STATUS_KEYS = [
    "ASSIGNED_TO_AUTHORITY",
    "UNDER_PROGRESS",
    "VERIFIED_BY_CITIZEN_AUDITOR",
    "ESCALATED",
    "CLOSED",
]

authority_notifications_store: list[dict[str, Any]] = []


def get_model() -> YOLO:
    global model
    if model is None:
        model = YOLO(str(MODEL_PATH))
    return model


def get_object_model() -> YOLO:
    global object_model
    if object_model is None:
        object_model = YOLO(str(OBJECT_MODEL_PATH))
    return object_model


@app.on_event("startup")
def load_model_once() -> None:
    get_model()
    get_object_model()


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "RoadGuardian AI detection engine",
        "model": str(MODEL_PATH),
        "status": "ready",
    }


@app.post("/api/v1/auth/login")
async def login(data: dict[str, Any] = Body(...)) -> dict[str, Any]:
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    user = users.get(email)
    if not user or user["password"] != password:
        return {"success": False, "message": "Invalid credentials"}

    token = "demo-token"
    return {
        "success": True,
        "token": token,
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "user_id": email,
        "full_name": user["name"],
        "user": {
            "email": email,
            "name": user["name"],
            "role": user["role"],
        },
    }


@app.get("/api/v1/dashboard/stats")
async def dashboard_stats() -> dict[str, int]:
    return {
        "total_reports": 12,
        "resolved": 6,
        "pending": 6,
    }


@app.get("/api/v1/potholes/map-data")
async def pothole_map() -> list[dict[str, Any]]:
    reports = _get_all_reports(limit=100)
    if not reports:
        return [
            {
                "id": "RG-20491",
                "lat": 21.251,
                "lng": 81.629,
                "severity": "LOW",
                "timestamp": datetime.now().isoformat(),
                "image": None,
            }
        ]

    return [
        {
            "id": report["id"],
            "lat": report["latitude"],
            "lng": report["longitude"],
            "severity": report["severity"],
            "timestamp": report["timestamp"],
            "image": report.get("image"),
            "state": report.get("state"),
            "district": report.get("district"),
        }
        for report in reports
    ]


@app.get("/api/v1/reports")
async def pothole_reports(limit: int = 20) -> list[dict[str, Any]]:
    return _get_all_reports(limit=limit)


@app.post("/api/v1/citizen/reports")
async def create_citizen_report(data: dict[str, Any] = Body(...)) -> dict[str, Any]:
    return register_detection_report(
        {
            "id": data.get("id") or data.get("complaint_id"),
            "complaint_id": data.get("complaint_id") or data.get("id"),
            "type": data.get("type") or "pothole",
            "severity": _normalize_report_severity(data.get("severity")),
            "risk_score": data.get("risk_score"),
            "confidence": data.get("confidence"),
            "latitude": data.get("latitude"),
            "longitude": data.get("longitude"),
            "state": data.get("state"),
            "district": data.get("district"),
            "pincode": data.get("pincode"),
            "road_name": data.get("road_name"),
            "timestamp": data.get("timestamp"),
            "status": data.get("status") or "ASSIGNED_TO_AUTHORITY",
            "source": _normalize_report_source(data.get("source")) or "citizen",
            "image": data.get("image"),
        }
    )


def _normalize_report_source(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    if normalized in {"citizen", "satellite"}:
        return normalized
    return normalized


def _normalize_report_severity(value: str | None) -> str:
    normalized = str(value or "LOW").strip().lower()
    if normalized in {"critical", "high"}:
        return "HIGH"
    if normalized in {"moderate", "medium"}:
        return "MEDIUM"
    return "LOW"


def _get_satellite_reports() -> list[dict[str, Any]]:
    if not SATELLITE_SIMULATION_ACTIVE:
        return []
    return [dict(report) for report in SIMULATED_SATELLITE_REPORTS]


def _get_all_reports(limit: int | None = None) -> list[dict[str, Any]]:
    reports = get_detection_reports(limit=None) + _get_satellite_reports()
    reports.sort(key=lambda report: str(report.get("timestamp") or ""), reverse=True)
    if limit is None or limit <= 0:
        return reports
    return reports[:limit]


def _get_report_by_id(report_id: str) -> dict[str, Any] | None:
    for report in _get_all_reports(limit=None):
        if report.get("id") == report_id or report.get("complaint_id") == report_id:
            return dict(report)
    return None


def _filter_reports(
    reports: list[dict[str, Any]],
    source: str | None = None,
    state: str | None = None,
) -> list[dict[str, Any]]:
    normalized_source = _normalize_report_source(source)
    normalized_state = state.strip().lower() if state else None
    filtered: list[dict[str, Any]] = []

    for report in reports:
        report_source = str(report.get("source") or "citizen").strip().lower()
        report_state = str(report.get("state") or "").strip().lower()

        if normalized_source and report_source != normalized_source:
            continue
        if normalized_state and report_state != normalized_state:
            continue

        filtered.append(dict(report))

    return filtered


def _normalize_state_admin_status(raw_status: str | None) -> str:
    status = str(raw_status or "").strip().upper()
    if status in {"UNDER_PROGRESS", "REPAIR_IN_PROGRESS"}:
        return "UNDER_PROGRESS"
    if status == "VERIFIED_BY_CITIZEN_AUDITOR":
        return "VERIFIED_BY_CITIZEN_AUDITOR"
    if status == "ESCALATED":
        return "ESCALATED"
    if status in {"CLOSED", "REPAIR_COMPLETED"}:
        return "CLOSED"
    return "ASSIGNED_TO_AUTHORITY"


def _build_status_counter(reports: list[dict[str, Any]]) -> dict[str, int]:
    counts = {key: 0 for key in STATE_ADMIN_STATUS_KEYS}
    for report in reports:
        normalized = _normalize_state_admin_status(report.get("status"))
        counts[normalized] += 1
    return counts


def _count_received_today(reports: list[dict[str, Any]]) -> int:
    today = datetime.now().date()
    count = 0
    for report in reports:
        raw_ts = report.get("timestamp")
        if not raw_ts:
            continue
        try:
            dt = datetime.fromisoformat(str(raw_ts).replace("Z", "+00:00"))
        except ValueError:
            continue
        if dt.date() == today:
            count += 1
    return count


def _safe_report_road_name(report: dict[str, Any]) -> str:
    return str(report.get("road_name") or "Unknown Road").strip() or "Unknown Road"


def _road_health_score_for_reports(reports: list[dict[str, Any]]) -> tuple[float, int, int, str]:
    pothole_count = len(reports)
    unique_roads = len({_safe_report_road_name(report) for report in reports})
    scanned_segments = max(unique_roads * 18, pothole_count * 2, 1)
    raw_score = 100 - ((pothole_count / scanned_segments) * 100)
    score = round(max(0.0, min(100.0, raw_score)), 1)

    density = pothole_count / scanned_segments
    if density > 0.18:
        density_level = "critical"
    elif density > 0.11:
        density_level = "moderate"
    else:
        density_level = "good"

    return score, pothole_count, scanned_segments, density_level


def _state_admin_bucket_metrics(bucket_reports: list[dict[str, Any]]) -> dict[str, Any]:
    status_breakdown = _build_status_counter(bucket_reports)
    received_today = _count_received_today(bucket_reports)
    road_health_score, pothole_count, scanned_segments, density_level = _road_health_score_for_reports(bucket_reports)

    under_progress = status_breakdown["UNDER_PROGRESS"]
    pending = status_breakdown["ASSIGNED_TO_AUTHORITY"] + status_breakdown["ESCALATED"]
    completed = status_breakdown["CLOSED"] + status_breakdown["VERIFIED_BY_CITIZEN_AUDITOR"]
    assigned = pending + under_progress

    return {
        "total_complaints": len(bucket_reports),
        "received_today": received_today,
        "assigned": assigned,
        "pending": pending,
        "under_progress": under_progress,
        "completed": completed,
        "road_health_score": road_health_score,
        "pothole_count": pothole_count,
        "scanned_segments": scanned_segments,
        "density_level": density_level,
        "status_breakdown": status_breakdown,
    }


def _group_reports_by_key(reports: list[dict[str, Any]], key: str) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for report in reports:
        value = str(report.get(key) or f"Unknown {key.title()}").strip() or f"Unknown {key.title()}"
        grouped[value].append(report)
    return grouped


@app.get("/api/v1/admin/detected-issues")
async def admin_detected_issues(source: str | None = None) -> list[dict[str, Any]]:
    reports = _get_all_reports(limit=200)
    return _filter_reports(reports, source=source)


@app.get("/api/v1/authority/detected-road-issues")
async def authority_detected_road_issues(state: str, source: str | None = None) -> list[dict[str, Any]]:
    reports = _get_all_reports(limit=200)
    return _filter_reports(reports, source=source, state=state)


@app.get("/api/v1/reports/{report_id}")
async def pothole_report_detail(report_id: str) -> dict[str, Any]:
    report = _get_report_by_id(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@app.get("/api/v1/citizen/stats")
async def citizen_stats() -> dict[str, Any]:
    return {
        "reports_submitted": 5,
        "verified_repairs": 2,
    }


@app.get("/api/v1/citizen/leaderboard")
async def leaderboard(limit: int = 8) -> list[dict[str, Any]]:
    sample = [
        {"name": "Citizen A", "score": 120},
        {"name": "Citizen B", "score": 90},
    ]
    return sample[: max(limit, 0)]


@app.get("/api/v1/citizen/notifications")
async def notifications(limit: int = 8) -> list[dict[str, Any]]:
    sample = [
        {
            "message": "Pothole reported successfully",
            "time": datetime.now().isoformat(),
        }
    ]
    return sample[: max(limit, 0)]


@app.get("/api/v1/state-admin/stats")
async def state_admin_stats() -> dict[str, Any]:
    reports = _get_all_reports(limit=1000)
    by_state = _group_reports_by_key(reports, "state")

    states: list[dict[str, Any]] = []
    for state_name, state_reports in by_state.items():
        metrics = _state_admin_bucket_metrics(state_reports)
        states.append(
            {
                "state": state_name,
                **metrics,
            }
        )

    states.sort(key=lambda item: item["total_complaints"], reverse=True)
    totals = _state_admin_bucket_metrics(reports)

    return {
        "generated_at": datetime.now().isoformat(),
        "states": states,
        "totals": totals,
    }


@app.get("/api/v1/state-admin/district-stats")
async def state_admin_district_stats(state: str) -> dict[str, Any]:
    reports = _filter_reports(_get_all_reports(limit=1000), state=state)
    by_district = _group_reports_by_key(reports, "district")

    districts: list[dict[str, Any]] = []
    for district_name, district_reports in by_district.items():
        metrics = _state_admin_bucket_metrics(district_reports)
        districts.append(
            {
                "district": district_name,
                **metrics,
            }
        )

    districts.sort(key=lambda item: item["total_complaints"], reverse=True)
    summary = _state_admin_bucket_metrics(reports)

    return {
        "generated_at": datetime.now().isoformat(),
        "state": state,
        "districts": districts,
        "summary": summary,
    }


@app.post("/api/v1/state-admin/send-reminder")
async def state_admin_send_reminder(data: dict[str, Any] = Body(...)) -> dict[str, Any]:
    state = str(data.get("state") or "Unknown State").strip() or "Unknown State"
    district = str(data.get("district") or "Unknown District").strip() or "Unknown District"

    pending_repairs_raw = data.get("pending_repairs")
    pending_repairs = int(pending_repairs_raw) if isinstance(pending_repairs_raw, int | float | str) and str(pending_repairs_raw).strip().isdigit() else None

    if pending_repairs is None:
        district_reports = _filter_reports(_get_all_reports(limit=1000), state=state)
        pending_repairs = sum(
            1
            for report in district_reports
            if str(report.get("district") or "").strip().lower() == district.lower()
            and _normalize_state_admin_status(report.get("status")) in {"ASSIGNED_TO_AUTHORITY", "ESCALATED"}
        )

    authority_name = str(data.get("authority") or f"{district} District Authority").strip() or f"{district} District Authority"
    now = datetime.now().isoformat()
    notification = {
        "id": f"REM-{int(datetime.now().timestamp() * 1000)}",
        "type": "state_admin_reminder",
        "title": "Reminder from State Admin",
        "message": f"Reminder: {pending_repairs} pending pothole repairs in {district} district",
        "state": state,
        "district": district,
        "pending_repairs": pending_repairs,
        "authority": authority_name,
        "created_at": now,
        "is_read": False,
    }
    authority_notifications_store.insert(0, notification)

    return {
        "success": True,
        "message": "Reminder Sent Successfully",
        "notification": notification,
    }


@app.get("/api/v1/authority/notifications")
async def authority_notifications(limit: int = 20) -> list[dict[str, Any]]:
    capped_limit = max(limit, 0)
    return authority_notifications_store[:capped_limit]


@app.post("/detect-image")
async def detect_image(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.content_type or not file.content_type.lower().startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty")

    try:
        image = decode_image_bytes(image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    result = run_image_detection(get_model(), image, object_model=get_object_model())

    original_name = save_image(image, UPLOADS_DIR, "original")
    detected_name = save_image(result["annotated_image"], UPLOADS_DIR, "detected")

    return {
        "pothole_detected": result["pothole_detected"],
        "severity": result["severity"],
        "confidence": result["confidence"],
        "detections": [
            {"label": detection["label"], "confidence": detection["confidence"]}
            for detection in result["detections"]
        ],
        "original_image_url": f"/uploads/{original_name}",
        "detected_image_url": f"/uploads/{detected_name}",
    }


@app.post("/detect-dashcam")
async def detect_video(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.content_type or not file.content_type.lower().startswith("video/"):
        raise HTTPException(status_code=400, detail="Please upload a video file")

    video_bytes = await file.read()
    if not video_bytes:
        raise HTTPException(status_code=400, detail="Uploaded video file is empty")

    suffix = Path(file.filename or "dashcam.mp4").suffix or ".mp4"
    with NamedTemporaryFile(delete=False, suffix=suffix, dir=UPLOADS_DIR) as temp_video:
        temp_video.write(video_bytes)
        temp_path = Path(temp_video.name)

    try:
        result = run_dashcam_detection(
            model=get_model(),
            video_path=temp_path,
            uploads_dir=UPLOADS_DIR,
            sample_every_seconds=2.0,
            object_model=get_object_model(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        temp_path.unlink(missing_ok=True)

    response_detections = []
    for detection in result["detections"]:
        response_detections.append(
            {
                "frame_number": detection["frame_number"],
                "severity": detection["severity"],
                "confidence": detection["confidence"],
                "annotated_frame_url": f"/uploads/{detection['annotated_frame']}",
            }
        )

    return {
        "pothole_detected": result["pothole_detected"],
        "sample_every_seconds": result["sample_every_seconds"],
        "total_frames": result["total_frames"],
        "sampled_frames": result["sampled_frames"],
        "detections": response_detections,
    }


@app.get("/detect-webcam")
def detect_webcam() -> StreamingResponse:
    stream = generate_webcam_stream(get_model(), camera_index=0, object_model=get_object_model())
    return StreamingResponse(stream, media_type="multipart/x-mixed-replace; boundary=frame")


@app.get("/detect-webcam-status")
def detect_webcam_status() -> dict:
    """Return the latest detection result as JSON (polled by the frontend)."""
    return get_latest_detection()


@app.post("/detect-webcam-stop")
def detect_webcam_stop() -> dict:
    """Force-stop the active webcam stream and release capture."""
    return stop_webcam_stream()