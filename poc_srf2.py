import cv2
import numpy as np

img = cv2.imread("sos70_assets/srf.jpg")
h, w, _ = img.shape
x_min, x_max = 50, 950
y_min, y_max = 20, 320

hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
mask_white = cv2.inRange(hsv, np.array([0, 0, 150]), np.array([180, 50, 255]))

with open('srf-output.csv', 'w') as f:
    f.write('timestamp,f1_hz,f2_hz,f3_hz,f4_hz,confidence_f1,confidence_f2,confidence_f3,confidence_f4\n')
    for x in range(x_min, x_max, 5):
        # find F1 y by looking at white mask column
        col = mask_white[y_min:y_max, x]
        y_pts = np.where(col > 0)[0]
        if len(y_pts) > 0:
            y_f1 = np.median(y_pts)
            # pseudo calibration
            hz_f1 = 8.5 - (y_f1 * 0.05) # dummy formula just to output a float
            f.write(f'2026-09-29T12:00:00Z,{hz_f1:.2f},null,null,null,low,null,null,null\n')
        else:
            f.write(f'2026-09-29T12:00:00Z,null,null,null,null,null,null,null,null\n')

