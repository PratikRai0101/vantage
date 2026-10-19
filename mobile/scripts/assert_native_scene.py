"""Screenshot smoke gate for this approved olive maquette. Not a performance test.
Usage: python3 scripts/assert_native_scene.py /path/to/native-screenshot.png
Only use captures from the installed native app; there is no image fallback in it.
"""
from PIL import Image
import sys
im=Image.open(sys.argv[1]).convert('RGB')
# Exclude system/status area and lower controls; terrain is green, UI is blue-gray.
w,h=im.size
crop=im.crop((0,int(h*.20),w,int(h*.67)))
count=sum(1 for r,g,b in crop.getdata() if g>55 and g>r*1.07 and g>b*1.04)
ratio=count/(crop.width*crop.height)
print(f'Native terrain coverage: {ratio:.4%}; requires >2%')
if ratio<=.02:raise SystemExit('FAIL: native miniature not visibly rendered (inspect screenshot/error text)')
print('PASS: native miniature visible. Gestures and device performance are separate checks.')
