"""Bounded physical-Note20 lifecycle/visibility regression. App-only screenshots;
never capture launcher. No screen recording/performance inference. Run from mobile.
Temporary app PID log; no global log clearing. UI coordinates are Note20-specific.
"""
import io,json,os,subprocess,time
from pathlib import Path
from PIL import Image
import numpy as np
ADB=os.environ.get('ADB',str(Path.home()/'Library/Android/sdk/platform-tools/adb'))
OUT=Path(os.environ.get('OUT','build-logs/surface-stress'));OUT.mkdir(parents=True,exist_ok=True)
ROUNDS=int(os.environ.get('ROUNDS','8'));APP='dev.vantage.spectator'
def adb(*args):return subprocess.check_output([ADB,*args],timeout=30)
adb('shell','am','force-stop',APP)
adb('shell','am','start','-a','android.intent.action.VIEW','-d','vantage:///?time=78.5\\&driver=18\\&camera=follow','-p',APP);time.sleep(8)
pid=adb('shell','pidof',APP).decode().strip();log=open(OUT/'process.txt','wb')
logger=subprocess.Popen([ADB,'logcat','--pid='+pid,'-v','threadtime','-T','1'],stdout=log,stderr=subprocess.STDOUT)
results=[]
try:
 for n in range(ROUNDS):
  if n%3==2:
   adb('shell','input','keyevent','KEYCODE_HOME');time.sleep(.8)
   adb('shell','am','start','-n',APP+'/.MainActivity')
  else:
   adb('shell','input','tap','540','2140');time.sleep(.6)
   adb('shell','input','tap','180','2140')
  time.sleep(2.5)
  raw=adb('exec-out','screencap','-p');(OUT/f'{n:02d}-returned.png').write_bytes(raw)
  im=Image.open(io.BytesIO(raw));rgb=np.array(im.convert('RGB').crop((0,526,1080,1482))).astype(float)
  r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
  terrain=float(((g>55)&(g>r*1.07)&(g>b*1.04)).mean());dark=float((rgb.max(axis=2)<55).mean())
  row={'round':n,'terrain':terrain,'dark':dark,'pid':adb('shell','pidof',APP).decode().strip()};results.append(row);print(row,flush=True)
  if terrain<.025 or dark>.95:raise RuntimeError('FAIL: miniature lost after lifecycle transition; inspect native capture')
finally:
 logger.terminate();logger.wait(timeout=5);log.close();(OUT/'results.json').write_text(json.dumps(results,indent=2))
print('PASS: bounded surface reentry retained visible miniature; not a universal blackout guarantee')
