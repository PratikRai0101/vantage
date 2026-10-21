#!/usr/bin/env python3
"""Build the README screen frames from the real Note20 captures.

The source images are 1080x2400 Android screenshots. This crops the system
status bar and navigation bar, scales to a 720px-wide asset, and adds a thin
rounded border so the dark screen reads as a screen on both GitHub themes.

Usage: python3 scripts/make_readme_screenshots.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "shots" / "quality-overview" / "note20-ssaa"
OUTPUT = ROOT / "Screenshots"
CROP = (0, 100, 1080, 2250)  # top status bar / bottom Android navigation bar
WIDTH = 720
RADIUS = 16
BORDER = "#2B3D43"

FRAMES = [
    ("sweep-92s-overview.png", "01-race-overview.png"),
    ("03-follow.png", "02-race-follow.png"),
    ("08-battle.png", "03-race-battle.png"),
    ("09-timing.png", "04-timing.png"),
    ("12-lab.png", "05-telemetry.png"),
    ("11-foreground.png", "06-return-paused.png"),
]


def frame(source: Path, target: Path) -> None:
    image = Image.open(source).convert("RGB").crop(CROP)
    height = round(image.height * WIDTH / image.width)
    image = image.resize((WIDTH, height), Image.LANCZOS)

    # A rounded alpha mask keeps the corners clean without inventing device chrome.
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, image.width - 1, image.height - 1), radius=RADIUS, fill=255
    )
    framed = Image.new("RGBA", image.size, (0, 0, 0, 0))
    framed.paste(image, (0, 0), mask)
    ImageDraw.Draw(framed).rounded_rectangle(
        (0, 0, image.width - 1, image.height - 1),
        radius=RADIUS,
        outline=BORDER,
        width=1,
    )
    framed.save(target, optimize=True)
    print(f"{target.relative_to(ROOT)}  {framed.width}x{framed.height}")


def main() -> None:
    OUTPUT.mkdir(exist_ok=True)
    for source, target in FRAMES:
        frame(SOURCE / source, OUTPUT / target)


if __name__ == "__main__":
    main()
