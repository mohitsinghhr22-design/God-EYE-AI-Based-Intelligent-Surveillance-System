import cv2
from ultralytics import YOLO
import math

model = YOLO("yolo11n.pt")

camera = cv2.VideoCapture(0)

previous_positions = {}

while True:
    success, frame = camera.read()

    if not success:
        print("Camera access failed")
        break

    results = model.track(frame, persist=True)

    annotated_frame = results[0].plot()

    if results[0].boxes.id is not None:

        boxes = results[0].boxes.xyxy.cpu().numpy()
        ids = results[0].boxes.id.int().cpu().tolist()

        for box, track_id in zip(boxes, ids):

            x1, y1, x2, y2 = map(int, box)

            center_x = (x1 + x2) // 2
            center_y = (y1 + y2) // 2

            current_position = (center_x, center_y)

            if track_id in previous_positions:

                old_x, old_y = previous_positions[track_id]

                distance = math.sqrt(
                    (center_x - old_x) ** 2 +
                    (center_y - old_y) ** 2
                )

                if distance > 5:
                    status = "MOVING"
                else:
                    status = "STATIONARY"

            else:
                status = "NEW"

            previous_positions[track_id] = current_position

            cv2.putText(
                annotated_frame,
                f"ID: {track_id} | {status}",
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2
            )

    cv2.imshow(
        "GOD EYE - Object Tracking",
        annotated_frame
    )

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

camera.release()
cv2.destroyAllWindows()