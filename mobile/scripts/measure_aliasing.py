#!/usr/bin/env python3
"""Measure edge aliasing on a Vantage capture.

The metric is deliberately simple and comparable across renders: find runs of
adjacent luma differences above `--small`, keep runs whose total contrast is at
least `--contrast`, then report how often a single pixel carries most of that
contrast. A hard 1-pixel staircase has a max-step ratio near 1.0; an antialiased
edge spreads the same contrast over two or more pixels.

Examples:
  python3 mobile/scripts/measure_aliasing.py shots/android-note20/01-overview.png \
    --crop 0,527,1080,1483 --reference shots/android-note20/baseline/overview-browser-msaa.png
  python3 scripts/measure_aliasing.py capture.png --panel /tmp/alias.png \
    --box 650,620,930,860
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def metrics(image: Image.Image, contrast: int, small: int, hard: float) -> dict:
    a = np.asarray(image.convert("RGB")).astype(np.float64)
    luma = 0.2126 * a[:, :, 0] + 0.7152 * a[:, :, 1] + 0.0722 * a[:, :, 2]
    hard_runs = total_runs = 0
    lengths: list[int] = []
    ratios: list[float] = []
    for axis in (0, 1):
        diffs = np.abs(np.diff(luma, axis=axis))
        if axis == 0:
            diffs = diffs.T
        for line in diffs:
            indices = np.where(line > small)[0]
            if not len(indices):
                continue
            start = previous = indices[0]
            for index in indices[1:]:
                if index > previous + 1:
                    segment = line[start:previous + 1]
                    if segment.sum() >= contrast:
                        total_runs += 1
                        lengths.append(len(segment))
                        ratio = float(segment.max() / segment.sum())
                        ratios.append(ratio)
                        hard_runs += int(ratio > hard)
                    start = index
                previous = index
            segment = line[start:previous + 1]
            if segment.sum() >= contrast:
                total_runs += 1
                lengths.append(len(segment))
                ratio = float(segment.max() / segment.sum())
                ratios.append(ratio)
                hard_runs += int(ratio > hard)
    ratios_array = np.array(ratios)
    return {
        "edge_runs": total_runs,
        "hard_step_fraction": round(hard_runs / total_runs, 4) if total_runs else 0,
        "mean_edge_length_px": round(float(np.mean(lengths)), 3) if lengths else 0,
        "mean_max_step_fraction": round(float(ratios_array.mean()), 4) if total_runs else 0,
    }


def panel(device: Image.Image, reference: Image.Image, box: tuple[int, int, int, int], out: Path) -> None:
    scale = 4
    width, height = box[2] - box[0], box[3] - box[1]
    image = Image.new("RGB", (width * scale * 2 + 40, height * scale + 50), "#202426")
    image.paste(device.crop(box).resize((width * scale, height * scale), Image.NEAREST), (10, 40))
    image.paste(reference.crop(box).resize((width * scale, height * scale), Image.NEAREST), (width * scale + 30, 40))
    draw = ImageDraw.Draw(image)
    draw.text((10, 12), "DEVICE / EXGL, no AA", fill="white")
    draw.text((width * scale + 30, 12), "BROWSER, MSAA reference", fill="white")
    image.save(out)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("--crop", help="x0,y0,x1,y1 crop before measuring")
    parser.add_argument("--reference", help="second capture, measured unchanged")
    parser.add_argument("--contrast", type=int, default=40)
    parser.add_argument("--small", type=int, default=6)
    parser.add_argument("--hard", type=float, default=0.8)
    parser.add_argument("--panel", help="write a 4x side-by-side crop panel")
    parser.add_argument("--box", help="x0,y0,x1,y1 crop for --panel")
    args = parser.parse_args()

    source = Image.open(args.image).convert("RGB")
    tested = source
    if args.crop:
        tested = tested.crop(tuple(int(value) for value in args.crop.split(",")))
    result = {"device": str(Path(args.image).resolve()), "metrics": metrics(tested, args.contrast, args.small, args.hard)}
    if args.reference:
        reference = Image.open(args.reference).convert("RGB")
        result["reference"] = str(Path(args.reference).resolve())
        result["reference_metrics"] = metrics(reference, args.contrast, args.small, args.hard)
        if "hard_step_fraction" in result["reference_metrics"]:
            delta = result["metrics"]["hard_step_fraction"] - result["reference_metrics"]["hard_step_fraction"]
            result["hard_step_excess_over_reference"] = round(delta, 4)
    if args.panel:
        if not args.box:
            raise SystemExit("--panel needs --box x0,y0,x1,y1")
        if not args.reference:
            raise SystemExit("--panel needs --reference")
        panel(tested, reference, tuple(int(value) for value in args.box.split(",")), Path(args.panel))
        result["panel"] = str(Path(args.panel).resolve())
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
