
import os
import time
import threading
from datetime import datetime

import cv2
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from ultralytics import YOLO
from werkzeug.security import generate_password_hash, check_password_hash

from db import get_db_connection


# --------------------------------------------------
# APP CONFIGURATION
# --------------------------------------------------

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Existing models
model = YOLO(os.path.join(BASE_DIR, "yolo11n.pt"))

face_model_path = os.path.join(
    BASE_DIR,
    "face_detection_yunet_2026may.onnx"
)

face_model = None

if os.path.isfile(face_model_path):
    face_model = cv2.FaceDetectorYN.create(
        face_model_path,
        "",
        (320, 320),
        0.6,
        0.3,
        5000
    )
else:
    app.logger.warning(
        "YuNet model not found: %s", face_model_path
    )

camera = cv2.VideoCapture(0)

monitoring = False

people_count = 0
object_data = []
face_count = 0
face_data = []

previous_positions = {}
person_activities = {}
last_saved_activity = {}

alerts = []
last_alert_time = {}

last_detection_save = 0
detection_save_interval = 10

object_lock = threading.Lock()
count_lock = threading.Lock()
alert_lock = threading.Lock()
face_lock = threading.Lock()
activity_lock = threading.Lock()


# --------------------------------------------------
# DATABASE HELPERS
# --------------------------------------------------

def get_db():
    return get_db_connection()


def save_detections(objects):
    """Save a snapshot of detected object types to MySQL."""
    if not objects:
        return

    conn = None
    cursor = None

    try:
        conn = get_db()
        cursor = conn.cursor()

        for item in objects:
            confidence = (
                float(item["confidence"].replace("%", "")) / 100
            )

            cursor.execute(
                """
                INSERT INTO detections (object_name, confidence)
                VALUES (%s, %s)
                """,
                (item["object"], confidence)
            )

        conn.commit()

    except Exception:
        app.logger.exception("Failed to save detections")

        if conn and conn.is_connected():
            conn.rollback()

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


def save_activity(track_id, activity):
    """Save an activity only when that person's state changes."""
    conn = None
    cursor = None

    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO activities (activity_type, description)
            VALUES (%s, %s)
            """,
            (
                activity,
                f"Person ID {track_id} is {activity}"
            )
        )

        conn.commit()

    except Exception:
        app.logger.exception("Failed to save activity")

        if conn and conn.is_connected():
            conn.rollback()

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


def save_alert_to_db(message, severity="medium"):
    conn = None
    cursor = None

    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO alerts (message, severity)
            VALUES (%s, %s)
            """,
            (message, severity)
        )

        conn.commit()

    except Exception:
        app.logger.exception("Failed to save alert")

        if conn and conn.is_connected():
            conn.rollback()

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# --------------------------------------------------
# HOME
# --------------------------------------------------

@app.route("/")
def home():
    return jsonify({
        "status": "success",
        "message": "God Eye Backend is running!"
    })


# --------------------------------------------------
# SIGNUP
# --------------------------------------------------

