from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from ultralytics import YOLO

from image_detect import run_image_detection, save_image, resolve_model_path, resolve_object_model_path
from webcam_detect import (
    _build_summary_panel,
    _draw_detection_overlay,
    _generate_complaint_id,
    _play_alert_async,
    send_government_report,
)


def run_dashcam_detection(
    model: YOLO,
    video_path: Path,
    uploads_dir: Path,
    sample_every_seconds: float = 2.0,
    object_model: YOLO | None = None,
) -> dict[str, Any]:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Unable to open video file: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 0:
        fps = 30.0

    frame_interval = max(int(round(fps * sample_every_seconds)), 1)

    frame_number = 0
    total_frames = 0
    sampled_frames = 0
    detections: list[dict[str, Any]] = []

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            total_frames += 1

            if frame_number % frame_interval != 0:
                frame_number += 1
                continue

            sampled_frames += 1
            output = run_image_detection(model, frame, object_model=object_model)

            if output["pothole_detected"]:
                saved_name = save_image(output["annotated_image"], uploads_dir, f"pothole_frame_{frame_number}")
                detections.append(
                    {
                        "frame_number": frame_number,
                        "severity": output["severity"],
                        "confidence": output["confidence"],
                        "annotated_frame": saved_name,
                    }
                )

            frame_number += 1
    finally:
        cap.release()

    return {
        "pothole_detected": len(detections) > 0,
        "total_frames": total_frames,
        "sampled_frames": sampled_frames,
        "sample_every_seconds": sample_every_seconds,
        "detections": detections,
    }


if __name__ == "__main__":
    root_dir    = Path(__file__).resolve().parents[1]
    demo_video  = root_dir / "demo_media" / "road_video.mp4"
    uploads_dir = Path(__file__).resolve().parent / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    road_model   = YOLO(str(resolve_model_path()))
    object_model = YOLO(str(resolve_object_model_path()))

    if not demo_video.exists():
        raise FileNotFoundError(f"Demo video not found: {demo_video}")

    cap = cv2.VideoCapture(str(demo_video))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {demo_video}")

    cv2.namedWindow("RoadGuardian AI", cv2.WINDOW_NORMAL)
    cv2.setWindowProperty("RoadGuardian AI", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

    fps             = cap.get(cv2.CAP_PROP_FPS) or 30.0
    alert_triggered     = False
    active_complaint_id = ""
    frame_number        = 0

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            output = run_image_detection(road_model, frame, object_model=object_model)

            # ── One-shot alert + government report ─────────────────────
            if output["pothole_detected"] and not alert_triggered:
                alert_triggered     = True
                active_complaint_id = _generate_complaint_id()
                threading.Thread(target=_play_alert_async, daemon=True).start()
                send_government_report(
                    active_complaint_id,
                    severity=output["severity"],
                    confidence=output["confidence"],
                )
                # Save annotated pothole frame with complaint ID in filename
                saved = save_image(
                    output["annotated_image"], uploads_dir,
                    f"pothole_{active_complaint_id.replace('-', '')}",
                )
                print(f"[DASHCAM] Pothole frame saved -> {uploads_dir / saved}")
                print(f"[DASHCAM] Complaint ID: {active_complaint_id}")
            if not output["pothole_detected"]:
                alert_triggered     = False
                active_complaint_id = ""

            # ── Compose final frame (video | summary panel) ────────────
            annotated = _draw_detection_overlay(
                output["annotated_image"], output, complaint_id=active_complaint_id
            )
            panel   = _build_summary_panel(
                annotated.shape[0], output, complaint_id=active_complaint_id
            )
            display = np.hstack((annotated, panel))

            cv2.imshow("RoadGuardian AI", display)
            frame_number += 1

            if cv2.waitKey(max(1, int(1000 / fps))) & 0xFF in (27, ord('q')):  # ESC or Q
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()