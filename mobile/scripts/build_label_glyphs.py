"""Generate native GPU glyph coverage from the bundled OFL IBM Plex Mono.
Requires Pillow. Output contains only alpha samples, no platform font dependency.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
font = ImageFont.truetype(str(ROOT/'assets/fonts/ibm-plex-mono-600.ttf'), 32)
glyphs = {}
for char in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789×':
    image = Image.new('L', (20, 38))
    ImageDraw.Draw(image).text((0, -1), char, font=font, fill=255)
    glyphs[char] = list(image.getdata())
(ROOT/'src/scene/label-glyphs.json').write_text(json.dumps({'width':20, 'height':38, 'glyphs':glyphs}, separators=(',', ':'))+'\n')
