#!/usr/bin/env python3
"""Trim and frame the real iPhone Simulator walkthrough.

The screen is continuous simulator video. This adds only a static phone bezel,
rounded screen mask and short fades; it never rebuilds the app or inserts
screenshots. Output is a silent 1080x1920 portrait film for the README.

Usage: python3 scripts/compose_ios_showcase.py
"""
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "mobile/build-logs/ios-showcase/short-raw-2.mp4"
WORK = ROOT / "mobile/build-logs/ios-showcase"
OUT = ROOT / "Showcase"
START = 17.5
DURATION = 31.0
W, H = 1080, 1920
SCREEN = (126, 60, 828, 1800)  # x, y, width, height
BG = "#101719"


def frame_assets():
    WORK.mkdir(parents=True, exist_ok=True)
    base = Image.new("RGBA", (W, H), BG)
    shadow = Image.new("RGBA", (W, H))
    ImageDraw.Draw(shadow).rounded_rectangle((105, 45, 975, 1885), radius=100, fill=(0, 0, 0, 220))
    base = Image.alpha_composite(base, shadow.filter(ImageFilter.GaussianBlur(28)))
    d = ImageDraw.Draw(base)
    d.rounded_rectangle((90, 30, 990, 1890), radius=100, fill="#07090B", outline="#3D454B", width=3)
    d.rounded_rectangle((98, 38, 982, 1882), radius=94, fill="#12171A", outline="#222A2F", width=2)
    d.rounded_rectangle((123, 57, 957, 1863), radius=78, fill="#050708")
    # Side buttons; presentation chrome only.
    for y0, y1 in ((420, 540), (600, 720), (1140, 1260)):
        d.rounded_rectangle((82, y0, 92, y1), radius=5, fill="#3B4349")
    d.rounded_rectangle((988, 510, 998, 650), radius=5, fill="#3B4349")
    base.save(WORK / "phone-frame.png")
    mask = Image.new("L", (SCREEN[2], SCREEN[3]), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, SCREEN[2] - 1, SCREEN[3] - 1), radius=78, fill=255)
    mask.save(WORK / "phone-mask.png")


def run(args):
    subprocess.run([str(a) for a in args], check=True)


def main():
    if not RAW.exists():
        raise SystemExit(f"Missing source recording: {RAW}")
    OUT.mkdir(exist_ok=True)
    frame_assets()
    x, y, w, h = SCREEN
    filters = [
        f"[0:v]trim=start={START}:duration={DURATION},setpts=PTS-STARTPTS,fps=30,"
        f"scale={w}:{h}:flags=lanczos,format=rgba,"
        f"fade=t=in:st=0:d=0.25,fade=t=out:st={DURATION - 0.35}:d=0.35[screen]",
        "[screen][2:v]alphamerge[masked]",
        f"[1:v][masked]overlay={x}:{y}:shortest=1[frame]",
        "[frame]format=yuv420p[final]",
    ]
    run(["ffmpeg", "-v", "error", "-y", "-ss", 0, "-i", RAW,
         "-loop", "1", "-i", WORK / "phone-frame.png",
         "-loop", "1", "-i", WORK / "phone-mask.png",
         "-filter_complex_threads", "1", "-filter_complex", ";".join(filters),
         "-map", "[final]", "-t", DURATION, "-r", 30, "-an",
         "-c:v", "libx264", "-preset", "slow", "-crf", "20",
         "-movflags", "+faststart", OUT / "vantage-demo.mp4"])
    run(["ffmpeg", "-v", "error", "-y", "-ss", "0.3", "-i", OUT / "vantage-demo.mp4",
         "-frames:v", "1", OUT / "poster.jpg"])
    run(["ffmpeg", "-v", "error", "-y", "-ss", "0", "-i", OUT / "vantage-demo.mp4", "-t", "6",
         "-filter_complex",
         "fps=10,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3",
         "-loop", "0", OUT / "preview.gif"])
    print("Wrote", OUT / "vantage-demo.mp4", OUT / "poster.jpg", OUT / "preview.gif")


if __name__ == "__main__":
    main()
