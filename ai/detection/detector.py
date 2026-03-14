"""
National Road Intelligence Platform — AI Detection Module
Standalone pothole detection using YOLOv8

Usage:
    python ai/detection/detector.py --image path/to/image.jpg
    python ai/detection/detector.py --video path/to/video.mp4 --lat 28.61 --lng 77.20
"""

import argparse
import json
import os
import sys
import uuid
import time
from pathlib import Path
from typing import List, Dict, Optional


def detect_image(image_path: str, lat: float = 0.0, lng: float = 0.0) -> Dict:
    """Run pothole detection on an image file."""
    print(f"🔍 Analyzing image: {image_path}")

    try:
        from ultralytics import YOLO
        import cv2

        model_path = "ai/models/pothole_detector.pt"
        if Path(model_path).exists():
            model = YOLO(model_path)
            print(f"✅ Custom model loaded: {model_path}")
        else:
            model = YOLO("yolov8n.pt")
            print("⚠️  Using YOLOv8n pretrained (custom model not found)")

        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Cannot read image: {image_path}")

        start = time.time()
        results = model(img, conf=0.3, verbose=False)
        elapsed = (time.time() - start) * 1000

        detections = []
        for r in results:
            for box in r.boxes:
                conf = float(box.conf[0])
                x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]

                severity = (
                    "critical" if conf >= 0.75 else
                    "high" if conf >= 0.5 else
                    "moderate" if conf >= 0.3 else "low"
                )

                detections.append({
                    "pothole_id": f"DET-{uuid.uuid4().hex[:10].upper()}",
                    "confidence": round(conf, 4),
                    "severity": severity,
                    "bbox": {"x1": round(x1, 1), "y1": round(y1, 1), "x2": round(x2, 1), "y2": round(y2, 1)},
                    "latitude": lat,
                    "longitude": lng,
                    "width_cm": round(abs(x2 - x1) * 0.5, 1),
                    "depth_cm": round(min(abs(y2 - y1) * 0.3, 30), 1)
                })

        return {
            "mode": "yolov8",
            "model": model_path if Path(model_path).exists() else "yolov8n",
            "image": image_path,
            "processing_time_ms": round(elapsed, 1),
            "total_detections": len(detections),
            "detections": detections
        }

    except ImportError:
        print("⚠️  ultralytics/cv2 not installed — using simulation mode")
    except Exception as e:
        print(f"⚠️  Detection error: {e} — using simulation mode")

    # Simulation fallback
    import random
    n = random.randint(1, 3)
    detections = []
    for _ in range(n):
        conf = random.uniform(0.45, 0.93)
        severity = "critical" if conf > 0.75 else "high" if conf > 0.5 else "moderate"
        detections.append({
            "pothole_id": f"SIM-{uuid.uuid4().hex[:10].upper()}",
            "confidence": round(conf, 4),
            "severity": severity,
            "bbox": {"x1": 100, "y1": 150, "x2": 250, "y2": 280},
            "latitude": lat,
            "longitude": lng,
            "width_cm": round(random.uniform(15, 80), 1),
            "depth_cm": round(random.uniform(3, 25), 1)
        })

    return {
        "mode": "simulation",
        "image": image_path,
        "processing_time_ms": 45.0,
        "total_detections": len(detections),
        "detections": detections
    }


def detect_video(video_path: str, lat: float = 0.0, lng: float = 0.0, max_frames: int = 30) -> Dict:
    """Extract frames from video and detect potholes in each."""
    print(f"🎥 Processing video: {video_path}")

    try:
        import cv2
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        step = max(1, total_frames // max_frames)

        print(f"   Total frames: {total_frames} | FPS: {fps} | Processing every {step} frames")

        all_detections = []
        frame_num = 0
        processed = 0

        os.makedirs("uploads/temp_frames", exist_ok=True)

        while cap.isOpened() and processed < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_num % step == 0:
                frame_path = f"uploads/temp_frames/frame_{frame_num:06d}.jpg"
                cv2.imwrite(frame_path, frame)
                result = detect_image(frame_path, lat, lng)
                all_detections.extend(result["detections"])
                os.remove(frame_path)
                processed += 1
                print(f"   Frame {frame_num}/{total_frames}: {len(result['detections'])} potholes")
            frame_num += 1

        cap.release()
        print(f"\n✅ Video processing complete: {len(all_detections)} total detections")
        return {
            "mode": "video",
            "video": video_path,
            "frames_processed": processed,
            "total_detections": len(all_detections),
            "detections": all_detections
        }

    except ImportError:
        print("cv2 not installed — simulating video analysis")
        import random
        detections = []
        for _ in range(random.randint(2, 8)):
            conf = random.uniform(0.45, 0.93)
            detections.append({
                "pothole_id": f"VID-{uuid.uuid4().hex[:10].upper()}",
                "confidence": round(conf, 4),
                "severity": "critical" if conf > 0.75 else "high",
                "latitude": lat, "longitude": lng
            })
        return {"mode": "simulation", "video": video_path, "total_detections": len(detections), "detections": detections}


def visualize_detections(image_path: str, detections: List[Dict], output_path: str = None):
    """Draw bounding boxes on image and save."""
    try:
        import cv2

        img = cv2.imread(image_path)
        if img is None:
            return

        colors = {"critical": (0, 0, 220), "high": (0, 100, 220), "moderate": (0, 165, 255), "low": (0, 220, 0)}

        for det in detections:
            bbox = det.get("bbox", {})
            if not bbox:
                continue
            x1, y1, x2, y2 = int(bbox["x1"]), int(bbox["y1"]), int(bbox["x2"]), int(bbox["y2"])
            color = colors.get(det["severity"], (128, 128, 128))

            cv2.rectangle(img, (x1, y1), (x2, y2), color, 3)
            label = f"{det['severity'].upper()} {det['confidence']*100:.0f}%"
            cv2.putText(img, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

        out = output_path or image_path.replace(".jpg", "_detected.jpg").replace(".png", "_detected.png")
        cv2.imwrite(out, img)
        print(f"✅ Annotated image saved: {out}")

    except Exception as e:
        print(f"Visualization failed: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NRIP Pothole Detector")
    parser.add_argument("--image", help="Path to road image")
    parser.add_argument("--video", help="Path to dashcam video")
    parser.add_argument("--lat", type=float, default=28.6139, help="Latitude")
    parser.add_argument("--lng", type=float, default=77.2090, help="Longitude")
    parser.add_argument("--max-frames", type=int, default=30, help="Max frames to process from video")
    parser.add_argument("--visualize", action="store_true", help="Save annotated image")
    parser.add_argument("--output", default=None, help="Output JSON file")
    args = parser.parse_args()

    if args.image:
        result = detect_image(args.image, args.lat, args.lng)
        if args.visualize:
            visualize_detections(args.image, result["detections"])
    elif args.video:
        result = detect_video(args.video, args.lat, args.lng, args.max_frames)
    else:
        print("Demo mode — simulating detection...")
        result = detect_image("demo_road.jpg", 28.6139, 77.2090)

    print("\n" + "="*60)
    print("DETECTION RESULTS")
    print("="*60)
    print(json.dumps(result, indent=2))

    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
        print(f"\nResults saved to: {args.output}")
