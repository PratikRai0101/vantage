#!/usr/bin/env python3
"""Record real native interactions on the dedicated VantageShowcase emulator.

No screenshots are used as video frames. Output is local-only under mobile/build-logs.
Requires Vantage installed at 1080x2400 / 450dpi, dark appearance, animations ON.
Does not clear app/user data or create a fictitious onboarding flow.
"""
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'mobile/build-logs/portfolio-capture'
ADB = os.environ.get('ADB', str(Path.home() / 'Library/Android/sdk/platform-tools/adb'))
SERIAL = os.environ.get('SHOWCASE_SERIAL', 'emulator-5554')
APP = 'dev.vantage.spectator'
REMOTE = '/data/local/tmp/vantage-portfolio.mp4'


def adb(*args, timeout=30):
    return subprocess.check_output([ADB, '-s', SERIAL, *map(str, args)], timeout=timeout)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if not SERIAL.startswith('emulator-'):
        raise SystemExit('This fixed-coordinate driver targets the dedicated emulator only.')
    adb('shell', 'am', 'force-stop', APP)
    recorder_log = (OUT / 'screenrecord.log').open('wb')
    recorder = subprocess.Popen([ADB, '-s', SERIAL, 'shell', 'screenrecord',
        '--size', '720x1600', '--bit-rate', '8000000', '--time-limit', '145', REMOTE],
        stdout=recorder_log, stderr=subprocess.STDOUT)
    start = time.monotonic()
    events = []

    def at(seconds, label, action, screenshot=False):
        time.sleep(max(0, start + seconds - time.monotonic()))
        # Never send touches to a different foreground app.
        if seconds > 1:
            focused = adb('shell', 'dumpsys', 'activity', 'activities').decode()
            if APP not in next((line for line in focused.splitlines() if 'topResumedActivity=' in line), ''):
                raise RuntimeError('Vantage lost foreground; refusing to tap another app')
        before = round(time.monotonic() - start, 3)
        action()
        events.append({'seconds': before, 'action': label})
        if screenshot:
            time.sleep(1)
            (OUT / f'{int(seconds):03d}.png').write_bytes(adb('exec-out', 'screencap', '-p'))
        print(f'{before:6.2f}s {label}', flush=True)

    def tap(x, y): return lambda: adb('shell', 'input', 'tap', x, y)
    def swipe(x, y, x2, y2, ms=900):
        return lambda: adb('shell', 'input', 'swipe', x, y, x2, y2, ms)

    try:
        at(.7, 'Cold launch (there is no onboarding)',
           lambda: adb('shell', 'am', 'start', '-W', '-n', APP + '/.MainActivity'))
        at(7, 'Play whole-field replay', tap(120, 1780), True)
        at(14, 'Switch to Follow camera', tap(470, 1560), True)
        at(21, 'Orbit the real 3D scene', swipe(680, 950, 390, 1050, 1300))
        at(26, 'Reset camera', tap(960, 1560))
        at(30, 'Switch to Battle camera', tap(750, 1560), True)
        at(37, 'Pause replay', tap(120, 1780))
        at(40, 'Scrub backwards and seek', swipe(550, 1806, 390, 1806, 1100), True)
        at(44, 'Resume at the new cursor', tap(120, 1780))
        at(48, 'Open playback speed sheet', tap(960, 1780))
        at(50, 'Choose 2x speed', tap(530, 735))
        at(54, 'Open speed sheet again', tap(960, 1780))
        at(56, 'Restore 1x speed', tap(530, 590))
        at(60, 'Pause before viewing Timing', tap(120, 1780))
        at(62, 'Switch to Timing tab', tap(540, 2200), True)
        at(66, 'Show intervals to car ahead', tap(900, 700))
        at(69, 'Show gaps to the leader', tap(700, 700))
        at(72, 'Select LEC from recorded standings', tap(500, 1590), True)
        at(76, 'Follow the selected driver', tap(470, 1560))
        at(79, 'Switch to Lab tab with shared cursor', tap(900, 2200), True)
        at(83, 'Open comparison driver sheet', tap(530, 950))
        at(86, 'Choose NOR as the comparison driver', tap(530, 1010))
        at(90, 'Seek directly from the speed chart', tap(680, 1410), True)
        at(94, 'Play synchronized telemetry', tap(120, 535))
        at(98, 'Pause synchronized telemetry', tap(120, 535))
        at(101, 'Scroll to recorded telemetry values', swipe(800, 1850, 800, 850), True)
        at(106, 'Read throttle brake gear and RPM', swipe(800, 1800, 800, 1100), True)
        at(111, 'Return to top of Lab', swipe(800, 700, 800, 2050))
        at(114, 'Return to Race tab', tap(180, 2200))
        at(117, 'Expand reconstruction disclosure', tap(540, 2040))
        at(120, 'Read honest reconstruction limits', swipe(800, 1870, 800, 1300), True)
        at(125, 'Return to camera controls', swipe(800, 700, 800, 2050))
        at(129, 'Show the whole field again', tap(180, 1560))
        at(132, 'Resume the replay to finish', tap(120, 1780), True)
        time.sleep(max(0, start + 142 - time.monotonic()))
    finally:
        (OUT / 'events.json').write_text(json.dumps(events, indent=2) + '\n')
        try:
            recorder.wait(timeout=12)
        except subprocess.TimeoutExpired:
            recorder.terminate()
            recorder.wait(timeout=5)
        recorder_log.close()
        adb('pull', REMOTE, OUT / 'workflow.mp4', timeout=60)
        adb('shell', 'rm', '-f', REMOTE)
    print('Recorded', OUT / 'workflow.mp4')

    # A second real take covers group selection and system appearance, then
    # ends on continuous playback. Seed changes are outside the published take.
    adb('shell', 'am', 'force-stop', APP)
    adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW',
        '-d', 'vantage:///?time=0\\&driver=4\\&camera=overview', '-p', APP)
    time.sleep(6)
    closing_remote = '/data/local/tmp/vantage-closing.mp4'
    closing = subprocess.Popen([ADB, '-s', SERIAL, 'shell', 'screenrecord',
        '--size', '720x1600', '--bit-rate', '8000000', '--time-limit', '30', closing_remote],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    closing_start = time.monotonic()
    closing_events = []
    try:
        actions = [
            (2, 'Tap grouped projections', ['input', 'tap', '575', '760']),
            (5, 'Cycle the group selection', ['input', 'tap', '575', '760']),
            (8, 'System light appearance', ['cmd', 'uimode', 'night', 'no']),
            (13, 'System dark appearance', ['cmd', 'uimode', 'night', 'yes']),
            (17, 'Follow selected driver', ['input', 'tap', '470', '1560']),
            (20, 'Play replay', ['input', 'tap', '120', '1780']),
            (26, 'Whole field finale', ['input', 'tap', '180', '1560']),
        ]
        for seconds, label, command in actions:
            time.sleep(max(0, closing_start + seconds - time.monotonic()))
            foreground = adb('shell', 'dumpsys', 'activity', 'activities').decode()
            if APP not in next((s for s in foreground.splitlines() if 'topResumedActivity=' in s), ''):
                raise RuntimeError('Vantage lost foreground during closing take')
            adb('shell', *command)
            closing_events.append({'seconds': seconds, 'action': label})
    finally:
        closing.wait(timeout=12)
        adb('pull', closing_remote, OUT / 'closing.mp4', timeout=60)
        adb('shell', 'rm', '-f', closing_remote)
        (OUT / 'closing-events.json').write_text(json.dumps(closing_events, indent=2) + '\n')
        adb('shell', 'cmd', 'uimode', 'night', 'yes')
    print('Recorded', OUT / 'closing.mp4')


if __name__ == '__main__':
    main()
