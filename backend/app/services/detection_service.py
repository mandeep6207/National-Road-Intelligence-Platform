"""
AI Detection Service — YOLOv8 pothole detection
Falls back to simulation mode if model not available
"""
import os
import uuid
import logging
import asyncio
from typing import List, Dict
from pathlib import Path

logger = logging.getLogger(__name__)

# Try to load YOLOv8 model
_model = None

def get_model():
    global _model
    if _model is not None:
        return _model
    try:
        from ultralytics import YOLO
        model_path = os.getenv("YOLO_MODEL_PATH", "ai/models/pothole_detector.pt")
        if Path(model_path).exists():
            _model = YOLO(model_path)
            logger.info(f"✅ YOLOv8 model loaded from {model_path}")
        else:
            # Use pretrained yolov8n as fallback
            _model = YOLO("yolov8n.pt")
            logger.warning("⚠️  Custom model not found, using YOLOv8n pretrained")
    except Exception as e:
        logger.warning(f"⚠️  YOLO not available: {e}. Using simulation mode.")
        _model = None
    return _model


SEVERITY_MAP = {
    (0.0, 0.3): "low",
    (0.3, 0.5): "moderate",
    (0.5, 0.75): "high",
    (0.75, 1.01): "critical"
}

def confidence_to_severity(confidence: float) -> str:
    for (low, high), severity in SEVERITY_MAP.items():
        if low <= confidence < high:
            return severity
    return "moderate"


def estimate_dimensions(bbox: dict) -> dict:
    """Estimate physical dimensions from bounding box pixels."""
    w_px = abs(bbox.get("x2", 0) - bbox.get("x1", 0))
    h_px = abs(bbox.get("y2", 0) - bbox.get("y1", 0))
    # Rough scale: 1 pixel ≈ 0.5 cm for road surface images
    return {
        "width_cm": round(w_px * 0.5, 1),
        "depth_cm": round(min(h_px * 0.3, 30), 1),
        "area_sqcm": round(w_px * h_px * 0.25, 1)
    }


async def run_detection_on_image(
    image_path: str,
    lat: float = 0.0,
    lng: float = 0.0
) -> List[Dict]:
    """Run pothole detection on a single image."""
    model = get_model()
    detections = []

    if model is not None:
        try:
            import cv2
            import numpy as np

            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Cannot read image: {image_path}")

            results = model(img, conf=0.3, verbose=False)

            for r in results:
                for box in r.boxes:
                    confidence = float(box.conf[0])
                    x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]
                    bbox = {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
                    dims = estimate_dimensions(bbox)
                    severity = confidence_to_severity(confidence)

                    detections.append({
                        "pothole_id": f"DET-{uuid.uuid4().hex[:10].upper()}",
                        "confidence": round(confidence, 4),
                        "severity": severity,
                        "bbox": bbox,
                        "latitude": lat,
                        "longitude": lng,
                        **dims
                    })
            return detections

        except Exception as e:
            logger.error(f"Detection error: {e}")

    # ── Simulation fallback ───────────────────────────────────────────────
    return _simulate_detections(lat, lng)


async def run_detection_on_video(
    video_path: str,
    lat: float = 0.0,
    lng: float = 0.0,
    max_frames: int = 30
) -> List[Dict]:
    """Extract frames from video and run detection."""
    all_detections = []
    seen_ids = set()

    try:
        import cv2
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        step = max(1, total_frames // max_frames)
        frame_num = 0

        # Save temp frames
        temp_dir = "uploads/temp_frames"
        os.makedirs(temp_dir, exist_ok=True)

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if frame_num % step == 0:
                frame_path = f"{temp_dir}/frame_{frame_num}.jpg"
                cv2.imwrite(frame_path, frame)
                dets = await run_detection_on_image(frame_path, lat, lng)

                # Deduplicate by proximity
                for det in dets:
                    key = det["severity"]
                    if key not in seen_ids:
                        seen_ids.add(det["pothole_id"])
                        all_detections.append(det)

                # Cleanup temp frame
                try:
                    os.remove(frame_path)
                except:
                    pass
            frame_num += 1

        cap.release()

    except Exception as e:
        logger.error(f"Video processing error: {e}")
        all_detections = _simulate_detections(lat, lng, count=3)

    return all_detections


def _simulate_detections(lat: float, lng: float, count: int = 2) -> List[Dict]:
    """Generate realistic simulated detections for demo mode."""
    import random
    severities = ["critical", "high", "moderate", "low"]
    detections = []
    for i in range(count):
        conf = random.uniform(0.45, 0.95)
        severity = random.choice(severities[:3])
        detections.append({
            "pothole_id": f"SIM-{uuid.uuid4().hex[:10].upper()}",
            "confidence": round(conf, 4),
            "severity": severity,
            "bbox": {"x1": 100+i*20, "y1": 150+i*10, "x2": 200+i*20, "y2": 250+i*10},
            "latitude": lat + random.uniform(-0.001, 0.001),
            "longitude": lng + random.uniform(-0.001, 0.001),
            "width_cm": round(random.uniform(15, 80), 1),
            "depth_cm": round(random.uniform(3, 25), 1),
            "area_sqcm": round(random.uniform(200, 5000), 1)
        })
    return detections
