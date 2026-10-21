#!/usr/bin/env python3
"""Edit real native recordings into a 1080p iPhone-style portfolio presentation.

Requires ffmpeg/ffprobe and Pillow. The screen is always continuous video, never
an animated screenshot. Only chapter copy, framing and cross-take edits are editorial.
Input recordings stay local; checked-in outputs are under Showcase/.
"""
import json
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'mobile/build-logs/portfolio-capture'
WORK = RAW / 'render'
OUT = ROOT / 'Showcase'
W, H = 1920, 1080
SCREEN = (1260, 49, 442, 982)
FONT = ROOT / 'assets/archivo-800.ttf'
MONO = ROOT / 'assets/ibm-plex-mono-400.ttf'
BODY = Path('/System/Library/Fonts/Supplemental/Arial.ttf')
BG, INK, MUTED, BLUE = '#0C1215', '#F1F3EF', '#A8BBC1', '#BCD5EC'

# Preserve the actual splash, navigation, sheets, camera easing and gestures.
# Discard only the emulator launcher at the start and missed touches at the end.
CUTS = [
    ('workflow.mp4', .75, 117.5),
    ('workflow.mp4', 119, 123),
    ('closing.mp4', 0, 29),
]
# Output-relative chapter starts, calibrated against the decoded recording.
CHAPTERS = [
    (0, '01', 'A race, in miniature.', ['Launch straight into Suzuka.', '17 moving streams. Recorded, not simulated.'], 'Launch + whole-field replay'),
    (12, '02', 'Find your angle.', ['Overview. Follow. Battle.', 'Orbit the circuit, then reset your camera.'], 'Three cameras + native orbit'),
    (28, '03', 'Hold the moment.', ['Pause, scrub and resume.', 'Replay the field at your own pace.'], 'Shared replay clock + seeking'),
    (46, '04', 'Change the pace.', ['Native speed sheets.', 'Choose 0.25x through 4x playback.'], 'Playback speed controls'),
    (60, '05', 'Read the race.', ['Recorded gaps and intervals.', 'Select a driver to return to the miniature.'], 'Timing + driver selection'),
    (77, '06', 'Compare the details.', ['Choose two drivers.', 'Seek from their time-aligned speed traces.'], 'Lab + comparison + chart seeking'),
    (99, '07', 'Inspect the telemetry.', ['Speed, throttle, brake, gear and RPM.', 'Source age stays visible beside the numbers.'], 'Recorded telemetry + source ages'),
    (114, '08', 'Show the limits, too.', ['Illustrative lanes. Approximate positioning.', 'The reconstruction says what it can prove.'], 'In-app reconstruction disclosure'),
    (120.75, '09', 'Every driver counts.', ['Tap grouped projections to cycle selection.', 'System appearance adapts from light to dark.'], 'Group selection + light / dark'),
    (137.75, '10', 'Back to the field.', ['One replay. Three perspectives.', 'Built by Pratik Rai.'], 'Resume + whole-field finale'),
]


def run(args):
    subprocess.run([str(a) for a in args], check=True)


def font(path, size):
    return ImageFont.truetype(str(path), size)