@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}

    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({
            "success": False,
            "message": "Username and password are required"
        }), 400

    if len(password) < 8:
        return jsonify({
            "success": False,
            "message": "Password must be at least 8 characters"
        }), 400

    conn = None
    cursor = None

    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id FROM users WHERE username = %s",
            (username,)
        )

        if cursor.fetchone():
            return jsonify({
                "success": False,
                "message": "Username already exists"
            }), 409

        password_hash = generate_password_hash(password)

        cursor.execute(
            """
            INSERT INTO users (username, email, password_hash)
            VALUES (%s, NULL, %s)
            """,
            (username, password_hash)
        )

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Account created successfully"
        }), 201

    except Exception:
        app.logger.exception("Signup failed")

        if conn and conn.is_connected():
            conn.rollback()

        return jsonify({
            "success": False,
            "message": "Signup failed. Check backend logs."
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# --------------------------------------------------
# LOGIN
# --------------------------------------------------

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({
            "success": False,
            "message": "Username and password are required"
        }), 400

    conn = None
    cursor = None

    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT username, password_hash
            FROM users
            WHERE username = %s
            """,
            (username,)
        )

        user = cursor.fetchone()

        if user and check_password_hash(
            user["password_hash"], password
        ):
            return jsonify({
                "success": True,
                "message": "Login successful",
                "username": user["username"]
            })

        return jsonify({
            "success": False,
            "message": "Invalid username or password"
        }), 401

    except Exception:
        app.logger.exception("Login failed")

        return jsonify({
            "success": False,
            "message": "Login service unavailable"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# --------------------------------------------------
# SYSTEM STATUS
# --------------------------------------------------

@app.route("/api/status")
def status():
    conn = None
    cursor = None
    alert_count = 0

    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM alerts")
        alert_count = cursor.fetchone()[0]

    except Exception:
        app.logger.exception("Could not read alert count")

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()

    return jsonify({
        "system": "God Eye",
        "status": "Online",
        "monitoring": monitoring,
        "alerts": alert_count
    })


# --------------------------------------------------
# CURRENT DETECTION COUNT
# --------------------------------------------------

@app.route("/api/detections")
def detections():
    with count_lock:
        count = people_count

    return jsonify({"count": count})


# --------------------------------------------------
# CURRENT OBJECTS
# --------------------------------------------------

@app.route("/api/objects")
def get_objects():
    with object_lock:
        current_objects = object_data.copy()

    total = sum(item["count"] for item in current_objects)

    return jsonify({
        "total": total,
        "objects": current_objects
    })


# --------------------------------------------------
# SAVED DETECTION HISTORY
# --------------------------------------------------

@app.route("/api/detection-history")
def detection_history():
    conn = None
    cursor = None

    try:
        limit = request.args.get("limit", default=50, type=int)
        limit = max(1, min(limit, 200))

        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, object_name, confidence, created_at
            FROM detections
            ORDER BY id DESC
            LIMIT %s
            """,
            (limit,)
        )

        rows = cursor.fetchall()

        for row in rows:
            row["confidence"] = round(
                float(row["confidence"]) * 100, 1
            )
            if row["created_at"]:
                row["created_at"] = row[
                    "created_at"
                ].strftime("%Y-%m-%d %H:%M:%S")

        return jsonify({"detections": rows})

    except Exception:
        app.logger.exception("Could not load detection history")
        return jsonify({
            "success": False,
            "message": "Could not load detection history"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# --------------------------------------------------
# FACE DETECTION DATA
# --------------------------------------------------

@app.route("/api/faces")
def faces():
    with face_lock:
        count = face_count
        current_faces = face_data.copy()

    return jsonify({
        "count": count,
        "faces": current_faces
    })


# --------------------------------------------------
# SAVED ACTIVITY HISTORY
# --------------------------------------------------

@app.route("/api/activity")
def activity():
    conn = None
    cursor = None

    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, activity_type, description, created_at
            FROM activities
            ORDER BY id DESC
            LIMIT 50
            """
        )

        rows = cursor.fetchall()
        activities = []

        for row in rows:
            activities.append({
                "id": row["id"],
                "activity": row["description"],
                "type": row["activity_type"],
                "time": (
                    row["created_at"].strftime("%Y-%m-%d %H:%M:%S")
                    if row["created_at"] else None
                )
            })

        return jsonify({"activities": activities})

    except Exception:
        app.logger.exception("Could not load activities")
        return jsonify({
            "success": False,
            "message": "Could not load activities"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# --------------------------------------------------
# SAVED ALERT HISTORY
# --------------------------------------------------

@app.route("/api/alerts")
def get_alerts():
    conn = None
    cursor = None

    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, message, severity, created_at
            FROM alerts
            ORDER BY id DESC
            LIMIT 50
            """
        )

        rows = cursor.fetchall()
        result = []

        for row in rows:
            created = row["created_at"]

            result.append({
                "id": row["id"],
                "message": row["message"],
                "severity": row["severity"],
                "time": created.strftime("%H:%M:%S") if created else "",
                "date": created.strftime("%Y-%m-%d") if created else ""
            })

        return jsonify({"alerts": result})

    except Exception:
        app.logger.exception("Could not load alerts")
        return jsonify({
            "success": False,
            "message": "Could not load alerts"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# --------------------------------------------------
# CREATE ALERT WITH DUPLICATE SUPPRESSION
# --------------------------------------------------

def create_alert(message):
    current_time = datetime.now()

    with alert_lock:
        previous_time = last_alert_time.get(message)

        if previous_time:
            difference = (
                current_time - previous_time
            ).total_seconds()

            if difference < 10:
                return

        last_alert_time[message] = current_time

        alerts.append({
            "message": message,
            "time": current_time.strftime("%H:%M:%S"),
            "date": current_time.strftime("%Y-%m-%d")
        })

        if len(alerts) > 20:
            alerts.pop(0)

    save_alert_to_db(message, "medium")


# --------------------------------------------------
# CAMERA / YOLO / FACE PROCESSING
# --------------------------------------------------

def generate_frames():
    global people_count, object_data
    global face_count, face_data
    global last_detection_save

    while True:
        success, frame = camera.read()

        if not success:
            app.logger.warning("Could not read camera frame")
            time.sleep(0.2)
            continue

        if monitoring:
            results = model.track(
                frame,
                persist=True,
                verbose=False
            )

            result = results[0]
            current_count = 0
            current_objects = {}

            if result.boxes is not None:
                classes = (
                    result.boxes.cls.int().cpu().tolist()
                )
                confidences = result.boxes.conf.cpu().tolist()

                if result.boxes.id is not None:
                    track_ids = (
                        result.boxes.id.int().cpu().tolist()
                    )
                else:
                    track_ids = [None] * len(classes)

                for class_id, confidence, track_id in zip(
                    classes, confidences, track_ids
                ):
                    object_name = model.names[class_id]

                    if object_name not in current_objects:
                        current_objects[object_name] = {
                            "count": 0,
                            "confidence": 0
                        }

                    current_objects[object_name]["count"] += 1
                    current_objects[object_name]["confidence"] = max(
                        current_objects[object_name]["confidence"],
                        confidence
                    )

                    if object_name == "person":
                        current_count += 1

            frame = result.plot()

            # Track person movement
            if (
                result.boxes is not None
                and result.boxes.id is not None
            ):
                boxes = result.boxes.xyxy.cpu().numpy()
                ids = result.boxes.id.int().cpu().tolist()
                classes = result.boxes.cls.int().cpu().tolist()

                for box, track_id, class_id in zip(
                    boxes, ids, classes
                ):
                    if model.names[class_id] != "person":
                        continue

                    x1, y1, x2, y2 = map(int, box)

                    center_x = (x1 + x2) // 2
                    center_y = (y1 + y2) // 2
                    current_position = (center_x, center_y)

                    if track_id in previous_positions:
                        old_x, old_y = previous_positions[track_id]

                        distance = (
                            (center_x - old_x) ** 2
                            + (center_y - old_y) ** 2
                        ) ** 0.5

                        current_activity = (
                            "MOVING" if distance > 5
                            else "STATIONARY"
                        )
                    else:
                        distance = 0
                        current_activity = "NEW"

                    previous_positions[track_id] = current_position

                    with activity_lock:
                        old_activity = person_activities.get(track_id)
                        person_activities[track_id] = current_activity

                    cv2.putText(
                        frame,
                        f"ID: {track_id} | {current_activity}",
                        (x1, max(y1 - 10, 20)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 255, 0),
                        2
                    )

                    # Persist activity only on a state change
                    if last_saved_activity.get(track_id) != current_activity:
                        save_activity(track_id, current_activity)
                        last_saved_activity[track_id] = current_activity

                    if current_activity == "MOVING" and distance > 50:
                        create_alert(
                            f"Person ID {track_id} is moving"
                        )

            with count_lock:
                people_count = current_count

            new_object_data = []

            for name, data in current_objects.items():
                new_object_data.append({
                    "object": name,
                    "count": data["count"],
                    "confidence": (
                        f"{round(data['confidence'] * 100, 1)}%"
                    )
                })

            with object_lock:
                object_data = new_object_data

            # Save object snapshots every 10 seconds
            now = time.time()

            if now - last_detection_save >= detection_save_interval:
                save_detections(new_object_data)
                last_detection_save = now

        else:
            with count_lock:
                people_count = 0

            with object_lock:
                object_data = []

        # YuNet face detection remains active
        if face_model is not None:
            height, width = frame.shape[:2]
            face_model.setInputSize((width, height))

            _, detected_faces = face_model.detect(frame)
            current_faces = []

            if detected_faces is not None:
                for index, face in enumerate(detected_faces, start=1):
                    x, y, fw, fh = map(int, face[:4])

                    cv2.rectangle(
                        frame,
                        (x, y),
                        (x + fw, y + fh),
                        (0, 0, 255),
                        2
                    )

                    cv2.putText(
                        frame,
                        "Unknown Person",
                        (x, max(y - 10, 20)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (0, 0, 255),
                        2
                    )

                    current_faces.append({
                        "id": f"{index:03d}",
                        "person": "Unknown Person",
                        "status": "Unknown",
                        "confidence": (
                            f"{round(float(face[14]) * 100, 1)}%"
                        )
                    })

            with face_lock:
                face_count = len(current_faces)
                face_data = current_faces

        success, buffer = cv2.imencode(".jpg", frame)

        if not success:
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + buffer.tobytes()
            + b"\r\n"
        )


# --------------------------------------------------
# VIDEO FEED
# --------------------------------------------------

@app.route("/video_feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


# --------------------------------------------------
# START / STOP MONITORING
# --------------------------------------------------

@app.route("/api/start-monitoring", methods=["POST"])
def start_monitoring():
    global monitoring
    monitoring = True

    return jsonify({
        "success": True,
        "message": "Monitoring started"
    })


@app.route("/api/stop-monitoring", methods=["POST"])
def stop_monitoring():
    global monitoring
    monitoring = False

    return jsonify({
        "success": True,
        "message": "Monitoring stopped"
    })


# --------------------------------------------------
# START SERVER
# --------------------------------------------------

if __name__ == "__main__":
    app.run(
        debug=True,
        threaded=True,
        use_reloader=False
    )
