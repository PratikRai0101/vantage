"""Check encoded showcase cadence, independently of changing HUD labels.

Measures a fixed crop of the race miniature. Only pass race-only --windows;
static Timing/Lab reading holds are intentional, not rendering failures.
"""
import argparse
import json
import subprocess
import sys

import numpy as np


def check(path, windows, fps=30, limit=0.3):
    results = []
    for start, end in windows:
        raw = subprocess.check_output([
            'ffmpeg', '-v', 'error', '-ss', str(start), '-i', path,
            '-t', str(end-start), '-vf',
            f'fps={fps},crop=iw:ih*0.37:0:ih*0.25,scale=240:180',
            '-f', 'rawvideo', '-pix_fmt', 'gray', '-'])
        frames = np.frombuffer(raw, np.uint8).reshape(-1, 180, 240)
        if len(frames) < 2:
            raise ValueError(f'Insufficient decoded frames in {start}:{end}')
        delta = np.abs(np.diff(frames.astype(np.int16), axis=0))
        # Ignore H.264 shimmer: require real changes across >0.1% of the crop.
        changed = (delta > 4).mean(axis=(1, 2)) > 0.001
        longest = run = 0
        for moving in changed:
            run = 0 if moving else run + 1
            longest = max(longest, run)
        dark_frames = int((frames.mean(axis=(1, 2)) < 15).sum())
        results.append({'window': [start, end], 'frames': len(frames),
                        'movingFrameFraction': round(float(changed.mean()), 3),
                        'longestStillSeconds': round(longest / fps, 3),
                        'darkSceneFrames': dark_frames,
                        'passed': longest / fps <= limit and dark_frames == 0})
    return {'path': path, 'maxStillSeconds': limit, 'windows': results,
            'passed': all(r['passed'] for r in results)}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('path')
    p.add_argument('--windows', required=True, help='Race-only start:end,start:end seconds')
    p.add_argument('--max-still', type=float, default=0.3)
    p.add_argument('--fps', type=int, default=30)
    args = p.parse_args()
    windows = [tuple(map(float, w.split(':'))) for w in args.windows.split(',')]
    report = check(args.path, windows, fps=args.fps, limit=args.max_still)
    print(json.dumps(report, indent=2))
    sys.exit(0 if report['passed'] else 1)
