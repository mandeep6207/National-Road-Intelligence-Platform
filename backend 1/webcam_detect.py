from __future__ import annotations

import json
import random
import threading
from collections import Counter
from collections.abc import Iterator
from datetime import datetime, timezone
from math import hypot
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from ultralytics import YOLO

from image_detect import run_image_detection, save_image, resolve_model_path, resolve_object_model_path

PANEL_WIDTH = 380

# Dummy GPS / administrative location
DUMMY_LOCATION = {
    "latitude":  21.251,
    "longitude": 81.629,
    "state":     "Chhattisgarh",
    "district":  "Raipur",
    "pincode":   "492001",
}

# Global flag — set to False to stop the CLI webcam loop
camera_running = True

# Latest detection state — polled by /detect-webcam-status endpoint
_latest_detection: dict = {"pothole_detected": False}

# FastAPI webcam stream lifecycle flag. When False, the generator must stop and release the camera.
_webcam_stream_running = False

SNAPSHOT_DIR = Path(__file__).resolve().parent / "uploads" / "pothole_snaps"
REPORTS_DIR = Path(__file__).resolve().parent / "data"
REPORTS_FILE = REPORTS_DIR / "reports.json"
DUPLICATE_DISTANCE_THRESHOLD = 0.0005
DUPLICATE_TIME_LIMIT_SECONDS = 30
_report_store_lock = threading.Lock()

# Latest webcam-generated reports, newest first.
_detection_reports: list[dict[str, Any]] = []


def get_latest_detection() -> dict:
    """Return a snapshot of the last webcam detection result."""
    return dict(_latest_detection)


def get_detection_reports(limit: int | None = None) -> list[dict[str, Any]]:
    with _report_store_lock:
        reports = [dict(report) for report in _detection_reports]
    if limit is None or limit <= 0:
        return reports
    return reports[:limit]


def get_detection_report(report_id: str) -> dict[str, Any] | None:
    with _report_store_lock:
        for report in _detection_reports:
            if report.get("id") == report_id or report.get("complaint_id") == report_id:
                return dict(report)
    return None


def register_detection_report(report: dict[str, Any]) -> dict[str, Any]:
    normalized_report = _normalize_detection_report(report)

    if normalized_report["source"] == "citizen":
        duplicate_report = _find_duplicate_report(
            normalized_report["latitude"],
            normalized_report["longitude"],
            source="citizen",
            current_time=_parse_report_timestamp(normalized_report["timestamp"]),
        )
        if duplicate_report is not None:
            return duplicate_report

    _upsert_detection_report(normalized_report)
    return dict(normalized_report)


def stop_webcam_stream() -> dict:
    """Request the active /detect-webcam stream to stop immediately."""
    global _webcam_stream_running, _latest_detection
    _webcam_stream_running = False
    _latest_detection = {"pothole_detected": False}
    return {"stopped": True}


def capture_snapshot(frame: np.ndarray, complaint_id: str) -> str:
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"{complaint_id}_{timestamp}.jpg"
    file_path = SNAPSHOT_DIR / filename
    saved = cv2.imwrite(str(file_path), frame)
    if not saved:
        raise RuntimeError("Unable to save pothole snapshot")
    return f"/uploads/pothole_snaps/{filename}"


def _upsert_detection_report(report: dict[str, Any]) -> None:
    with _report_store_lock:
        for index, existing in enumerate(_detection_reports):
            if existing.get("id") == report.get("id"):
                _detection_reports[index] = report
                break
        else:
            _detection_reports.insert(0, report)

        _detection_reports.sort(key=lambda item: str(item.get("timestamp") or ""), reverse=True)
        _persist_detection_reports()


def _generate_complaint_id() -> str:
    """Generate a unique road-damage complaint ID (e.g. RG-52847)."""
    return "RG-" + str(random.randint(10000, 99999))


