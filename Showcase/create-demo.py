"""Draw Monolith's iPhone 17 Pro frame around Vantage's real iOS captures.

Both published forms come from one continuous take, with every actual tap,
camera move, tab change, sheet animation and scroll left intact. No internal
cuts, dissolves or retiming. Source PTS, not faulty simulator DTS, determines
presentation timing. Both exports carry the identical frames in identical order.

The frame is a static titanium band and black glass drawn around the capture.
The app pixels inside it are copied through untouched; only the four screen
corners are rounded, exactly as a real display curves into the body.

Requires macOS with ffmpeg and Pillow:

    python3 Showcase/create-demo.py
"""
from pathlib import Path
from PIL import Image, ImageDraw
import math, subprocess, json, shutil, hashlib

ROOT = Path(__file__).resolve().parents[1]
DEMO = ROOT / 'Showcase'
SHOTS = ROOT / 'shots/ios-showcase'
FRAMED_SHOTS = ROOT / 'Screenshots/framed'
SOURCE = ROOT / 'mobile/build-logs/ios-showcase/hands-on-raw.mp4'
TIMELINE = SOURCE.with_name('hands-on-timeline.json')
CAPTURE_JSON = DEMO / 'vantage-demo.capture.json'

GLASS_PT, BAND_PT = 12.0, 5.0
DEVICE_RADIUS_PT, SCREEN_RADIUS_PT = 66.0, 55.0
LOGICAL_W = 402          # iPhone 17 Pro logical width
SCREEN_OUT_W = 720       # published screen width
FPS = 60
MARKERS = json.loads(TIMELINE.read_text())['markerOffsetsSeconds']
SOURCE_START = MARKERS['start']
FRAME_COUNT = round((MARKERS['end'] - SOURCE_START) * FPS)
DURATION = FRAME_COUNT / FPS
TMP = Path('/tmp/vantage-hands-on-frame/work')

STILLS = {
    '01-overview.png': '01-race-overview.png',
    '02-follow.png': '02-race-follow.png',
    '03-battle.png': '03-race-battle.png',
    '04-timing.png': '04-timing.png',
    '05-lab.png': '05-telemetry.png',
    '06-telemetry.png': '06-telemetry-values.png',
    '07-return.png': '07-return-paused.png',
}


def band_gradient(w, h):
    """Titanium: a soft vertical gradient with a bright upper-left sheen."""
    base = Image.new('RGB', (w, h), (0, 0, 0))
    px = base.load()
    for y in range(h):
        t = y / max(1, h - 1)
        v = int(196 - 74 * t + 26 * math.sin(t * math.pi))
        for x in range(w):
            u = x / max(1, w - 1)
            sheen = int(16 * (1 - u) * math.sin(t * math.pi * 0.8))
            c = max(0, min(255, v + sheen))
            px[x, y] = (c, c - 2, c - 6)
    return base


def frame_parts(screen_w, screen_h):
    """Return (frame RGB, screen mask L, offset) for a given screen size."""
    scale = screen_w / LOGICAL_W
    glass = int(round(GLASS_PT * scale))
    band = int(round(BAND_PT * scale))
    W, H = screen_w + 2 * (glass + band), screen_h + 2 * (glass + band)
    r_dev = int(round(DEVICE_RADIUS_PT * scale))
    r_glass = int(round((DEVICE_RADIUS_PT - BAND_PT) * scale))
    r_screen = int(round(SCREEN_RADIUS_PT * scale))
    off = band + glass

    canvas = Image.new('RGB', (W, H), (14, 16, 18))
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, H - 1), radius=r_dev, fill=255)
    canvas.paste(band_gradient(W, H), (0, 0), mask)
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle((0, 0, W - 1, H - 1), radius=r_dev, outline=(232, 232, 236),
                        width=max(1, int(scale * 0.8)))
    d.rounded_rectangle((band, band, W - band - 1, H - band - 1), radius=r_glass, fill=(8, 9, 10))

    smask = Image.new('L', (screen_w, screen_h), 0)
    ImageDraw.Draw(smask).rounded_rectangle((0, 0, screen_w - 1, screen_h - 1), radius=r_screen, fill=255)
    return canvas, smask, off


def frame_still(screen: Image.Image, out: Path):
    frame, mask, off = frame_parts(screen.width, screen.height)
    frame.paste(screen.convert('RGB'), (off, off), mask)
    frame.save(out)
    return out


def build_stills():
    FRAMED_SHOTS.mkdir(parents=True, exist_ok=True)
    for source, target in STILLS.items():
        raw = Image.open(SHOTS / source)
        frame_still(raw, FRAMED_SHOTS / target)
        print('framed', target)


def probe(path: Path) -> dict:
    data = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries',
        'stream=width,height,r_frame_rate,nb_frames,codec_name',
        '-show_entries', 'format=duration,size', '-of', 'json', str(path)]))
    video = next(s for s in data['streams'] if s.get('width'))
    return {
        'width': video['width'], 'height': video['height'],
        'fps': video['r_frame_rate'], 'frames': int(video['nb_frames']),
        'durationSeconds': float(data['format']['duration']),
        'bytes': int(data['format']['size']),
    }


