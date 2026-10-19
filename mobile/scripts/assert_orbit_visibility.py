"""Regression for Note20 grazing-angle orbit that hides the selected race.
Use Follow captures from capture_android_render.py; not an all-black/GPU FPS test.
"""
from PIL import Image
import sys
image=Image.open(sys.argv[1]).convert('RGB')
w,h=image.size
scene=image.crop((0,round(h*526/2400),w,round(h*1482/2400)))
pixels=list(scene.getdata())
terrain=sum(g>55 and g>r*1.07 and g>b*1.04 for r,g,b in pixels)/len(pixels)
dark=sum(max(p)<55 for p in pixels)/len(pixels)
print(f'Follow orbit terrain={terrain:.1%}, dark={dark:.1%}')
if terrain<.30 or dark>.70:
 raise SystemExit('FAIL: grazing orbit loses useful race view behind plinth/horizon')
print('PASS: useful tabletop view retained; material flicker requires separate video checks')