def draw_base():
    im = Image.new('RGB', (W, H), BG)
    shadow = Image.new('RGBA', (W, H))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((1244, 40, 1724, 1056), radius=76, fill=(0, 0, 0, 210))
    im = Image.alpha_composite(im.convert('RGBA'), shadow.filter(ImageFilter.GaussianBlur(24)))
    d = ImageDraw.Draw(im)
    # Original vector frame. It is presentation chrome, not an Apple device capture.
    d.rounded_rectangle((1242, 30, 1720, 1050), radius=76, fill='#171B1F', outline='#596066', width=3)
    d.rounded_rectangle((1249, 37, 1713, 1043), radius=69, fill='#050708', outline='#252B2F', width=2)
    d.rounded_rectangle((1260, 49, 1702, 1031), radius=55, fill='#101719')
    d.rounded_rectangle((1237, 210, 1244, 278), radius=3, fill='#434B51')
    d.rounded_rectangle((1237, 294, 1244, 360), radius=3, fill='#434B51')
    d.rounded_rectangle((1718, 270, 1725, 368), radius=3, fill='#434B51')

    icon = Image.open(ROOT / 'mobile/assets/images/icon.png').convert('RGBA').resize((66, 66), Image.Resampling.LANCZOS)
    mask = Image.new('L', (66, 66)); ImageDraw.Draw(mask).rounded_rectangle((0, 0, 65, 65), radius=15, fill=255)
    im.paste(icon, (112, 77), mask)
    d = ImageDraw.Draw(im)
    d.text((202, 93), 'PRATIK RAI  /  PRODUCT WALKTHROUGH', font=font(MONO, 18), fill=MUTED)
    d.text((106, 185), 'Vantage', font=font(FONT, 112), fill=INK)
    d.text((112, 328), 'Native 3D Formula 1 replay', font=font(BODY, 31), fill=MUTED)
    d.line((112, 400, 1040, 400), fill='#2B3D43', width=1)
    d.text((112, 856), 'EXPO  /  REACT NATIVE  /  TYPESCRIPT  /  THREE.JS', font=font(MONO, 17), fill=MUTED)
    d.text((112, 904), 'Historical OpenF1 excerpt  |  No WebView or video playback in the app', font=font(BODY, 22), fill=MUTED)
    d.line((112, 982, 1040, 982), fill='#2B3D43', width=1)
    d.text((112, 1006), 'ANDROID EMULATOR CAPTURE  /  IPHONE-STYLE PRESENTATION FRAME', font=font(MONO, 15), fill=MUTED)
    d.text((1260, 1053), 'Native capture. Not an iPhone runtime test.', font=font(BODY, 16), fill=MUTED)
    im.convert('RGB').save(WORK / 'base.png')

    mask = Image.new('L', (SCREEN[2], SCREEN[3]))
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, SCREEN[2]-1, SCREEN[3]-1), radius=55, fill=255)
    mask.save(WORK / 'screen-mask.png')
    island = Image.new('RGBA', (W, H))
    di = ImageDraw.Draw(island)
    di.rounded_rectangle((1423, 60, 1539, 88), radius=14, fill='#030405')
    di.ellipse((1516, 68, 1527, 79), fill='#111C24', outline='#1B2833')
    island.save(WORK / 'island.png')


def draw_chapter(index, chapter):
    _, number, title, lines, hint = chapter
    im = Image.new('RGBA', (W, H))
    d = ImageDraw.Draw(im)
    d.text((112, 451), f'{number} / 10', font=font(MONO, 20), fill=BLUE)
    size = 66
    while d.textbbox((0, 0), title, font=font(FONT, size))[2] > 950:
        size -= 1
    d.text((108, 506), title, font=font(FONT, size), fill=INK)
    for row, line in enumerate(lines):
        d.text((112, 606 + row*44), line, font=font(BODY, 29), fill=MUTED)
    d.rounded_rectangle((112, 736, 117, 773), radius=2, fill=BLUE)
    d.text((133, 742), hint, font=font(MONO, 19), fill=BLUE)
    for j in range(10):
        d.rounded_rectangle((112+j*39, 815, 135+j*39, 819), radius=2,
                            fill=BLUE if j == index else '#2B3D43')
    im.save(WORK / f'chapter-{index:02}.png')


