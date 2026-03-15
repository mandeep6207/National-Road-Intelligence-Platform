"""
_setup_services.py  –  Auto-creates the services/ package on first run.
Imported at the top of main.py before any services.* imports.
"""
import os
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_SVC  = _HERE / "services"

_FILES = {
    "__init__.py": "",

    "severity_engine.py": '''\
def calculate_severity(area: float) -> str:
    if area > 20000:
        return "HIGH"
    elif area > 8000:
        return "MEDIUM"
    return "LOW"

SEVERITY_WEIGHTS = {"HIGH": 1.0, "MEDIUM": 0.6, "LOW": 0.3}

def calculate_risk_score(confidence: float, severity: str) -> float:
    weight = SEVERITY_WEIGHTS.get(severity, 0.3)
    return round(confidence * weight, 4)
''',

    "dna_service.py": '''\
import hashlib
import math
from typing import Dict

_dna_store: Dict[str, str] = {}
_location_store: list = []

def generate_dna(latitude: float, longitude: float, severity: str) -> str:
    raw = f"{latitude}{longitude}{severity}"
    return hashlib.sha256(raw.encode()).hexdigest()

def _haversine_meters(lat1, lon1, lat2, lon2) -> float:
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def check_duplicate(latitude: float, longitude: float, dna: str):
    if dna in _dna_store:
        return _dna_store[dna]
    for (lat, lng, cid, _) in _location_store:
        if _haversine_meters(latitude, longitude, lat, lng) <= 20:
            return cid
    return None

def store_dna(dna: str, complaint_id: str, latitude: float, longitude: float):
    _dna_store[dna] = complaint_id
    _location_store.append((latitude, longitude, complaint_id, dna))

def get_all_detections():
    return list(_location_store)
''',

    "geo_service.py": '''\
INDIA_REGIONS = [
    {"state": "Chhattisgarh", "district": "Raipur", "pincode": "492001",
     "lat_min": 21.1, "lat_max": 21.4, "lon_min": 81.5, "lon_max": 81.8},
    {"state": "Maharashtra", "district": "Nagpur", "pincode": "440001",
     "lat_min": 21.0, "lat_max": 21.3, "lon_min": 79.0, "lon_max": 79.3},
    {"state": "Delhi", "district": "New Delhi", "pincode": "110001",
     "lat_min": 28.4, "lat_max": 28.8, "lon_min": 76.8, "lon_max": 77.4},
    {"state": "Karnataka", "district": "Bengaluru", "pincode": "560001",
     "lat_min": 12.8, "lat_max": 13.1, "lon_min": 77.4, "lon_max": 77.8},
    {"state": "Tamil Nadu", "district": "Chennai", "pincode": "600001",
     "lat_min": 12.9, "lat_max": 13.2, "lon_min": 80.1, "lon_max": 80.4},
]

DEFAULT_REGION = {"state": "Chhattisgarh", "district": "Raipur", "pincode": "492001"}

def reverse_geocode(latitude: float, longitude: float) -> dict:
    for region in INDIA_REGIONS:
        if (region["lat_min"] <= latitude <= region["lat_max"] and
                region["lon_min"] <= longitude <= region["lon_max"]):
            return {"state": region["state"], "district": region["district"],
                    "pincode": region["pincode"]}
    return DEFAULT_REGION
''',

    "complaint_service.py": '''\
import random
from datetime import datetime
from typing import Dict, Any, List

_complaints: Dict[str, Any] = {}

AUTHORITY_MAP = {
    "HIGH": "PWD Emergency Response Team",
    "MEDIUM": "Municipal Road Maintenance",
    "LOW": "Local Ward Office",
}

def generate_complaint_id() -> str:
    return f"RG-{random.randint(10000, 99999)}"

def create_complaint(complaint_id: str, latitude: float, longitude: float,
                     severity: str, image_path: str, state: str,
                     district: str, pincode: str) -> Dict[str, Any]:
    complaint = {
        "complaint_id": complaint_id,
        "latitude": latitude,
        "longitude": longitude,
        "severity": severity,
        "image_path": image_path,
        "state": state,
        "district": district,
        "pincode": pincode,
        "authority": AUTHORITY_MAP.get(severity, "Local Ward Office"),
        "status": "OPEN",
        "created_at": datetime.utcnow().isoformat(),
    }
    _complaints[complaint_id] = complaint
    return complaint

def get_complaint(complaint_id: str):
    return _complaints.get(complaint_id)

def get_all_complaints() -> List[Dict[str, Any]]:
    return list(_complaints.values())
''',

    "detection_service.py": '''\
from pathlib import Path
import cv2
import numpy as np
from ultralytics import YOLO

from .severity_engine import calculate_severity, calculate_risk_score

_model = None

def get_model() -> YOLO:
    global _model
    if _model is None:
        model_path = Path(__file__).resolve().parents[2] / "models" / "YOLOv8_Small_RDD.pt"
        if not model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_path}")
        _model = YOLO(str(model_path))
    return _model

def run_detection(image_bytes: bytes):
    model = get_model()
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Unable to decode image")
    results = model(img, conf=0.25, imgsz=640)
    detections = []
    best_severity = "LOW"
    best_confidence = 0.0
    annotated_img = results[0].plot()
    for r in results:
        for box in r.boxes:
            conf = float(box.conf.item())
            cls = int(box.cls.item())
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            area = (x2 - x1) * (y2 - y1)
            severity = calculate_severity(area)
            label = model.names.get(cls, str(cls))
            detections.append({
                "label": label,
                "confidence": round(conf, 4),
                "severity": severity,
                "area": round(area, 2),
                "bbox": [round(x1,1), round(y1,1), round(x2,1), round(y2,1)],
            })
            severity_order = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
            if severity_order[severity] > severity_order[best_severity]:
                best_severity = severity
                best_confidence = conf
            elif severity == best_severity and conf > best_confidence:
                best_confidence = conf
    risk_score = calculate_risk_score(best_confidence, best_severity) if detections else 0.0
    return {
        "detections": detections,
        "severity": best_severity if detections else "LOW",
        "risk_score": risk_score,
        "annotated_img": annotated_img,
        "original_img": img,
        "pothole_detected": len(detections) > 0,
    }
''',
}


def _bootstrap():
    _SVC.mkdir(exist_ok=True)
    for fname, content in _FILES.items():
        fpath = _SVC / fname
        if not fpath.exists():
            fpath.write_text(content, encoding="utf-8")


_bootstrap()
