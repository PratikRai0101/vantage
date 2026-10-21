#!/usr/bin/env python3
"""Build the README screen frames from the real iPhone Simulator captures.

Source images are 1206x2622 screenshots from the iPhone 17 Pro Simulator. The
script scales them to 720px, applies the screen's rounded corners and a thin
border. It does not crop the status bar or repaint any part of the app.

Usage: python3 scripts/make_readme_screenshots.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "shots" / "ios-showcase"
OUTPUT = ROOT / "Screenshots"
WIDTH = 720
RADIUS = 38
BORDER = "#2B3D43"

FRAMES = [
    ("01-overview.png", "01-race-overview.png"),
    ("02-follow.png", "02-race-follow.png"),
    ("03-battle.png", "03-race-battle.png"),
    ("04-timing.png", "04-timing.png"),
    ("05-lab.png", "05-telemetry.png"),
    ("06-telemetry.png", "06-telemetry-values.png"),
    ("07-return.png", "07-return-paused.png"),
]


def frame(source: Path, target: Path) -> None:
    image = Image.open(source).convert("RGB")
    height = round(image.height * WIDTH / image.width)
    image = image.resize((WIDTH, height), Image.LANCZOS)
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
