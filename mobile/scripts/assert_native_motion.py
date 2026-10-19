"""Native screenshot regression: cameras AND car motion must actually change GPU pixels.
Run on the overview, follow, playing-a, playing-b PNGs exported by native-smoke.
HUD changes cannot satisfy the check: crop is inside the 402x874 native GL surface.
"""
from PIL import Image, ImageChops
import sys

def changed(a,b):
    a,b=Image.open(a).convert('RGB'),Image.open(b).convert('RGB')
    assert a.size==b.size
    w,h=a.size
    bounds=(0,int(h*.25),w,int(h*.58))
    diff=ImageChops.difference(a.crop(bounds),b.crop(bounds))
    return sum(1 for p in diff.getdata() if max(p)>20)

camera=changed(sys.argv[1],sys.argv[2])
motion=changed(sys.argv[3],sys.argv[4])
print(f'Camera changed pixels: {camera}; moving-field changed pixels: {motion}')
if camera<1000 or motion<100:
    raise SystemExit('FAIL: native GL camera/motion stale (UI labels alone are not evidence)')
print('PASS: native camera and moving-field pixels both change. Not a GPU FPS measurement.')
