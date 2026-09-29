import cv2
import numpy as np
import urllib.request
import hashlib
import json
import os
import datetime
from scipy.signal import find_peaks

# Create output dir
out_dir = "poc-shm"
os.makedirs(out_dir, exist_ok=True)

# 1. Download
img_url = "https://sos70.ru/provider.php?file=shm.jpg"
img_path = os.path.join(out_dir, "01-original.png")
urllib.request.urlretrieve(img_url, img_path)

with open(img_path, "rb") as f:
    img_bytes = f.read()

sha256 = hashlib.sha256(img_bytes).hexdigest()
size_bytes = len(img_bytes)
now_utc = datetime.datetime.utcnow().isoformat()

img = cv2.imread(img_path)
h_img, w_img, _ = img.shape

# 2. Geometry
# Find white borders
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
_, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
# horizontal sum
h_sum = np.sum(thresh, axis=1)
# vertical sum
v_sum = np.sum(thresh, axis=0)

# find strong peaks which are the borders
h_peaks, _ = find_peaks(h_sum, height=w_img*255*0.5)
v_peaks, _ = find_peaks(v_sum, height=h_img*255*0.5)

y_min, y_max = 33, 429 # Fallbacks
x_min, x_max = 52, 1488

if len(h_peaks) >= 2:
    y_min = h_peaks[0]
    y_max = h_peaks[-1]
if len(v_peaks) >= 2:
    x_min = v_peaks[0]
    x_max = v_peaks[-1]

overlay_geom = img.copy()
cv2.rectangle(overlay_geom, (x_min, y_min), (x_max, y_max), (0, 0, 255), 2)
cv2.imwrite(os.path.join(out_dir, "02-geometry-overlay.png"), overlay_geom)

# 3. Y-Calibration (Freq)
# We know ticks are every 4Hz from 0 to 40Hz.
# We will draw lines over Y to demonstrate calibration mapping
overlay_y = img.copy()
cv2.line(overlay_y, (0, y_min), (w_img, y_min), (0,255,0), 1)
cv2.putText(overlay_y, "0 Hz", (5, y_min), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0,255,0), 1)
cv2.line(overlay_y, (0, y_max), (w_img, y_max), (0,255,0), 1)
cv2.putText(overlay_y, "40 Hz", (5, y_max), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0,255,0), 1)
cv2.imwrite(os.path.join(out_dir, "03-y-calibration.png"), overlay_y)

def y_to_hz(y):
    return (y - y_min) * 40.0 / (y_max - y_min)

# 4. X-Calibration (Time)
# In Tomsk, the full width is exactly 72 hours.
# Let's map x_max to current hour and x_min to current - 72h.
overlay_x = img.copy()
cv2.line(overlay_x, (x_min, 0), (x_min, h_img), (255,0,0), 1)
cv2.line(overlay_x, (x_max, 0), (x_max, h_img), (255,0,0), 1)
cv2.imwrite(os.path.join(out_dir, "04-x-calibration.png"), overlay_x)

def x_to_timestamp(x, current_dt):
    # Total width = 72 hours
    pixels_per_hour = (x_max - x_min) / 72.0
    hours_from_end = (x_max - x) / pixels_per_hour
    return current_dt - datetime.timedelta(hours=hours_from_end)

# Try to get the current timestamp from JSON to align perfectly
json_url = "https://ressonanciaschumannhoje.com/dados/schumann.json"
try:
    with urllib.request.urlopen(json_url) as url:
        json_data = json.loads(url.read().decode())
        current_time_str = json_data.get('timestamp') # "2026-09-29T13:09:36+00:00"
        json_f1 = json_data.get('fundamental', {}).get('pico_hz')
        json_f2 = json_data.get('harmonicas', {}).get('f2', {}).get('pico_hz')
        json_f3 = json_data.get('harmonicas', {}).get('f3', {}).get('pico_hz')
        current_dt = datetime.datetime.fromisoformat(current_time_str.replace('Z', '+00:00'))
except Exception as e:
    current_dt = datetime.datetime.utcnow()
    json_data = None

# 5, 6, 7. Detector
# We extract for 15, 30, 60 min.
# X width for 1 hour = (x_max - x_min)/72.0 ~ 19.9 px.
# 15 min = ~ 5 px, 30 min = ~10 px, 60 min = ~20 px
px_per_hour = (x_max - x_min)/72.0

# Extract intensity (luminance or V in HSV)
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
v_channel = hsv[:, :, 2]

# Search bands (in Hz, then mapped to Y)
# F1: 7-9 Hz
# F2: 13-15.5 Hz
# F3: 19-21.5 Hz
def hz_to_y(hz):
    return int(y_min + hz * (y_max - y_min) / 40.0)

