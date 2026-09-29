from PIL import Image

img = Image.open("poc-validation/shm.jpg")
pixels = img.load()
width, height = img.size

# Scan the middle row to find left and right bounds of the graph frame
# The frame is usually a distinct line (often white or black).
y_mid = height // 2
x_left = 0
x_right = width - 1

for x in range(width):
    if pixels[x, y_mid] == (0,0,0) or pixels[x, y_mid] == (255,255,255) or pixels[x,y_mid][0] < 10:
        # Just print colors
        pass

# Let's just sample a few pixels to understand the background color and border
print("Middle row samples:")
for x in range(0, 200, 10):
    print(f"X={x}, Color={pixels[x, y_mid]}")

for x in range(width-100, width, 10):
    print(f"X={x}, Color={pixels[x, y_mid]}")

print("Middle column samples:")
x_mid = width // 2
for y in range(0, 100, 5):
    print(f"Y={y}, Color={pixels[x_mid, y]}")
for y in range(height-100, height, 5):
    print(f"Y={y}, Color={pixels[x_mid, y]}")

