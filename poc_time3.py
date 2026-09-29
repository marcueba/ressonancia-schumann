import cv2
import datetime
import os

img = cv2.imread("poc-shm/01-original.png")
x_min, x_max = 59, 1531
width = x_max - x_min
# If 72h = 1472 px, 24h = 490 px.
# Let's mark x1 = 59 + 250 (day 1), x2 = x1 + 490.
x1 = 309
x2 = 799

# These are our manual anchors
overlay = img.copy()
cv2.line(overlay, (x1, 0), (x1, img.shape[0]), (0, 0, 255), 2)
cv2.putText(overlay, "Anchor 1: 00:00 TLT", (x1+5, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,255), 1)

cv2.line(overlay, (x2, 0), (x2, img.shape[0]), (0, 0, 255), 2)
cv2.putText(overlay, "Anchor 2: 00:00 TLT", (x2+5, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,255), 1)

cv2.imwrite("poc-shm/06-time-validation.png", overlay)

# Calculate duration
px_diff = x2 - x1
hours = 24.0
px_per_hour = px_diff / hours
total_hours = width / px_per_hour

print(f"Anchors: {x1}, {x2}")
print(f"Pixels for 24h: {px_diff}")
print(f"Total hours calculated: {total_hours}")

