"""Command-line dashcam runner for backend 1 AI detection engine."""

from __future__ import annotations

import argparse
from pathlib import Path

from ultralytics import YOLO

from image_detect import resolve_model_path
from video_detect import run_dashcam_detection


def process_video(video_path: str, sample_every_seconds: float = 2.0) -> dict:
    uploads_dir = Path(__file__).resolve().parent / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    model = YOLO(str(resolve_model_path()))
    result = run_dashcam_detection(
        model=model,
        video_path=Path(video_path),
        uploads_dir=uploads_dir,
        sample_every_seconds=sample_every_seconds,
    )
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RoadGuardian Dashcam Service")
    parser.add_argument(
        "--video",
        type=str,
        default=str(Path(__file__).resolve().parents[1] / "demo_media" / "road_video.mp4"),
    )
    parser.add_argument("--sample-seconds", type=float, default=2.0)
    args = parser.parse_args()

    output = process_video(args.video, args.sample_seconds)
    print(output)
