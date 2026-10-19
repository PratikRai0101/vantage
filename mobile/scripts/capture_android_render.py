"""Bounded Note20 rendering repro. Read app logs only; never clear phone logs.
Requires an authorized phone with installed Vantage. Captures a 60s screen video
and native screenshots across playback, orbit, tabs and background/reentry.
Does NOT infer GPU FPS from recording cadence. Run from mobile/.
"""
import json, os, subprocess, time
from pathlib import Path
ADB=os.environ.get('ADB',str(Path.home()/'Library/Android/sdk/platform-tools/adb'))
OUT=Path(os.environ.get('OUT','build-logs/render-repro'));OUT.mkdir(parents=True,exist_ok=True)
APP='dev.vantage.spectator'
def adb(*args,timeout=20):
 return subprocess.run([ADB,*args],capture_output=True,check=True,timeout=timeout).stdout
adb('shell','am','force-stop',APP)
adb('shell','am','start','-W','-n',APP+'/.MainActivity');time.sleep(10)
pid=adb('shell','pidof',APP).decode().strip()
log=open(OUT/'process.txt','wb')
logger=subprocess.Popen([ADB,'logcat','--pid='+pid,'-v','threadtime','-T','1'],stdout=log,stderr=subprocess.STDOUT)
video=subprocess.Popen([ADB,'shell','screenrecord','--time-limit','60','--size','720x1600','--bit-rate','8000000','/data/local/tmp/vantage-render-repro.mp4'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
start=time.monotonic();events=[]
def shot(name):
 (OUT/(name+'.png')).write_bytes(adb('exec-out','screencap','-p'))
 events.append({'seconds':round(time.monotonic()-start,3),'capture':name})
def tap(x,y):adb('shell','input','tap',str(x),str(y));time.sleep(1)
def swipe(x,y,a,b):adb('shell','input','swipe',str(x),str(y),str(a),str(b),'500');time.sleep(1)
try:
 shot('01-overview')
 tap(120,1840);time.sleep(2);shot('02-playing-overview')
 tap(510,1615);time.sleep(2);shot('03-follow')
 swipe(600,950,600,700);shot('04-low-orbit')
 swipe(700,950,200,950);shot('05-reverse-orbit')
 swipe(600,800,600,1250);shot('06-high-orbit')
 tap(955,1615);shot('07-reset')
 tap(775,1615);time.sleep(2);shot('08-battle')
 tap(540,2140);time.sleep(1);shot('09-timing')
 tap(180,2140);time.sleep(3);shot('10-return-race')
 adb('shell','input','keyevent','KEYCODE_HOME');time.sleep(2)
 adb('shell','am','start','-W','-n',APP+'/.MainActivity');time.sleep(3);shot('11-foreground')
finally:
 (OUT/'events.json').write_text(json.dumps(events,indent=2))
 logger.terminate();logger.wait(timeout=10);log.close()
 try:video.wait(timeout=max(1,65-(time.monotonic()-start)))
 except subprocess.TimeoutExpired:video.terminate();video.wait(timeout=10)
 try:
  adb('pull','/data/local/tmp/vantage-render-repro.mp4',str(OUT/'repro.mp4'))
  adb('shell','rm','/data/local/tmp/vantage-render-repro.mp4')
 except Exception as error:print('Video capture incomplete:',error)
print('Captured',OUT,'app PID',pid)
