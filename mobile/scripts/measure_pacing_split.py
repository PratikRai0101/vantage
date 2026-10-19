"""DIAGNOSTIC ONLY. One probe APK (structural/display split + bounded aggregate probe),
same deep-link/tap flow and same 75-85s dataset window as the earlier ui-on/ui-off run.
Requires Vantage foreground, unlocked screen and exclusive phone use for ~90 seconds.
Reads app-PID logs only. Pauses before reading the native clock hierarchy (uiautomator
cannot reach idle while the scene animates), then always restores the SHA-verified stable
APK. Never ship the probe APK.
"""
import hashlib, json, os, re, subprocess, sys, time, xml.etree.ElementTree as ET
from pathlib import Path
ADB = os.environ.get('ADB', str(Path.home() / 'Library/Android/sdk/platform-tools/adb'))
APP = 'dev.vantage.spectator'
OUT = Path('build-logs/pacing-split'); OUT.mkdir(parents=True, exist_ok=True)
CLOCK = re.compile(r'\d{2}:\d{2}(?:\.\d)?')
PLAY = ('120', '1840')
def adb(*args, timeout=60): return subprocess.check_output([ADB, *args], timeout=timeout)
def tap(): adb('shell', 'input', 'tap', *PLAY)
def clocks():
    remote = '/data/local/tmp/vantage-pacing-ui.xml'
    for _ in range(3):
        try:
            adb('shell', 'uiautomator', 'dump', remote)
            root = ET.fromstring(adb('shell', 'cat', remote))
            return sorted({n.attrib.get('text', '') for n in root.iter() if CLOCK.fullmatch(n.attrib.get('text', ''))})
        except subprocess.CalledProcessError:
            time.sleep(2)
        finally:
            adb('shell', 'rm', '-f', remote)
    return []
foreground = adb('shell', 'dumpsys activity activities | grep topResumedActivity').decode()
if APP not in foreground: raise SystemExit('STOP: Vantage is not foreground. Do not interrupt another app; ask the user to make the phone available.')
stable = Path('builds/vantage-stable-before-pacing.apk')
expected = json.loads(Path('builds/BUILD-STATUS.json').read_text())['android']['sha256']
if not stable.exists() or hashlib.sha256(stable.read_bytes()).hexdigest() != expected: raise SystemExit('STOP: verified stable restore APK missing')
apk = Path(sys.argv[1] if len(sys.argv) > 1 else 'builds/diagnostics/pacing-1hz.apk')
result = {}
try:
    adb('install', '--no-streaming', '-r', str(apk), timeout=120)
    adb('shell', 'am', 'force-stop', APP)
    adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'vantage:///?time=70\\&driver=18\\&camera=follow', '-p', APP)
    time.sleep(8); pid = adb('shell', 'pidof', APP).decode().strip()
    if not pid: raise RuntimeError('Vantage did not start')
    tap(); time.sleep(20)
    log = adb('logcat', '--pid=' + pid, '-d', '-v', 'threadtime').decode(errors='replace')
    (OUT / (apk.stem + '.txt')).write_text(log)
    rows = [m.group(1) for line in log.splitlines() if '[probe-pacing]' in line for m in [re.search(r"'(\{.*\})'\s*$", line)] if m]
    if not rows: raise RuntimeError('No bounded probe result; do not infer a pass')
    for row in rows: print(row, flush=True)
    # Visible clock regression: pause, read, play 3s, pause, read. Never infer from logs.
    tap(); first = clocks(); tap(); time.sleep(3.2); tap(); second = clocks()
    result = {'probe': [json.loads(row) for row in rows], 'clockPausedA': first, 'clockPausedB': second}
    if first and second and first == second: raise SystemExit('FAIL: visible UI clock did not advance during playback')
    if not first or not second: print('WARN: native clock hierarchy unreadable; probe data stands alone', flush=True)
    else: print('UI clock advanced while playing:', first, '->', second, flush=True)
finally:
    (OUT / 'result.json').write_text(json.dumps(result, indent=2))
    adb('install', '--no-streaming', '-r', str(stable), timeout=120)
    was_vantage = APP in adb('shell', 'dumpsys activity activities | grep topResumedActivity').decode()
    if was_vantage: adb('shell', 'am', 'start', '-n', APP + '/.MainActivity')
    print('Stable APK restored; probe build is not shipped', flush=True)
