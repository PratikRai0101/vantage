"""Native Android Battle-header regression. Drive the app to paused Battle first.
Reads only the current UI hierarchy; temp XML removed immediately. Fails on A/A.
"""
import os,re,subprocess,xml.etree.ElementTree as ET
from pathlib import Path
ADB=os.environ.get('ADB',str(Path.home()/'Library/Android/sdk/platform-tools/adb'))
def adb(*args):return subprocess.check_output([ADB,*args],timeout=30)
remote='/data/local/tmp/vantage-battle-ui.xml'
try:
 adb('shell','uiautomator','dump',remote)
 root=ET.fromstring(adb('shell','cat',remote))
finally:adb('shell','rm','-f',remote)
pairs=[]
for node in root.iter():
 for key in ['text','content-desc']:
  match=re.fullmatch(r'([A-Z]{3}) / ([A-Z]{3})',node.attrib.get(key,''))
  if match:pairs.append(match.groups())
if not pairs:raise SystemExit('FAIL: no native Battle header found; do not infer a pass')
for a,b in pairs:
 print('Native Battle header:',a,'/',b)
 if a==b:raise SystemExit('FAIL: stale partner duplicates selected driver')
print('PASS: paused selection is reflected as a distinct native Battle pair')
