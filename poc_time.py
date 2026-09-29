import cv2
import numpy as np
import pytesseract
import os

img = cv2.imread("poc-shm/01-original.png")
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# The dates/times are at the top (y < 33).
crop = gray[0:35, 50:1500]

# Threshold to read text
_, thresh = cv2.threshold(crop, 150, 255, cv2.THRESH_BINARY_INV)
cv2.imwrite("poc-shm/debug-ocr-thresh.png", thresh)

# Use pytesseract to find dates
data = pytesseract.image_to_data(thresh, output_type=pytesseract.Output.DICT)

print("OCR Results:")
for i in range(len(data['text'])):
    text = data['text'][i].strip()
    if len(text) > 2:
        print(f"X={data['left'][i]+50}, Text='{text}', Conf={data['conf'][i]}")

# Also find long tick marks. The grid is below y=29. But there are small ticks at y=25 to 29.
# Let's check vertical lines.
edges = cv2.Canny(gray[20:40, 50:1500], 50, 150)
cv2.imwrite("poc-shm/debug-edges.png", edges)

lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=10, minLineLength=5, maxLineGap=2)
if lines is not None:
    print("Found some vertical ticks.")
    # Sort by X
    lines = sorted(lines, key=lambda l: l[0][0])
    # print(lines[:10])

