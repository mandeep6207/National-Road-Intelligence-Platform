"""
Detection Celery Tasks — background AI processing
"""
import logging
from automation.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="automation.tasks.detection_tasks.process_image_detection",
                 max_retries=3)
def process_image_detection(self, image_path: str, lat: float, lng: float, job_id: str):
    """Process a single image detection job."""
    import asyncio
    try:
        logger.info(f"Processing detection job: {job_id}")
        # Run async detection in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        from backend.app.services.detection_service import run_detection_on_image
        detections = loop.run_until_complete(run_detection_on_image(image_path, lat, lng))
        loop.close()
        logger.info(f"✅ Job {job_id}: {len(detections)} potholes detected")
        return {"job_id": job_id, "detections": len(detections), "status": "completed"}
    except Exception as e:
        logger.error(f"Detection task failed: {e}")
        raise self.retry(exc=e, countdown=30)


@celery_app.task(name="automation.tasks.detection_tasks.process_video_detection")
def process_video_detection(video_path: str, lat: float, lng: float, job_id: str):
    """Process video detection job in background."""
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        from backend.app.services.detection_service import run_detection_on_video
        detections = loop.run_until_complete(run_detection_on_video(video_path, lat, lng))
        logger.info(f"✅ Video job {job_id}: {len(detections)} potholes detected")
        return {"job_id": job_id, "detections": len(detections), "status": "completed"}
    finally:
        loop.close()


@celery_app.task(name="automation.tasks.detection_tasks.process_cctv_stream")
def process_cctv_stream(stream_url: str, location_id: str, lat: float, lng: float):
    """Process CCTV traffic camera stream — captures frame every 30 seconds."""
    import cv2, time, asyncio
    logger.info(f"Starting CCTV processing for: {location_id}")

    cap = cv2.VideoCapture(stream_url)
    processed = 0
    max_captures = 5  # Process 5 frames per run

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        import os, uuid
        os.makedirs("uploads/cctv", exist_ok=True)

        for i in range(max_captures):
            ret, frame = cap.read()
            if not ret:
                break
            frame_path = f"uploads/cctv/{location_id}_{uuid.uuid4().hex[:8]}.jpg"
            cv2.imwrite(frame_path, frame)

            from backend.app.services.detection_service import run_detection_on_image
            dets = loop.run_until_complete(run_detection_on_image(frame_path, lat, lng))
            processed += len(dets)
            time.sleep(2)  # Rate limiting

    except Exception as e:
        logger.error(f"CCTV processing error: {e}")
    finally:
        cap.release()
        loop.close()

    return {"location_id": location_id, "potholes_detected": processed}
