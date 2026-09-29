from PIL import Image
from PIL.ExifTags import TAGS

try:
    img = Image.open('poc-shm/01-original.png') # actually a jpeg
    exif_data = img.getexif()
    if not exif_data:
        print("No EXIF data found.")
    else:
        for tag_id in exif_data:
            tag = TAGS.get(tag_id, tag_id)
            data = exif_data.get(tag_id)
            print(f"{tag:25}: {data}")
except Exception as e:
    print(f"Error: {e}")