def app_region_diff(framed: Path, frameless: Path, off: int) -> dict:
    """Decode a short sample and compare the app region inside the frame."""
    def frames(path):
        return subprocess.check_output([
            'ffmpeg', '-v', 'error', '-i', str(path), '-vf', 'fps=2',
            '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
    a = frames(framed)
    b = frames(frameless)
    fw, fh = 780, 1626
    sw, sh = 720, 1566
    fa = memoryview(a)
    fb = memoryview(b)
    frame_bytes_a, frame_bytes_b = fw * fh * 3, sw * sh * 3
    count = min(len(a) // frame_bytes_a, len(b) // frame_bytes_b)
    total, maximum, over3 = 0, 0, 0
    for i in range(count):
        A = fa[i*frame_bytes_a:(i+1)*frame_bytes_a]
        B = fb[i*frame_bytes_b:(i+1)*frame_bytes_b]
        for y in range(40, sh - 40, 40):
            for x in range(40, sw - 40, 40):
                pa = (y + off) * fw + (x + off)
                pb = y * sw + x
                for c in range(3):
                    d = abs(A[pa*3+c] - B[pb*3+c])
                    total += d
                    maximum = max(maximum, d)
                    over3 += d > 3
    pixels = count * ((sh - 80) // 40) * ((sw - 80) // 40) * 3
    return {'samples': count, 'meanAbsDiff': round(total / pixels, 3) if pixels else 0,
            'maxAbsDiff': maximum, 'componentsOver3': over3}


def build_videos():
    """Decode once; preserve the complete interaction timeline in both outputs.

    Ignoring conflicting simulator DTS is essential: default best-effort decoding
    previously dropped real motion and padded the tail with frozen frames.
    Trim only after decoding. A split feeds identical frames to both encoders;
    the static frame and screen mask are composited without re-rendering app UI.
    """
    TMP.mkdir(parents=True, exist_ok=True)
    sw, sh = SCREEN_OUT_W, 1566
    frame, mask, off = frame_parts(sw, sh)
    frame.save(TMP / 'device.png')
    mask.save(TMP / 'mask.png')
    filters = (
        f'[0:v]trim=start={SOURCE_START}:duration={DURATION},setpts=PTS-STARTPTS,'
        f'fps={FPS},scale={sw}:{sh}:flags=lanczos,split=2[plain][screen];'
        f'[screen][2:v]alphamerge[rounded];'
        f'[1:v][rounded]overlay={off}:{off}:shortest=1:format=auto[framed]'
    )
    command = ['ffmpeg', '-y', '-v', 'error', '-fflags', '+igndts', '-i', str(SOURCE),
               '-loop', '1', '-framerate', str(FPS), '-i', str(TMP / 'device.png'),
               '-loop', '1', '-framerate', str(FPS), '-i', str(TMP / 'mask.png'),
               '-filter_complex_threads', '2', '-filter_complex', filters]
    for stream, name in [('plain', 'vantage-demo.mp4'), ('framed', 'vantage-demo-framed.mp4')]:
        command += ['-map', f'[{stream}]', '-frames:v', str(FRAME_COUNT), '-an',
                    '-map_metadata', '-1', '-map_chapters', '-1', '-c:v', 'libx264',
                    '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart', '-threads', '4', str(DEMO / name)]
    subprocess.run(command, check=True)
    return FRAME_COUNT, off


def build_gifs():
    # Decode the already-trimmed frameless film, so the GIF cannot reintroduce setup.
    source = DEMO / 'vantage-demo.mp4'
    for name, width, fps, colors, out_w, out_h in [
        ('vantage-demo-framed.gif', 240, 20, 64, 250, 530),
        ('vantage-demo.gif', 200, 20, 64, 190, 414),
    ]:
        frames = TMP / f'gifsrc-{name}'
        if frames.exists():
            shutil.rmtree(frames)
        frames.mkdir(parents=True)
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(source), '-vf',
                        f'fps={fps},scale={width}:-2:flags=lanczos', '-q:v', '4',
                        str(frames / '%05d.png')], check=True)
        files = sorted(frames.glob('*.png'))
        sw, sh = Image.open(files[0]).size
        if 'framed' in name:
            frame, mask, off = frame_parts(sw, sh)
        else:
            frame, mask, off = None, None, 0
        staged = TMP / f'gifstaged-{name}'
        if staged.exists():
            shutil.rmtree(staged)
        staged.mkdir(parents=True)
        for i, f in enumerate(files):
            im = Image.open(f).convert('RGB')
            if frame is not None:
                canvas = frame.copy()
                canvas.paste(im, (off, off), mask)
                im = canvas
            im.resize((out_w, out_h), Image.LANCZOS).save(staged / f'{i:05d}.png')
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', str(fps),
                        '-i', str(staged / '%05d.png'), '-vf',
                        f'split[a][b];[a]palettegen=max_colors={colors}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=2',
                        '-loop', '0', str(DEMO / name)], check=True)
        print('gif', name, (DEMO / name).stat().st_size // 1024, 'KB')


def build_capture(frames: int, off: int):
    source_sha = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    framed = probe(DEMO / 'vantage-demo-framed.mp4')
    plain = probe(DEMO / 'vantage-demo.mp4')
    still_raw = Image.open(SHOTS / '01-overview.png').convert('RGB')
    still_frame = Image.open(FRAMED_SHOTS / '01-race-overview.png').convert('RGB')
    sw, sh = still_raw.size
    _, still_mask, soff = frame_parts(sw, sh)
    interior = still_frame.crop((soff, soff, soff + sw, soff + sh))
    differences = [abs(a - b) for pa, pb, m in zip(interior.getdata(), still_raw.getdata(), still_mask.getdata())
                   if m == 255 for a, b in zip(pa, pb)]
    max_still = max(differences) if differences else 0
    decode_errors = {}
    for name in ('vantage-demo-framed.mp4', 'vantage-demo.mp4'):
        result = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(DEMO / name), '-f', 'null', '-'],
                                capture_output=True, text=True)
        decode_errors[name] = {'exit': result.returncode, 'stderr': result.stderr.strip()}
    # Exclude deliberate paused opening and tab activation; include both camera
    # changes and their live reading holds, not just cherry-picked still samples.
    motion_windows = [
        f"{MARKERS['overview'] - SOURCE_START + 0.2:.3f}:{MARKERS['timing_action'] - SOURCE_START - 0.2:.3f}",
        f"{MARKERS['closing'] - SOURCE_START + 0.8:.3f}:{DURATION - 0.1:.3f}",
    ]
    motion = {}
    for name in ('vantage-demo.mp4', 'vantage-demo-framed.mp4'):
        motion[name] = json.loads(subprocess.check_output([
            'python3', str(DEMO / 'check-motion.py'), str(DEMO / name),
            '--windows', ','.join(motion_windows), '--fps', str(FPS)]))
    verification = {
        'raceMotion': motion,
        'frameCountIdentical': framed['frames'] == plain['frames'] == frames,
        'durationIdentical': abs(framed['durationSeconds'] - plain['durationSeconds']) < 0.001,
        'framedStillInteriorMaxAbsDiff': max_still,
        'appRegionSampleDiff': app_region_diff(DEMO / 'vantage-demo-framed.mp4', DEMO / 'vantage-demo.mp4', off),
        'fullDecode': 'passed' if all(v['exit'] == 0 and not v['stderr'] for v in decode_errors.values()) else 'FAILED',
        'decode': decode_errors,
        'note': 'Framed stills are byte-identical inside the rounded screen area (max 0). The framed/frameless video difference is H.264 re-encoding noise; only the four screen corners are rounded.',
    }
    capture = {
        'capture': 'Fresh native iOS Simulator recording; one continuous hands-on take at normal speed',
        'device': 'iPhone 17 Pro, iOS 26.5 Simulator (402x874 pt @3x = 1206x2622 px)',
        'sourceCapture': SOURCE.name,
        'sourceSha256': source_sha,
        'durationSeconds': DURATION,
        'trim': {'startSeconds': SOURCE_START, 'durationSeconds': DURATION},
        'interactionMarkersSeconds': {name: round(value - SOURCE_START, 3)
                                     for name, value in MARKERS.items()},
        'transition': 'The app’s own camera easing, button feedback, tab changes, native sheet animation and continuous scroll; no editorial transitions.',
        'editing': 'Head/tail trim, resize, static device frame and H.264 compression only. No internal cuts, dissolves, speed changes, inserted still holds, touch overlays or fabricated app motion.',
        'timestampHandling': 'Ignore conflicting source DTS and preserve source PTS (+igndts). Decode from the beginning with output-side trim; encode constant 60fps.',
        'deviceFrame': 'Titanium band + black glass drawn around the capture. The app pixels are copied through untouched; only the 55 pt screen corners are rounded.',
        'exports': {'vantage-demo.mp4': plain, 'vantage-demo-framed.mp4': framed,
                    'vantage-demo-framed.gif': {'width': 250, 'height': 530, 'bytes': (DEMO/'vantage-demo-framed.gif').stat().st_size},
                    'vantage-demo.gif': {'width': 190, 'height': 414, 'bytes': (DEMO/'vantage-demo.gif').stat().st_size}},
        'verification': verification,
    }
    assert verification['frameCountIdentical'] and verification['durationIdentical'], verification
    assert verification['fullDecode'] == 'passed', verification
    assert max_still == 0, verification
    CAPTURE_JSON.write_text(json.dumps(capture, indent=2) + '\n')
    print('capture', CAPTURE_JSON)


if __name__ == '__main__':
    # Gallery stills are unchanged; build_stills() remains available separately.
    frames, off = build_videos()
    print('video frames', frames)
    build_gifs()
    build_capture(frames, off)
