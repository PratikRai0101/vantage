"""Composite rendered Blender PNGs and tile the camera journey; requires existing Pillow."""
from PIL import Image
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'assets/a2'
meta=json.loads((out/'motion.json').read_text())
bg=(17,26,29,255)
def flatten(path):
 im=Image.open(path).convert('RGBA');canvas=Image.new('RGBA',im.size,bg);canvas.alpha_composite(im);return canvas.convert('RGB')
sheet=Image.new('RGB',(meta['sheetWidth'],meta['sheetHeight']),bg[:3])
for i in range(meta['frameCount']):
 im=flatten(out/f'frame-{i:02d}.png');sheet.paste(im,((i%meta['cols'])*meta['frameWidth'],(i//meta['cols'])*meta['frameHeight']))
sheet.save(out/'camera-strip.webp',quality=92,method=6)
sheet.save(out/'camera-strip.png',optimize=True)
flatten(out/'follow.png').save(out/'follow.webp',quality=94,method=6)
# Match the original padded overview crop; plan and camera are unchanged.
im=Image.open(out/'overview.png').convert('RGBA');b=im.getbbox();pad=55
b=(max(0,b[0]-pad),max(0,b[1]-pad),min(im.width,b[2]+pad),min(im.height,b[3]+pad))
im.crop(b).save(out/'overview.webp',quality=94,method=6)
# Preserve isolated miniature alpha for flexible placement on strategy/driver screens.
Image.open(out/'car.png').save(out/'car.webp',quality=96,method=6)
print('Wrote',out/'follow.webp',out/'car.webp',out/'camera-strip.webp')
