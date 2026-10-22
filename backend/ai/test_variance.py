import cv2
import json
import numpy as np

# Load config
with open('backend/ai/slot_config.json', 'r') as f:
    config = json.load(f)

# Open video and skip to a good frame
cap = cv2.VideoCapture(config['video_path'])
cap.set(cv2.CAP_PROP_POS_FRAMES, 60)
ret, frame = cap.read()
cap.release()

# Resize to display size
display_w = config['display_size'][0]
display_h = config['display_size'][1]
frame = cv2.resize(frame, (display_w, display_h))

# Convert to grayscale for variance analysis
gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

print("Slot Variance Analysis:")
print("=" * 45)
print(f"{'Slot':<8} {'Variance':>12} {'Expected':>12}")
print("-" * 45)

for slot in config['slots']:
    name = slot['name']
    sx1  = slot['x1']
    sy1  = slot['y1']
    sx2  = slot['x2']
    sy2  = slot['y2']

    # Crop slot region
    slot_crop = gray[sy1:sy2, sx1:sx2]

    # Calculate variance
    variance = np.var(slot_crop)

    # Expected status based on what we know
    expected = "OCCUPIED" if name in ['60', '58'] else "FREE"

    print(f"Slot {name:<4} {variance:>12.1f} {expected:>12}")

print("=" * 45)
print("\nIf variance works:")
print("  Occupied slots should show HIGH variance (>1000)")
print("  Free slots should show LOW variance (<1000)")