"""120s physical Note20 playback sweep, camera changes only. Native acceptance
capture, not a FPS benchmark. App must already be installed and USB authorized.
Run from mobile/. Records app PID only; no home/other-app navigation.
"""
import json, os, subprocess, time
from pathlib import Path
ADB=os.environ.get('ADB',str(Path.home()/'Library/Android/sdk/platform-tools/adb'))
OUT=Path(os.environ.get('OUT','build-logs/replay-sweep'));OUT.mkdir(parents=True,exist_ok=True)
APP='dev.vantage.spectator'
def adb(*args,timeout=25):return subprocess.run([ADB,*args],capture_output=True,check=True,timeout=timeout).stdout
adb('shell','am','force-stop',APP)
adb('shell','am','start','-a','android.intent.action.VIEW','-d','vantage:///?time=0\\&driver=4\\&camera=follow','-p',APP)
time.sleep(10)
pid=adb('shell','pidof',APP).decode().strip();log=open(OUT/'process.txt','wb')
logger=subprocess.Popen([ADB,'logcat','--pid='+pid,'-v','threadtime','-T','1'],stdout=log,stderr=subprocess.STDOUT)
video=subprocess.Popen([ADB,'shell','screenrecord','--time-limit','130','--size','720x1600','--bit-rate','8000000','/data/local/tmp/vantage-replay-sweep.mp4'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1);adb('shell','input','tap','120','1840');start=time.monotonic();events=[]
try:
 for index,(elapsed,camera,x) in enumerate([(12,'follow',510),(28,'battle',775),(44,'overview',180),(60,'follow',510),(76,'battle',775),(92,'overview',180),(108,'follow',510),(120,'follow',510)]):
  time.sleep(max(0,elapsed-(time.monotonic()-start)))
  adb('shell','input','tap',str(x),'1615');time.sleep(1)
  (OUT/f'{index:02d}-{camera}.png').write_bytes(adb('exec-out','screencap','-p'))
  events.append({'elapsed':round(time.monotonic()-start,3),'camera':camera})
finally:
 (OUT/'events.json').write_text(json.dumps(events,indent=2))
 logger.terminate();logger.wait(timeout=5);log.close()
 try:video.wait(timeout=15)
 except subprocess.TimeoutExpired:video.terminate()
 adb('pull','/data/local/tmp/vantage-replay-sweep.mp4',str(OUT/'sweep.mp4'),timeout=40)
 adb('shell','rm','/data/local/tmp/vantage-replay-sweep.mp4')
print('Sweep captured:',OUT,flush=True)
