import cv2
from ultralytics import YOLO

# Load the YOLOv8 nano model
# 'yolov8n.pt' is the smallest and fastest version
# Ultralytics will auto-download it on first run (~6MB)
model = YOLO('yolov8s.pt')
# Open the video file
# cv2.VideoCapture() can accept:
# - A file path (like we're doing now)
# - A number like 0 or 1 (for webcam)
# - An RTSP URL (for real CCTV cameras)
video_path = 'data/parking.mp4'
cap = cv2.VideoCapture(video_path)

# Check if video opened successfully
if not cap.isOpened():
    print("Error: Could not open video file")
    exit()

print("Video opened successfully!")
print(f"Total frames: {int(cap.get(cv2.CAP_PROP_FRAME_COUNT))}")
print(f"FPS: {cap.get(cv2.CAP_PROP_FPS)}")
print(f"Width: {int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}")
print(f"Height: {int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}")
# CLASS ID 2 = car, 3 = motorcycle, 5 = bus, 7 = truck
# YOLO is trained on COCO dataset which has 80 classes
# We only want to detect vehicles, not people or animals
VEHICLE_CLASSES = [2, 3, 5, 7]

while True:
    # Read one frame from the video
    # ret = True if frame was read successfully
    # frame = the actual image as a NumPy array
    ret, frame = cap.read()

    # If no more frames, restart video from beginning
    if not ret:
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        continue

    # Run YOLOv8 detection on this frame
    # verbose=False stops it from printing to console every frame
    results = model(frame, verbose=False)

    # Loop through each detected object
    for result in results:
        for box in result.boxes:

            # Get the class ID of detected object
            class_id = int(box.cls[0])

            # Skip if not a vehicle
            if class_id not in VEHICLE_CLASSES:
                continue

            # Get confidence score (0.0 to 1.0)
            confidence = float(box.conf[0])

            # Skip low confidence detections
            if confidence < 0.15:
                continue

            # Get bounding box coordinates
            # xyxy = [x1, y1, x2, y2] pixel coordinates
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            # Draw green rectangle around detected vehicle
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # Add label above the box
            label = f"Vehicle {confidence:.2f}"
            cv2.putText(frame, label, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    # Show the frame in a window
    display = cv2.resize(frame, (360, 640))
    cv2.imshow('Vehicle Detector', display)

    # Press 'q' to quit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Clean up
cap.release()
cv2.destroyAllWindows()
print("Detection stopped.")