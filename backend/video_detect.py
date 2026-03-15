from ultralytics import YOLO
import cv2

model = YOLO(r"D:\Model Demo\models\YOLOv8_Small_RDD.pt")

cap = cv2.VideoCapture(r"D:\Model Demo\demo_media\road_video.mp4")

while True:

    ret, frame = cap.read()

    if not ret:
        break

    results = model(frame)

    annotated = results[0].plot()

    cv2.imshow("RoadGuardian AI Video Detection", annotated)

    if cv2.waitKey(1) == 27:
        break

cap.release()
cv2.destroyAllWindows()