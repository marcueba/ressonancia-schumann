from PIL import Image

def inspect(name):
    img = Image.open(f"sos70_assets/{name}.jpg")
    print(f"--- {name}.jpg ---")
    print(f"Size: {img.size}")
    
    # Let's just check color counts to see if it's lines, points or curves
    colors = img.getcolors(maxcolors=100000)
    # usually graphs with white background have mostly white
    if colors:
        colors.sort(key=lambda x: x[0], reverse=True)
        print(f"Top 5 colors: {colors[:5]}")
        
    pixels = img.load()
    # Check middle row
    w, h = img.size
    print(f"Mid row start: {pixels[0, h//2]}, Mid col start: {pixels[w//2, 0]}")

inspect('srf')
inspect('sra')
inspect('srq')

