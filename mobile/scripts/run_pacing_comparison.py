"""DIAGNOSTIC ONLY. Requires Vantage foreground and explicit user agreement to
~3min exclusive phone use. Two release probe APKs from builds/diagnostics. Control
holds React time notifications, NOT replay/renderer time. Always restores stable
APK in finally. No screenrecord, broad logs, launcher screenshots or log clearing.
"""
import hashlib,json,os,re,subprocess,time
from pathlib import Path
ADB=os.environ.get('ADB',str(Path.home()/'Library/Android/sdk/platform-tools/adb'))
APP='dev.vantage.spectator';OUT=Path('build-logs/pacing-comparison');OUT.mkdir(parents=True,exist_ok=True)
def adb(*args,timeout=35):return subprocess.check_output([ADB,*args],timeout=timeout)
foreground=adb('shell','dumpsys activity activities | grep topResumedActivity').decode()
if APP not in foreground:raise SystemExit('STOP: Vantage is not foreground. Do not interrupt another app; ask user to make phone available.')
stable=Path('builds/vantage-stable-before-pacing.apk')
expected=json.loads(Path('builds/BUILD-STATUS.json').read_text())['android']['sha256']
if not stable.exists() or hashlib.sha256(stable.read_bytes()).hexdigest()!=expected:raise SystemExit('STOP: verified stable restore APK missing')
results={}
try:
 for name in ['ui-on','ui-off']:
  apk=Path('builds/diagnostics')/('pacing-'+name+'.apk')
  if not apk.exists():raise RuntimeError('Missing diagnostic APK: '+str(apk))
  adb('install','--no-streaming','-r',str(apk),timeout=100)
  adb('shell','am','force-stop',APP)
  adb('shell','am','start','-a','android.intent.action.VIEW','-d','vantage:///?time=70\\&driver=18\\&camera=follow','-p',APP)
  time.sleep(8);pid=adb('shell','pidof',APP).decode().strip()
  adb('shell','input','tap','120','1840');time.sleep(19)
  log=adb('logcat','--pid='+pid,'-d','-v','threadtime').decode(errors='replace')
  (OUT/(name+'.txt')).write_text(log)
  rows=re.findall(r'(\{"samples"[^\n]*\})',log)
  if not rows:raise RuntimeError('No measured probe result for '+name+'; never infer a pass')
  results[name]=json.loads(rows[-1]);print(name,json.dumps(results[name]),flush=True)
finally:
 (OUT/'results.json').write_text(json.dumps(results,indent=2))
 was_vantage=APP in adb('shell','dumpsys activity activities | grep topResumedActivity').decode()
 adb('install','--no-streaming','-r',str(stable),timeout=100)
 if was_vantage:adb('shell','am','start','-n',APP+'/.MainActivity')
 print('Stable APK restored; diagnostic UI-clock suppression is NOT shipped',flush=True)
