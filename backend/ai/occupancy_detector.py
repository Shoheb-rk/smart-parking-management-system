import cv2
import json
import numpy as np
import requests
from ultralytics import YOLO

with open('backend/ai/slot_config.json', 'r') as f:
    config = json.load(f)

model = YOLO('yolov8s.pt')

VEHICLE_CLASSES = [2, 3, 5, 7]

STATUS_FREE     = "free"
STATUS_OCCUPIED = "occupied"
STATUS_RESERVED = "reserved"

COLOR_FREE     = (0, 255, 0)
COLOR_OCCUPIED = (0, 0, 255)
COLOR_RESERVED = (0, 255, 255)

API_URL = "http://127.0.0.1:8000"

slot_status          = {}
slot_occupied_frames = {}
slot_free_frames     = {}
last_sent_status     = {}

for slot in config['slots']:
    slot_status[slot['name']]          = STATUS_FREE
    slot_occupied_frames[slot['name']] = 0
    slot_free_frames[slot['name']]     = 0
    last_sent_status[slot['name']]     = None

print(f"Loaded {len(config['slots'])} parking slots")
print(f"Slot names: {list(slot_status.keys())}")

def calculate_iou(box1, box2):
    ix1 = max(box1[0], box2[0])
    iy1 = max(box1[1], box2[1])
    ix2 = min(box1[2], box2[2])
    iy2 = min(box1[3], box2[3])

    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0

    intersection = (ix2 - ix1) * (iy2 - iy1)
    box1_area    = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area    = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union        = box1_area + box2_area - intersection

    return intersection / union

def send_status_to_api(slot_name, status):
    if last_sent_status[slot_name] == status:
        return
    try:
        response = requests.post(
            f"{API_URL}/ai/update-slot",
            json={
                "slot_name": slot_name,
                "status":    status
            },
            timeout=2
        )
        if response.status_code == 200:
            result = response.json()
            if result.get("message") != "No change":
                print(
                    f"API Update: Slot {slot_name} "
                    f"→ {status} | {result.get('message')}"
                )
            last_sent_status[slot_name] = status
    except requests.exceptions.ConnectionError:
        print("Warning: Cannot connect to FastAPI")
    except requests.exceptions.Timeout:
        print(f"Warning: API timeout for slot {slot_name}")
    except Exception as e:
        print(f"Warning: API call failed: {e}")

bg_subtractor = cv2.createBackgroundSubtractorMOG2(
    history=200,
    varThreshold=70,
    detectShadows=True
)

video_path = config['video_path']
cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print("Error: Could not open video")
    exit()

display_w = config['display_size'][0]
display_h = config['display_size'][1]

cap_ref = cv2.VideoCapture(config['video_path'])
cap_ref.set(cv2.CAP_PROP_POS_FRAMES, 60)
ret_ref, ref_frame = cap_ref.read()
cap_ref.release()

if ret_ref:
    ref_frame = cv2.resize(ref_frame, (display_w, display_h))
    ref_gray  = cv2.cvtColor(ref_frame, cv2.COLOR_BGR2GRAY)
    for _ in range(50):
        bg_subtractor.apply(ref_frame)
    print("Background reference frame loaded")
else:
    ref_gray = None
    print("Warning: Could not load reference frame")

prev_frame = None

print("Starting occupancy detection...")
print("FastAPI will be updated in real time")
print("Press 'q' to quit")

while True:
    cap.grab()
    cap.grab()
    ret, frame = cap.retrieve()

    if not ret:
        print("Video ended")
        break

    display_frame = cv2.resize(frame, (display_w, display_h))
    fg_mask       = bg_subtractor.apply(display_frame)

    gray_frame = cv2.cvtColor(display_frame, cv2.COLOR_BGR2GRAY)
    if ref_gray is not None:
        frame_diff     = cv2.absdiff(ref_gray, gray_frame)
        _, diff_thresh = cv2.threshold(
            frame_diff, 50, 255, cv2.THRESH_BINARY
        )
        fg_mask = cv2.bitwise_or(fg_mask, diff_thresh)
    prev_frame = gray_frame

    results = model(display_frame, verbose=False)

    vehicle_boxes = []
    for result in results:
        for box in result.boxes:
            class_id   = int(box.cls[0])
            confidence = float(box.conf[0])
            if class_id in VEHICLE_CLASSES and confidence > 0.10:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                vehicle_boxes.append([x1, y1, x2, y2])

    for slot in config['slots']:
        name = slot['name']
        sx1  = slot['x1']
        sy1  = slot['y1']
        sx2  = slot['x2']
        sy2  = slot['y2']

        occupied_by_yolo = False
        occupied_by_bg   = False
        occupied_by_variance= False

        for vbox in vehicle_boxes:
            iou = calculate_iou([sx1, sy1, sx2, sy2], vbox)
            if iou > 0.3:
                occupied_by_yolo = True
                break

        slot_mask = fg_mask[sy1:sy2, sx1:sx2]

        _, slot_mask_clean = cv2.threshold(
            slot_mask, 200, 255, cv2.THRESH_BINARY
        )

        kernel = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE, (5, 5)
        )
        slot_mask_clean = cv2.morphologyEx(
            slot_mask_clean, cv2.MORPH_OPEN, kernel
        )

        total_pixels = slot_mask_clean.size
        if total_pixels > 0:
            white_pixels = cv2.countNonZero(slot_mask_clean)
            fill_ratio   = white_pixels / total_pixels
            if fill_ratio > 0.40:
                occupied_by_bg = True
        # Method 3 - Texture Variance Analysis
        # High variance = complex texture = car present
        # Works well for dark cars that blend with asphalt
        slot_gray     = gray_frame[sy1:sy2, sx1:sx2]
        slot_variance = np.var(slot_gray)
        var_threshold = slot.get('variance_threshold', 3000)

        if slot_variance > var_threshold:
            occupied_by_variance = True

        # Final decision with persistence
        if occupied_by_yolo or occupied_by_bg or occupied_by_variance:
       
            slot_occupied_frames[name] += 1
            slot_free_frames[name]      = 0
            if slot_occupied_frames[name] >= 3:
                slot_status[name] = STATUS_OCCUPIED
        else:
            slot_free_frames[name]      += 1
            slot_occupied_frames[name]   = 0
            if slot_free_frames[name] >= 30:
                slot_status[name] = STATUS_FREE

        send_status_to_api(name, slot_status[name])

        if slot_status[name] == STATUS_OCCUPIED:
            color = COLOR_OCCUPIED
        elif slot_status[name] == STATUS_RESERVED:
            color = COLOR_RESERVED
        else:
            color = COLOR_FREE

        cv2.rectangle(display_frame,
                     (sx1, sy1), (sx2, sy2), color, 2)
        cv2.putText(display_frame, name,
                   (sx1 + 5, sy1 + 20),
                   cv2.FONT_HERSHEY_SIMPLEX,
                   0.5, color, 2)

    free_count     = list(slot_status.values()).count(STATUS_FREE)
    occupied_count = list(slot_status.values()).count(STATUS_OCCUPIED)
    total          = len(slot_status)

    cv2.rectangle(display_frame,
                 (0, 0), (display_w, 40), (0, 0, 0), -1)
    cv2.putText(display_frame,
               f"Total:{total}  Free:{free_count}  "
               f"Occupied:{occupied_count}",
               (10, 25),
               cv2.FONT_HERSHEY_SIMPLEX,
               0.55, (255, 255, 255), 2)

    cv2.imshow('Parking Occupancy Detector', display_frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("Detection stopped.")
print("Final slot status:", slot_status)