def add_chapters(duration):
    metadata = [';FFMETADATA1', 'title=Vantage — native app walkthrough', 'artist=Pratik Rai',
                'comment=Android emulator capture in an iPhone-style presentation frame; not an iPhone runtime test.']
    captions = ['WEBVTT', '']
    def timestamp(seconds):
        millis = round(seconds * 1000)
        return f'{millis//3600000:02}:{millis//60000%60:02}:{millis//1000%60:02}.{millis%1000:03}'
    for i, (start, number, title, lines, hint) in enumerate(CHAPTERS):
        end = CHAPTERS[i+1][0] if i+1 < len(CHAPTERS) else duration
        metadata += ['[CHAPTER]', 'TIMEBASE=1/1000', f'START={round(start*1000)}',
                     f'END={round(end*1000)}', f'title={number}. {hint}']
        captions += [f'{timestamp(start)} --> {timestamp(end)}', title, ' '.join(lines), '']
    (WORK/'chapters.ffmetadata').write_text('\n'.join(metadata)+'\n')
    (OUT/'captions.vtt').write_text('\n'.join(captions)+'\n')
    temp = WORK/'chaptered.mp4'
    run(['ffmpeg','-v','error','-y','-i',OUT/'vantage-demo.mp4','-i',WORK/'chapters.ffmetadata',
         '-map','0:v:0','-map_metadata','1','-map_chapters','1','-c','copy','-movflags','+faststart',temp])
    temp.replace(OUT/'vantage-demo.mp4')


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(exist_ok=True)
    for filename, _, _ in CUTS:
        if not (RAW / filename).exists(): raise SystemExit(f'Missing recording: {RAW/filename}')
    draw_base()
    for i, ch in enumerate(CHAPTERS): draw_chapter(i, ch)

    # Normalize VFR capture for editing. No optical flow, frame synthesis or screen replacement.
    for i, (source, start, end) in enumerate(CUTS):
        run(['ffmpeg', '-v', 'error', '-y', '-ss', start, '-i', RAW / source,
             '-t', end-start, '-map', '0:v:0', '-an', '-vf', 'fps=30,setsar=1',
             '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', WORK / f'part-{i}.mp4'])
    (WORK / 'concat.txt').write_text(''.join(f"file '{WORK/f'part-{i}.mp4'}'\n" for i in range(len(CUTS))))
    run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',WORK/'concat.txt',
         '-map','0:v:0','-c','copy',WORK/'screen.mp4'])
    duration = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration',
                    '-of','default=nw=1:nk=1',str(WORK/'screen.mp4')]))

    cmd = ['ffmpeg','-v','warning','-y','-i',WORK/'screen.mp4',
           '-loop','1','-i',WORK/'base.png','-loop','1','-i',WORK/'screen-mask.png',
           '-loop','1','-i',WORK/'island.png']
    for i in range(len(CHAPTERS)):
        cmd += ['-loop','1','-i',WORK/f'chapter-{i:02}.png']
    x,y,w,h = SCREEN
    filters = [f'[0:v]scale={w}:{h}:flags=lanczos,format=rgba[screen]',
               '[screen][2:v]alphamerge[masked]',
               f'[1:v][masked]overlay={x}:{y}:shortest=1[phone]',
               '[phone][3:v]overlay=shortest=1[stage]']
    previous = 'stage'
    for i, (start, *_) in enumerate(CHAPTERS):
        end = CHAPTERS[i+1][0] if i+1 < len(CHAPTERS) else duration
        name = f'copy{i}'
        filters.append(f'[{i+4}:v]format=rgba,fade=t=in:st={start}:d=0.32:alpha=1,'
                       f'fade=t=out:st={max(start,end-.25)}:d=0.25:alpha=1[{name}]')
        output = f'stage{i}'
        filters.append(f'[{previous}][{name}]overlay=enable=\'between(t,{start},{end})\':shortest=1[{output}]')
        previous = output
    filters.append(f'[{previous}]fade=t=in:d=0.35,fade=t=out:st={duration-.65}:d=0.65,format=yuv420p[final]')
    cmd += ['-filter_complex_threads','1','-filter_complex',';'.join(filters),'-map','[final]',
            '-t',duration,'-r','30','-an','-c:v','libx264','-preset','fast','-crf','22',
            '-movflags','+faststart',OUT/'vantage-demo.mp4']
    run(cmd)
    add_chapters(duration)
    run(['ffmpeg','-v','error','-y','-ss','15','-i',OUT/'vantage-demo.mp4','-frames:v','1',OUT/'poster.jpg'])
    run(['ffmpeg','-v','error','-y','-ss','10','-i',OUT/'vantage-demo.mp4','-t','8',
         '-filter_complex','fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3',
         '-loop','0',OUT/'preview.gif'])
    manifest = {
        'title':'Vantage — native app walkthrough', 'durationSeconds':duration,
        'output':'1920x1080 / H.264 / 30fps container / silent',
        'capture':'Android API 37 emulator, release APK, genuine Expo GL and React Native UI',
        'apkSHA256':'f35bbd9d00871952f0be55be601db80ce50046ec61075e02693897cecdbcd483',
        'frame':'Original iPhone-style vector presentation frame; NOT an iPhone runtime capture',
        'onboarding':'Not implemented; the video starts at real cold launch, with no invented screens',
        'editing':'Launcher trimmed; one cross-take cut to grouped selection and appearance. No screenshot-based sequences, optical-flow synthesis or simulated native transitions. Chapter copy fades are editorial.',
        'cuts':[{'recording':f,'in':a,'out':b} for f,a,b in CUTS],
        'chapters':[{'seconds':c[0],'title':c[2],'features':c[4]} for c in CHAPTERS],
        'limits':['No physical iPhone acceptance claim','Emulator presentation is not a device FPS benchmark','No audio, music or narration','Pinch, haptics, screen readers and background recovery are not demonstrated in this film'],
    }
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('Rendered',OUT/'vantage-demo.mp4','duration:',duration)


if __name__ == '__main__':
    main()
