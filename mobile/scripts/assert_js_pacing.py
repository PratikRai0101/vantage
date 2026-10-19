"""Check bounded JS callback pacing, NOT GPU or presentation FPS.
Accepts the app-PID aggregate probe log (never reads global phone logs).
"""
import json,re,sys
from pathlib import Path
text=Path(sys.argv[1]).read_text()
rows=re.findall(r'(\{"samples"[^\n]*\})',text)
if not rows:raise SystemExit('FAIL: no actual native aggregate probe result')
s=json.loads(rows[-1]);p95=s.get('all',{}).get('gap',{}).get('p95')
if p95 is None:p95=s.get('gapMs_p50_p95_p99_max',[None,None])[1]
if p95 is None:raise SystemExit('FAIL: callback p95 missing')
print(f'Native JS callback p95={p95:.3f}ms, target<=25ms. GPU/presentation not measured.')
if p95>25:raise SystemExit('FAIL: JS scheduling still has excessive frame gaps')
print('PASS: bounded JS scheduling budget met; separate GPU/visual acceptance still required')
