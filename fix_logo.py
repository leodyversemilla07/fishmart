from PIL import Image
import os

try:
    img_path = 'assets/images/logo.png'
    img = Image.open(img_path)
    print(f"Current Format: {img.format}")
    
    # Force convert to PNG
    # Convert to RGBA to ensure transparency support and standard PNG format
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
        
    img.save(img_path, 'PNG')
    print("Successfully forced conversion to PNG.")
except Exception as e:
    print(f"Error: {e}")
