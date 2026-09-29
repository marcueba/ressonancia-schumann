import urllib.request
import hashlib
import os
import json
from PIL import Image, ImageDraw

# 1. Baixar imagem real
img_url = "https://sos70.ru/provider.php?file=shm.jpg"
img_path = "poc-validation/shm.jpg"

print("Baixando imagem...")
urllib.request.urlretrieve(img_url, img_path)

with open(img_path, "rb") as f:
    img_bytes = f.read()
    
h = hashlib.sha256(img_bytes).hexdigest()
size = len(img_bytes)

img = Image.open(img_path)
width, height = img.size

print(f"Hash: {h}")
print(f"Size: {size} bytes")
print(f"Dimensions: {width}x{height}")

# Vamos assumir por tentativa e erro (ou padrão conhecido de Tomsk):
# A imagem tem 1024x1024 ou 1540x460.
# O gráfico em si geralmente ocupa uma sub-região.
# Ex: x de 100 a 1400, y de 50 a 400.

# 12. Comparar com fonte atual
json_url = "https://ressonanciaschumannhoje.com/dados/schumann.json"
try:
    with urllib.request.urlopen(json_url) as url:
        data = json.loads(url.read().decode())
        print("JSON ATUAL:", data["fundamental"]["pico_hz"])
except Exception as e:
    print("Falha ao obter JSON", e)