def _calculate_risk_score(confidence: float) -> int:
    bounded_confidence = max(0.0, min(float(confidence), 1.0))
    return int(round(bounded_confidence * 100))


def _normalize_detection_report(report: dict[str, Any]) -> dict[str, Any]:
    complaint_id = str(report.get("complaint_id") or report.get("id") or _generate_complaint_id())
    confidence = round(float(report.get("confidence") or 0.0), 3)
    risk_score = report.get("risk_score")
    image_path = report.get("image")

    return {
        "id": complaint_id,
        "complaint_id": complaint_id,
        "type": str(report.get("type") or "pothole"),
        "severity": str(report.get("severity") or "LOW").upper(),
        "risk_score": int(round(float(risk_score))) if risk_score is not None else _calculate_risk_score(confidence),
        "confidence": confidence,
        "latitude": float(report.get("latitude") or 0.0),
        "longitude": float(report.get("longitude") or 0.0),
        "state": str(report.get("state") or DUMMY_LOCATION["state"]),
        "district": str(report.get("district") or DUMMY_LOCATION["district"]),
        "pincode": str(report.get("pincode") or DUMMY_LOCATION["pincode"]),
        "road_name": str(report.get("road_name") or "Citizen reported road segment"),
        "timestamp": str(report.get("timestamp") or datetime.utcnow().isoformat()),
        "status": str(report.get("status") or "ASSIGNED_TO_AUTHORITY"),
        "source": str(report.get("source") or "citizen").strip().lower(),
        "image": str(image_path) if image_path else None,
    }


def _persist_detection_reports() -> None:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    temp_file = REPORTS_FILE.with_suffix(".tmp")
    with temp_file.open("w", encoding="utf-8") as handle:
        json.dump(_detection_reports, handle, indent=2)
    temp_file.replace(REPORTS_FILE)


