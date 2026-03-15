from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from ultralytics import YOLO


def calculate_severity(area: float) -> str:
    if area > 20000:
        return "HIGH"
    if area > 8000:
        return "MEDIUM"
    return "LOW"


def resolve_object_model_path() -> Path:
    """Locate yolov8n.pt (general object detection model)."""
    base_dir = Path(__file__).resolve().parent
    candidates = [
        base_dir / "models" / "yolov8n.pt",
        base_dir.parent / "models" / "yolov8n.pt",
        base_dir / "yolov8n.pt",
        base_dir.parent / "backend" / "yolov8n.pt",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("YOLOv8n object model not found (yolov8n.pt)")


def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unable to decode image data")
    return image


def save_image(image: np.ndarray, uploads_dir: Path, prefix: str) -> str:
    uploads_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    file_name = f"{prefix}_{timestamp}.jpg"
    file_path = uploads_dir / file_name
    cv2.imwrite(str(file_path), image)
    return file_name


def run_image_detection(
    model: YOLO,
    image: np.ndarray,
    object_model: YOLO | None = None,
) -> dict[str, Any]:
    """Run road-damage detection and optionally object detection simultaneously.

    When *object_model* is supplied the two models run together and their
    bounding boxes are merged onto a single annotated frame::

        object boxes  →  painted first
        road-damage boxes  →  painted on top

    *pothole_detected*, *severity*, and *confidence* are driven exclusively by
    the road-damage model so the API contract stays unchanged.
    """
    # ── Road-damage model (potholes / cracks) ──────────────────────────────
    road_results = model.predict(source=image, conf=0.25, imgsz=640, verbose=False)
    road_result = road_results[0]

    # ── Object model (people / vehicles / traffic) ─────────────────────────
    if object_model is not None:
        obj_results = object_model.predict(source=image, conf=0.25, imgsz=640, verbose=False)
        obj_result = obj_results[0]
        # Paint object boxes first, then road-damage boxes on top
        annotated = obj_result.plot()
        annotated = road_result.plot(img=annotated)
    else:
        annotated = road_result.plot()

    # ── Build detections list ───────────────────────────────────────────────
    detections: list[dict[str, Any]] = []
    best_confidence = 0.0
    best_severity = "LOW"
    severity_rank = {"LOW": 1, "MEDIUM": 2, "HIGH": 3}

    # Road-damage detections — drive severity / confidence
    for box in road_result.boxes:
        conf = float(box.conf.item())
        class_id = int(box.cls.item())
        x1, y1, x2, y2 = map(float, box.xyxy[0].tolist())
        area = max((x2 - x1) * (y2 - y1), 0.0)
        severity = calculate_severity(area)
        label = model.names.get(class_id, str(class_id))

        detections.append(
            {
                "label": str(label),
                "confidence": round(conf, 4),
                "bbox": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
                "area": round(area, 2),
                "severity": severity,
                "source": "road_model",
            }
        )

        if severity_rank[severity] > severity_rank[best_severity]:
            best_severity = severity
            best_confidence = conf
        elif severity == best_severity and conf > best_confidence:
            best_confidence = conf

    # Object detections — informational, no effect on severity
    if object_model is not None:
        for box in obj_result.boxes:
            conf = float(box.conf.item())
            class_id = int(box.cls.item())
            x1, y1, x2, y2 = map(float, box.xyxy[0].tolist())
            area = max((x2 - x1) * (y2 - y1), 0.0)
            label = object_model.names.get(class_id, str(class_id))

            detections.append(
                {
                    "label": str(label),
                    "confidence": round(conf, 4),
                    "bbox": [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
                    "area": round(area, 2),
                    "severity": "N/A",
                    "source": "object_model",
                }
            )

    road_detections = [d for d in detections if d.get("source") == "road_model"]
    return {
        "pothole_detected": len(road_detections) > 0,
        "severity": best_severity if road_detections else "LOW",
        "confidence": round(best_confidence, 4) if road_detections else 0.0,
        "detections": detections,
        "annotated_image": annotated,
    }


def resolve_model_path() -> Path:
    base_dir = Path(__file__).resolve().parent
    candidates = [
        base_dir / "models" / "YOLOv8_Small_RDD.pt",
        base_dir.parent / "models" / "YOLOv8_Small_RDD.pt",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("YOLO model not found at models/YOLOv8_Small_RDD.pt")


if __name__ == "__main__":
    root_dir = Path(__file__).resolve().parents[1]
    demo_image = root_dir / "demo_media" / "pothole1.jpg"
    uploads_dir = Path(__file__).resolve().parent / "uploads"

    if not demo_image.exists():
        raise FileNotFoundError(f"Demo image not found: {demo_image}")

    road_model = YOLO(str(resolve_model_path()))
    object_model = YOLO(str(resolve_object_model_path()))

    frame = cv2.imread(str(demo_image))
    if frame is None:
        raise ValueError(f"Unable to read image: {demo_image}")

    output = run_image_detection(road_model, frame, object_model=object_model)

    for det in output["detections"]:
        print(f"{det['label']} detected  (conf={det['confidence']:.2f}, source={det['source']})")

    saved_file = save_image(output["annotated_image"], uploads_dir, "image_detect")
    print(
        {
            "pothole_detected": output["pothole_detected"],
            "severity": output["severity"],
            "confidence": output["confidence"],
            "saved_file": str((uploads_dir / saved_file).resolve()),
        }
    )

    cv2.namedWindow("RoadGuardian AI", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("RoadGuardian AI", 1280, 720)
    cv2.imshow("RoadGuardian AI", output["annotated_image"])
    cv2.waitKey(0)
    cv2.destroyAllWindows()