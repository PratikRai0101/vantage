"""Capture one continuous hands-on demo, including timestamped real actions.

Build the XCTest harness first (see README). Output stays in ignored build-logs.
No performance-heavy export or simulator screenshots run during the capture.
"""
from pathlib import Path
import argparse
import json
import signal
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('--device', default='434BDE2E-0A19-4F28-A838-969395AB2682')
p.add_argument('--project', default='/tmp/vantage-smooth-ui/NativeSmoke.xcodeproj')
p.add_argument('--derived-data', default='/tmp/vantage-smooth-ui/build')
args = p.parse_args()
out = ROOT / 'mobile/build-logs/ios-showcase'
out.mkdir(parents=True, exist_ok=True)
raw = out / 'hands-on-raw.mp4'
result = out / f'hands-on-{int(time.time())}.xcresult'
containers = Path.home() / f'Library/Developer/CoreSimulator/Devices/{args.device}/data/Containers/Data/Application'
for marker in containers.glob('*/Documents/vantage_capture_*'):
    marker.unlink()
with (out / 'hands-on-record.log').open('w') as log:
    recorder = subprocess.Popen(['xcrun', 'simctl', 'io', args.device, 'recordVideo',
                                 '--codec=h264', '--force', str(raw)], stderr=subprocess.PIPE, text=True)
    try:
        for line in recorder.stderr:
            log.write(line); log.flush()
            if 'Recording started' in line:
                started = time.time()
                break
        else:
            raise RuntimeError('Recorder failed to start')
        with (out / 'hands-on-test.log').open('w') as testlog:
            test = subprocess.run([
                'xcodebuild', 'test-without-building', '-project', args.project,
                '-scheme', 'NativeSmoke', '-destination', f'platform=iOS Simulator,id={args.device}',
                '-derivedDataPath', args.derived_data, '-parallel-testing-enabled', 'NO',
                '-only-testing:NativeSmoke/NativeShowcase/testHandsOnVideo',
                '-resultBundlePath', str(result), 'CODE_SIGNING_ALLOWED=NO'],
                stdout=testlog, stderr=subprocess.STDOUT, timeout=180)
    finally:
        recorder.send_signal(signal.SIGINT)
        recorder.wait(timeout=30)
    if test.returncode:
        raise RuntimeError(f'XCTest failed: {out / "hands-on-test.log"}')
markers = {f.name.removeprefix('vantage_capture_'): float(f.read_text()) - started
           for f in containers.glob('*/Documents/vantage_capture_*')}
assert set(markers) >= {'start', 'overview', 'follow', 'battle', 'timing', 'lab', 'comparison', 'telemetry', 'closing', 'end'}, markers
report = {'source': str(raw.relative_to(ROOT)), 'recordingStartedEpoch': started,
          'markerOffsetsSeconds': markers, 'resultBundle': str(result),
          'alignmentNote': 'Offsets relative to simctl first-frame acknowledgement; the export keeps a continuous start-to-end take with every interaction intact.'}
(out / 'hands-on-timeline.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