def _load_persisted_reports() -> list[dict[str, Any]]:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    if not REPORTS_FILE.exists():
        REPORTS_FILE.write_text("[]\n", encoding="utf-8")
        return []

    try:
        raw_reports = json.loads(REPORTS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []

    if not isinstance(raw_reports, list):
        return []

    normalized_reports: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for raw_report in raw_reports:
        if not isinstance(raw_report, dict):
            continue
        normalized_report = _normalize_detection_report(raw_report)
        report_id = str(normalized_report.get("id") or "")
        if not report_id or report_id in seen_ids:
            continue
        seen_ids.add(report_id)
        normalized_reports.append(normalized_report)

    normalized_reports.sort(key=lambda item: str(item.get("timestamp") or ""), reverse=True)
    return normalized_reports


def _parse_report_timestamp(timestamp: str | None) -> datetime | None:
    if not timestamp:
        return None
    try:
        parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is not None:
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _find_duplicate_report(
    latitude: float,
    longitude: float,
    source: str = "citizen",
    current_time: datetime | None = None,
) -> dict[str, Any] | None:
    reference_time = current_time or datetime.utcnow()
    with _report_store_lock:
        candidate_reports = [dict(report) for report in _detection_reports]

    for report in candidate_reports:
        report_source = str(report.get("source") or "citizen").strip().lower()
        if report_source != source:
            continue

        report_latitude = report.get("latitude")
        report_longitude = report.get("longitude")
        if report_latitude is None or report_longitude is None:
            continue

        report_time = _parse_report_timestamp(str(report.get("timestamp") or ""))
        if report_time is not None:
            age_seconds = max(0.0, (reference_time - report_time).total_seconds())
            if age_seconds > DUPLICATE_TIME_LIMIT_SECONDS:
                continue

        distance = hypot(float(report_latitude) - latitude, float(report_longitude) - longitude)
        if distance <= DUPLICATE_DISTANCE_THRESHOLD:
            return dict(report)
    return None


_detection_reports = _load_persisted_reports()


def _build_detection_report(
    complaint_id: str,
    severity: str,
    confidence: float,
    detected_at: str,
    image_path: str,
) -> dict[str, Any]:
    return {
        "id": complaint_id,
        "complaint_id": complaint_id,
        "type": "pothole",
        "severity": severity,
        "risk_score": _calculate_risk_score(confidence),
        "confidence": round(float(confidence), 3),
        "latitude": DUMMY_LOCATION["latitude"],
        "longitude": DUMMY_LOCATION["longitude"],
        "state": DUMMY_LOCATION["state"],
        "district": DUMMY_LOCATION["district"],
        "pincode": DUMMY_LOCATION["pincode"],
        "road_name": "Live webcam monitored road",
        "timestamp": detected_at,
        "status": "AUTO GENERATED",
        "source": "citizen",
        "image": image_path,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Alert helpers  (imported by video_detect.py as well)
# ─────────────────────────────────────────────────────────────────────────────

def send_government_report(
    complaint_id: str,
    severity: str = "HIGH",
    confidence: float = 0.0,
) -> None:
    """Simulate transferring a full pothole report to the municipal authority."""
    loc = DUMMY_LOCATION
    payload = {
        "complaint_id": complaint_id,
        "type":         "pothole",
        "severity":     severity,
        "confidence":   round(confidence, 3),
        "latitude":     loc["latitude"],
        "longitude":    loc["longitude"],
        "state":        loc["state"],
        "district":     loc["district"],
        "pincode":      loc["pincode"],
        "reported_by":  "AI Dashcam",
        "status":       "AUTO GENERATED",
        "time":         datetime.now().isoformat(),
    }
    print(f"\n[GOVT REPORT] Sending road damage report to municipal authority...")
    print(f"[GOVT REPORT] Payload: {payload}")
    print("[GOVT REPORT] Report successfully transferred to authority\n")


def send_government_alert(severity: str = "HIGH", confidence: float = 0.0) -> None:
    """Backward-compatible alias — generates a fresh complaint ID internally."""
    send_government_report(_generate_complaint_id(), severity, confidence)


def _play_alert_async() -> None:
    """Play a 4-beep 1800 Hz / 700 ms high-alert siren (Windows only)."""
    try:
        import winsound
        for _ in range(4):
            winsound.Beep(1800, 700)
    except Exception:
        pass  # Non-Windows or no audio hardware — silent fallback


# ─────────────────────────────────────────────────────────────────────────────
# Visualisation helpers
# ─────────────────────────────────────────────────────────────────────────────

def _build_summary_panel(
    height: int,
    output: dict,
    complaint_id: str = "",
) -> np.ndarray:
    """Return a (height × PANEL_WIDTH) BGR side panel with counts and pothole report card."""
    panel = np.zeros((height, PANEL_WIDTH, 3), dtype=np.uint8)
    W   = PANEL_WIDTH
    loc = DUMMY_LOCATION

    road_dets = [d for d in output["detections"] if d.get("source") == "road_model"]
    obj_dets  = [d for d in output["detections"] if d.get("source") == "object_model"]

    road_counts = Counter(d["label"] for d in road_dets)
    obj_counts  = Counter(d["label"] for d in obj_dets)

    y = 30
    # ── Objects section ──────────────────────────────────────────────────────
    cv2.putText(panel, "DETECTED OBJECTS", (10, y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.60, (200, 200, 200), 1, cv2.LINE_AA)
    y += 24
    cv2.line(panel, (10, y), (W - 10, y), (80, 80, 80), 1)
    y += 16
    if obj_counts:
        for label, count in sorted(obj_counts.items()):
            cv2.putText(panel, f"{label:<16}: {count}", (10, y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.54, (50, 220, 50), 1, cv2.LINE_AA)
            y += 22
    else:
        cv2.putText(panel, "  (none)", (10, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.50, (120, 120, 120), 1, cv2.LINE_AA)
        y += 22

    # ── Road-damage counts ────────────────────────────────────────────────────
    y += 8
    cv2.putText(panel, "ROAD DAMAGE", (10, y),
                cv2.FONT_HERSHEY_SIMPLEX, 0.60, (200, 200, 200), 1, cv2.LINE_AA)
    y += 24
    cv2.line(panel, (10, y), (W - 10, y), (80, 80, 80), 1)
    y += 16
    if road_counts:
        for label, count in sorted(road_counts.items()):
            cv2.putText(panel, f"{label:<16}: {count}", (10, y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.54, (0, 100, 255), 1, cv2.LINE_AA)
            y += 22
    else:
        cv2.putText(panel, "  (none)", (10, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.50, (120, 120, 120), 1, cv2.LINE_AA)
        y += 22

    # ── Road-damage report card (only when pothole detected) ─────────────────
    if road_dets and complaint_id:
        sev  = output.get("severity", "LOW")
        conf = output.get("confidence", 0.0)

        y += 10
        cv2.rectangle(panel, (0, y - 14), (W, y + 16), (0, 0, 180), -1)
        cv2.putText(panel, "ROAD DAMAGE ALERT", (10, y + 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.60, (255, 255, 255), 1, cv2.LINE_AA)
        y += 32

        for k, v in [
            ("Complaint ID", complaint_id),
            ("Type",         "Pothole"),
            ("Severity",     sev),
            ("Confidence",   f"{conf:.2f}"),
        ]:
            cv2.putText(panel, f"{k:<14}: {v}", (10, y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.50, (220, 180, 0), 1, cv2.LINE_AA)
            y += 22

        y += 6
        cv2.putText(panel, "Location", (10, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.54, (200, 200, 200), 1, cv2.LINE_AA)
        y += 18
        cv2.line(panel, (10, y), (W - 10, y), (60, 60, 60), 1)
        y += 14
        for k, v in [
            ("Latitude",  str(loc["latitude"])),
            ("Longitude", str(loc["longitude"])),
            ("State",     loc["state"]),
            ("District",  loc["district"]),
            ("Pincode",   loc["pincode"]),
        ]:
            cv2.putText(panel, f"{k:<10}: {v}", (10, y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.48, (100, 200, 240), 1, cv2.LINE_AA)
            y += 20

    # ── Severity badge at bottom ──────────────────────────────────────────────
    sev       = output.get("severity", "LOW")
    conf      = output.get("confidence", 0.0)
    sev_color = {"HIGH": (0, 0, 200), "MEDIUM": (0, 140, 255), "LOW": (30, 160, 30)}.get(sev, (80, 80, 80))
    cv2.rectangle(panel, (10, height - 60), (W - 10, height - 12), sev_color, -1)
    cv2.putText(panel, f"Severity: {sev}   conf: {conf:.2f}",
                (16, height - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 1, cv2.LINE_AA)

    return panel


def _apply_pothole_banner(
    frame: np.ndarray,
    severity: str = "HIGH",
    confidence: float = 0.0,
    complaint_id: str = "",
) -> np.ndarray:
    """Overlay a 130 px red banner with complaint ID, severity, and location on *frame*."""
    loc = DUMMY_LOCATION
    h, w = frame.shape[:2]
    cv2.rectangle(frame, (0, 0), (w, 130), (0, 0, 210), -1)
    # Line 1 — main alert
    cv2.putText(frame, "[!] POTHOLE DETECTED  -  DRIVE CAREFULLY",
                (10, 34), cv2.FONT_HERSHEY_SIMPLEX, 1.0,
                (255, 255, 255), 3, cv2.LINE_AA)
    # Line 2 — severity + confidence + complaint ID
    cid_part = f"  |  ID: {complaint_id}" if complaint_id else ""
    cv2.putText(frame, f"Severity: {severity}    Confidence: {confidence:.2f}{cid_part}",
                (10, 68), cv2.FONT_HERSHEY_SIMPLEX, 0.70,
                (255, 220, 0), 2, cv2.LINE_AA)
    # Line 3 — location
    cv2.putText(
        frame,
        f"Lat: {loc['latitude']}  Lon: {loc['longitude']}  "
        f"{loc['district']}, {loc['state']}  PIN: {loc['pincode']}",
        (10, 106), cv2.FONT_HERSHEY_SIMPLEX, 0.57,
        (180, 240, 255), 1, cv2.LINE_AA,
    )
    return frame


def _draw_detection_overlay(
    frame: np.ndarray,
    output: dict,
    complaint_id: str = "",
) -> np.ndarray:
    """Apply road-clear or pothole-warning banner onto *frame*."""
    h, w = frame.shape[:2]
    road_dets = [d for d in output["detections"] if d.get("source") == "road_model"]

    if road_dets:
        frame = _apply_pothole_banner(
            frame,
            severity=output.get("severity", "HIGH"),
            confidence=output.get("confidence", 0.0),
            complaint_id=complaint_id,
        )
        y = 148
        for det in road_dets:
            cv2.putText(frame,
                        f"[RDD] {det['label']}  {det['confidence']:.2f}  sev={det['severity']}",
                        (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.58, (0, 80, 255), 2, cv2.LINE_AA)
            y += 26
    else:
        cv2.rectangle(frame, (0, 0), (w, 44), (30, 160, 30), -1)
        cv2.putText(frame, "ROAD CLEAR", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.85, (255, 255, 255), 2, cv2.LINE_AA)

    return frame


# ─────────────────────────────────────────────────────────────────────────────
# MJPEG streaming  (used by FastAPI /detect-webcam)
# ─────────────────────────────────────────────────────────────────────────────

def generate_webcam_stream(
    model: YOLO,
    camera_index: int = 0,
    object_model: YOLO | None = None,
) -> Iterator[bytes]:
    """Yield MJPEG boundary frames for the FastAPI /detect-webcam endpoint.

    The stream stops naturally when the HTTP client disconnects (the generator
    is no longer iterated), triggering the finally block which releases the camera.
    """
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        raise RuntimeError("Unable to open webcam")

    global _webcam_stream_running
    _webcam_stream_running = True

    alert_triggered = False
    active_complaint_id = ""
    active_snapshot_path = ""
    active_report: dict[str, Any] | None = None

    try:
        while _webcam_stream_running:
            ok, frame = cap.read()
            if not ok:
                break

            output = run_image_detection(model, frame, object_model=object_model)

            # ── One-shot alert + report + auto-save per detection event ──
            if output["pothole_detected"] and not alert_triggered:
                alert_triggered = True
                detected_at = datetime.now().isoformat()
                duplicate_report = _find_duplicate_report(
                    DUMMY_LOCATION["latitude"],
                    DUMMY_LOCATION["longitude"],
                    source="citizen",
                    current_time=_parse_report_timestamp(detected_at),
                )

                if duplicate_report:
                    active_report = duplicate_report
                    active_complaint_id = str(duplicate_report.get("id") or duplicate_report.get("complaint_id") or "")
                    active_snapshot_path = str(duplicate_report.get("image") or "")
                else:
                    active_complaint_id = _generate_complaint_id()
                    threading.Thread(target=_play_alert_async, daemon=True).start()
                    send_government_report(
                        active_complaint_id,
                        severity=output["severity"],
                        confidence=output["confidence"],
                    )
                    active_snapshot_path = capture_snapshot(frame, active_complaint_id)
                    active_report = _build_detection_report(
                        active_complaint_id,
                        severity=output["severity"],
                        confidence=output["confidence"],
                        detected_at=detected_at,
                        image_path=active_snapshot_path,
                    )
                    _upsert_detection_report(active_report)
            if not output["pothole_detected"]:
                alert_triggered = False
                active_complaint_id = ""
                active_snapshot_path = ""
                active_report = None

            # ── Update shared status for /detect-webcam-status endpoint ──────
            global _latest_detection
            loc = DUMMY_LOCATION
            if output["pothole_detected"] and active_complaint_id:
                if active_report is None:
                    active_report = get_detection_report(active_complaint_id)

                _latest_detection = {
                    "pothole_detected": True,
                    "complaint_id":     active_complaint_id,
                    "severity":         (active_report or {}).get("severity", output.get("severity", "LOW")),
                    "risk_score":       (active_report or {}).get("risk_score", _calculate_risk_score(output.get("confidence", 0.0))),
                    "confidence":       (active_report or {}).get("confidence", round(float(output.get("confidence", 0.0)), 3)),
                    "latitude":         loc["latitude"],
                    "longitude":        loc["longitude"],
                    "state":            loc["state"],
                    "district":         loc["district"],
                    "pincode":          loc["pincode"],
                    "image":            (active_report or {}).get("image", active_snapshot_path),
                    "source":           (active_report or {}).get("source", "citizen"),
                    "timestamp":        (active_report or {}).get("timestamp", datetime.now().isoformat()),
                }
            else:
                _latest_detection = {"pothole_detected": False}

            annotated = _draw_detection_overlay(
                output["annotated_image"], output, complaint_id=active_complaint_id
            )
            panel    = _build_summary_panel(
                annotated.shape[0], output, complaint_id=active_complaint_id
            )
            combined = np.hstack((annotated, panel))

            success, buffer = cv2.imencode(".jpg", combined)
            if not success:
                continue

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
            )
    finally:
        _webcam_stream_running = False
        cap.release()


# ─────────────────────────────────────────────────────────────────────────────
# CLI entry-point  (python webcam_detect.py)
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    road_model   = YOLO(str(resolve_model_path()))
    object_model = YOLO(str(resolve_object_model_path()))

    camera = cv2.VideoCapture(0)
    if not camera.isOpened():
        raise RuntimeError("Unable to open webcam")

    _uploads = Path(__file__).resolve().parent / "uploads"
    _uploads.mkdir(parents=True, exist_ok=True)

    # Fullscreen window
    cv2.namedWindow("RoadGuardian AI", cv2.WINDOW_NORMAL)
    cv2.setWindowProperty("RoadGuardian AI", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

    camera_running      = True
    alert_triggered     = False
    active_complaint_id = ""

    try:
        while camera_running:
            ok, frame = camera.read()
            if not ok:
                break

            output = run_image_detection(road_model, frame, object_model=object_model)

            # ── One-shot sound + report + auto-save ────────────────────
            if output["pothole_detected"] and not alert_triggered:
                alert_triggered     = True
                active_complaint_id = _generate_complaint_id()
                threading.Thread(target=_play_alert_async, daemon=True).start()
                send_government_report(
                    active_complaint_id,
                    severity=output["severity"],
                    confidence=output["confidence"],
                )
                saved = save_image(
                    output["annotated_image"], _uploads,
                    f"pothole_{active_complaint_id.replace('-', '')}",
                )
                print(f"[WEBCAM] Frame saved -> {_uploads / saved}")
                print(f"[WEBCAM] \u26a0 POTHOLE DETECTED\n"
                      f"         Report generated and sent to authority\n"
                      f"         Complaint ID: {active_complaint_id}")
            if not output["pothole_detected"]:
                alert_triggered     = False
                active_complaint_id = ""

            # ── Compose final display (video frame | summary panel) ────
            annotated = _draw_detection_overlay(
                output["annotated_image"], output, complaint_id=active_complaint_id
            )
            panel   = _build_summary_panel(
                annotated.shape[0], output, complaint_id=active_complaint_id
            )
            display = np.hstack((annotated, panel))

            cv2.imshow("RoadGuardian AI", display)

            key = cv2.waitKey(1) & 0xFF
            if key == 27 or key == ord('q'):   # ESC or Q to quit
                camera_running = False
    finally:
        camera.release()
        cv2.destroyAllWindows()