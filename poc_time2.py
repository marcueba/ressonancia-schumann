import cv2
import numpy as np

img = cv2.imread("poc-shm/01-original.png")
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
y_min, y_max = 29, 430
x_min, x_max = 59, 1531

# A Tomsk spectrogram has vertical dashed or solid lines indicating hour marks or day marks.
# Usually, midnight is marked distinctly. Let's look at the top ticks (y=25 to 29).
crop_ticks = gray[25:31, x_min:x_max]

# Ticks are usually dark or light pixels
col_means = np.mean(crop_ticks, axis=0)

# We can find local extremas
import matplotlib.pyplot as plt
plt.plot(col_means)
plt.savefig("poc-shm/debug-ticks.png")

# Let's count the number of ticks
ticks = []
for i in range(1, len(col_means)-1):
    # Depending on background color, ticks might be drops or spikes.
    if col_means[i] > col_means[i-1] + 10 and col_means[i] > col_means[i+1] + 10:
        ticks.append(i + x_min)
    elif col_means[i] < col_means[i-1] - 10 and col_means[i] < col_means[i+1] - 10:
        ticks.append(i + x_min)

print(f"Found {len(ticks)} ticks.")
# If we have ~72 hours, we expect around 72 ticks.
if len(ticks) > 50:
    diffs = np.diff(ticks)
    med_diff = np.median(diffs)
    print(f"Median distance between ticks: {med_diff} px.")
    print(f"Estimated total hours: {(x_max - x_min) / med_diff}")

# Also in the grid (y=29 to 430), let's look for vertical grid lines
grid_crop = gray[100:300, x_min:x_max]
col_grid = np.mean(grid_crop, axis=0)
plt.clf()
plt.plot(col_grid)
plt.savefig("poc-shm/debug-grid.png")

