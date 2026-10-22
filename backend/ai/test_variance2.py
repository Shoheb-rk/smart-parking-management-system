import cv2
import json
import numpy as np

with open('backend/ai/slot_config.json', 'r') as f:
    config = json.load(f)

cap = cv2.VideoCapture(config['video_path'])

display_w = config['display_size'][0]
display_h = config['display_size'][1]

# Sample variance at multiple frames
sample_frames = [60, 100, 150, 200, 250, 300]

print("Variance across multiple frames:")
print(f"{'Slot':<8}", end="")
for f in sample_frames:
    print(f"  Frame{f:>4}", end="")
print()
print("-" * 80)

for slot in config['slots']:
    name = slot['name']
    sx1, sy1, sx2, sy2 = slot['x1'], slot['y1'], slot['x2'], slot['y2']
    print(f"Slot {name:<4}", end="")

    for frame_num in sample_frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
        ret, frame = cap.read()
        if ret:
            frame     = cv2.resize(frame, (display_w, display_h))
            gray      = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            slot_crop = gray[sy1:sy2, sx1:sx2]
            variance  = np.var(slot_crop)
            print(f"  {variance:>8.1f}", end="")
    print()

cap.release()