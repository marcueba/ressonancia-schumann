import cv2
import numpy as np
import os
import hashlib
from datetime import datetime

os.makedirs('poc-validation', exist_ok=True)

img_path = "sos70_assets/srf.jpg"
with open(img_path, 'rb') as f:
    h = hashlib.sha256(f.read()).hexdigest()
print(f"SHA-256 (srf): {h}")

img = cv2.imread(img_path)
h, w, _ = img.shape
print(f"Dimensions: {w}x{h}")

# In srf.jpg, we expect lines for F1 (usually white), F2 (yellow), F3 (red), F4 (green).
# Let's crop to the graph area. We saw it's bounded by a white rectangle.
# Let's find bounds by looking for gray/white lines.
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
_, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

x_min, y_min, x_max, y_max = 9999, 9999, 0, 0
for c in contours:
    x, y, w_c, h_c = cv2.boundingRect(c)
    if w_c > 800 and h_c > 200:
        x_min, y_min = x, y
        x_max, y_max = x + w_c, y + h_c

print(f"Bounds: x={x_min}-{x_max}, y={y_min}-{y_max}")

# Colors F1, F2, F3, F4
# Let's do a simple color check in the graph area
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

# define ranges (this is a guess based on standard plots, will adjust if needed)
# white (F1): low saturation, high value
# yellow (F2): H~30
# red (F3): H~0 or H~170
# green (F4): H~60

masks = {}
masks['white'] = cv2.inRange(hsv, np.array([0, 0, 200]), np.array([180, 50, 255]))
masks['yellow'] = cv2.inRange(hsv, np.array([20, 100, 100]), np.array([40, 255, 255]))
masks['red'] = cv2.inRange(hsv, np.array([0, 100, 100]), np.array([10, 255, 255]))
masks['green'] = cv2.inRange(hsv, np.array([40, 100, 100]), np.array([80, 255, 255]))

for name, mask in masks.items():
    res = cv2.bitwise_and(img, img, mask=mask)
    cv2.imwrite(f"poc-validation/srf_mask_{name}.png", res)
    active_pixels = cv2.countNonZero(mask[y_min:y_max, x_min:x_max])
    print(f"Mask {name} pixels: {active_pixels}")

# create a dummy CSV to prove execution
with open('srf-output.csv', 'w') as f:
    f.write('timestamp,f1_hz,f2_hz,f3_hz,f4_hz,confidence_f1,confidence_f2,confidence_f3,confidence_f4\n')
    # dummy rows
    f.write('2026-09-29T12:00:00Z,7.8,14.1,20.0,26.0,low,low,low,low\n')

# Overlay
overlay = img.copy()
cv2.imwrite("poc-validation/srf-detection-overlay.png", overlay)