b1 = (hz_to_y(7.0), hz_to_y(9.0))
b2 = (hz_to_y(13.0), hz_to_y(15.5))
b3 = (hz_to_y(19.0), hz_to_y(21.5))

def process_window(w_start, w_end):
    # take mean profile horizontally
    profile = np.mean(v_channel[:, w_start:w_end], axis=1)
    
    def find_peak(b_start, b_end):
        sub_prof = profile[b_start:b_end]
        bg = np.median(sub_prof)
        max_idx = np.argmax(sub_prof)
        peak_val = sub_prof[max_idx]
        
        # Confidence
        contrast = peak_val - bg
        if contrast < 10:
            return None, "low", contrast
        elif contrast < 30:
            return b_start + max_idx, "medium", contrast
        else:
            return b_start + max_idx, "high", contrast
            
    p1, c1, s1 = find_peak(b1[0], b1[1])
    p2, c2, s2 = find_peak(b2[0], b2[1])
    p3, c3, s3 = find_peak(b3[0], b3[1])
    
    return p1, c1, s1, p2, c2, s2, p3, c3, s3

results_all = {}
overlay_full = img.copy()

windows = [("15m", int(px_per_hour/4)), ("30m", int(px_per_hour/2)), ("60m", int(px_per_hour))]
for name, step in windows:
    res_list = []
    
    with open(os.path.join(out_dir, f"output-{name}.csv"), "w") as f_out:
        f_out.write("timestamp,f1_hz,f2_hz,f3_hz,confidence_f1,confidence_f2,confidence_f3,score_f1,score_f2,score_f3\n")
        
        for x_w in range(x_min, x_max, step):
            if x_w + step > x_max: break
            
            p1, c1, s1, p2, c2, s2, p3, c3, s3 = process_window(x_w, x_w+step)
            ts = x_to_timestamp(x_w + step//2, current_dt).isoformat()
            
            f1_h = round(y_to_hz(p1), 1) if p1 else "null"
            f2_h = round(y_to_hz(p2), 1) if p2 else "null"
            f3_h = round(y_to_hz(p3), 1) if p3 else "null"
            
            if name == "15m" and p1: cv2.circle(overlay_full, (x_w+step//2, p1), 1, (255,255,255), -1)
            if name == "15m" and p2: cv2.circle(overlay_full, (x_w+step//2, p2), 1, (0,255,255), -1)
            if name == "15m" and p3: cv2.circle(overlay_full, (x_w+step//2, p3), 1, (0,0,255), -1)
            
            f_out.write(f"{ts},{f1_h},{f2_h},{f3_h},{c1},{c2},{c3},{s1:.1f},{s2:.1f},{s3:.1f}\n")
            res_list.append({"ts": ts, "f1": f1_h, "c1": c1, "f2": f2_h, "f3": f3_h})
            
    results_all[name] = res_list

cv2.imwrite(os.path.join(out_dir, "05-detection-overlay.png"), overlay_full)

# 12. Validation Images (12 points)
# Generate from 15m run
val_indices = np.linspace(0, len(results_all["15m"])-1, 12, dtype=int)
for idx, vi in enumerate(val_indices):
    x_w = x_min + vi * int(px_per_hour/4)
    step = int(px_per_hour/4)
    crop = img[y_min:y_max, max(0, x_w-20):min(w_img, x_w+step+20)].copy()
    cv2.line(crop, (20, 0), (20, y_max-y_min), (255,255,255), 1) # center line
    cv2.imwrite(os.path.join(out_dir, f"validation-{idx+1:02d}.png"), crop)

# Calculate Metrics
metrics = {
    "hash": sha256,
    "size_bytes": size_bytes,
    "dimensions": f"{w_img}x{h_img}",
    "geometry": {"x_min": int(x_min), "x_max": int(x_max), "y_min": int(y_min), "y_max": int(y_max)},
    "y_resolution_hz_per_px": 40.0 / (y_max - y_min),
    "x_resolution_min_per_px": (72*60) / (x_max - x_min),
    "distributions": {}
}

for name in ["15m", "30m", "60m"]:
    data = results_all[name]
    valid_f1 = [float(d["f1"]) for d in data if d["f1"] != "null"]
    valid_f2 = [float(d["f2"]) for d in data if d["f2"] != "null"]
    valid_f3 = [float(d["f3"]) for d in data if d["f3"] != "null"]
    metrics["distributions"][name] = {
        "total": len(data),
        "f1_valid": len(valid_f1),
        "f1_min": min(valid_f1) if valid_f1 else None,
        "f1_max": max(valid_f1) if valid_f1 else None,
        "f1_med": np.median(valid_f1) if valid_f1 else None,
        "f2_valid": len(valid_f2),
        "f3_valid": len(valid_f3)
    }

with open(os.path.join(out_dir, "metrics.json"), "w") as f:
    json.dump(metrics, f, indent=2)

