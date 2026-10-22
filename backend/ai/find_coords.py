import cv2

cap = cv2.VideoCapture('data/parking.mp4')

# Skip forward 2 seconds to avoid black intro frames
# FPS is ~30, so 2 seconds = 60 frames
cap.set(cv2.CAP_PROP_POS_FRAMES, 60)

ret, frame = cap.read()
cap.release()

if not ret:
    print("Could not read frame")
    exit()

# Resize for display
frame = cv2.resize(frame, (360, 640))

def click_event(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        print(f"Clicked: x={x}, y={y}")
        cv2.circle(frame, (x, y), 5, (0, 0, 255), -1)
        cv2.imshow('Find Coordinates', frame)

cv2.imshow('Find Coordinates', frame)
cv2.setMouseCallback('Find Coordinates', click_event)

print("Click TOP-LEFT then BOTTOM-RIGHT of each slot")
print("Press 'q' to quit")

cv2.waitKey(0)
cv2.destroyAllWindows()