# Note20 SSAA acceptance — 20 October 2026

Physical-device evidence for the 2× render-target supersample path.

- Device: Samsung Galaxy Note20 5G, SM-N981U1, Android 13.
- Display: 1080×2400, 60.000004 Hz, 450 dpi.
- Installed APK: `mobile/builds/vantage-ssaa.apk`.
- SHA-256: `63e16c33f7c2a3d9f53b5ec760a4afed4652d8943e8beb4f776d92f46230514f`.
- Installed package hash was pulled and compared; it matches the artifact.

## Image quality

Same screen, same `0,527,1080,1483` scene crop, same unaided capture method:

| capture | edge runs | hard-step fraction | mean edge length |
| --- | ---: | ---: | ---: |
| Note20 before SSAA (`../after-overview.png`) | 30,658 | 0.6404 | 1.648 px |
| Note20 with 2× SSAA (`01-overview.png`) | 27,157 | 0.2978 | 2.534 px |
| Browser 4× MSAA reference (`../full.png`) | 14,946 | 0.2392 | 2.551 px |

Full JSON: `alias-01-overview.json`. Reproduce from `mobile/`:

```sh
python3 scripts/measure_aliasing.py ../shots/quality-overview/note20-ssaa/01-overview.png \
  --crop 0,527,1080,1483
```

## Native camera/motion gate

`scripts/assert_native_motion.py` on the SSAA build:

- Camera changed pixels (overview → follow): **359,314**.
- Moving-field changed pixels (follow at 30s → 45s): **324,496**.
- Terrain coverage on overview: **54.65%** (`assert_native_scene.py`).
- Orbit visibility: follow 64.8% terrain / 30.7% dark; low orbit 70.2% / 25.0%;
  Battle 80.6% / 10.4%. All pass the retained gate.

The `playing-a.png` / `playing-b.png` frames are fixed paused deep links at 30s
and 45s, same camera and driver, so the pixel change cannot come from HUD text.

## Frame pacing

`dumpsys gfxinfo dev.vantage.spectator` aggregate, same deep link
(`time=0&driver=18&camera=follow&play=1`) for 30s and 100s after an 8s settle.
The comparison APK was `mobile/builds/vantage-before-ssaa.apk` (SHA-256
`c1fe7eff…`), installed and measured with the identical procedure, then the
SSAA APK was restored and re-hashed.

| 100s follow playback | before SSAA | 2× SSAA |
| --- | ---: | ---: |
| total frames | 5,653 (56.5 fps) | 5,686 (56.9 fps) |
| janky frames | 1.72% | 3.99% |
| frame p90 / p95 / p99 | 16 / 17 / 29 ms | 23 / 24 / 34 ms |
| GPU p90 / p95 / p99 | 7 / 9 / 10 ms | 14 / 16 / 18 ms |
| missed vsync | 0 | 11 |
| frame deadline missed | 97 | 227 |

The 30s pair shows the same direction: janky 0.86% → 3.15%, frame p95 14 → 24 ms,
GPU p95 6 → 16 ms. Raw extracts: `pacing-*-30s.txt`, `pacing-*-100s.txt`.

Battery temperature was 35.8°C before and 35.9°C after the 100s SSAA run. That is
battery temperature on a phone held at 100% charge, **not** a SoC/GPU thermal
measurement.

## 1.5× factor experiment

A 1.5× target was built from the same source and measured against 2× on the same
device, scene and crop.

| metric | 2× | 1.5× |
| --- | ---: | ---: |
| hard-step fraction | 0.2979 | 0.2946 |
| mean edge length | 2.529 px | 2.666 px |
| GPU p95, 100s | 16 ms | 11–12 ms |
| janky, 100s | 3.99% | 1.23% / 4.04% (two runs) |

The 4× nearest panel `alias-2x-vs-1.5x-panel.png` shows the 1.5× resolve is
visibly softer on kerbs and road edges. End-to-end jank was not consistently
better, because the compositor/UI path dominates; the lower GPU cost did not
translate into a reliable smoothness win. **2× remains shipped** for sharpness.
1.5× is retained as the lower-GPU fallback if thermal testing demands it. Raw
logs: `pacing-1.5x-*.txt`. The comparison 2× capture is
`overview-2x-driver18.png`.

## Blackout sweep

`scripts/capture_replay_sweep.py` recorded the 120s excerpt with Follow/Battle/
Overview changes on the SSAA build. The blackout gate samples at 4Hz and looks for
sustained lost/black scenes:

- 110s valid window, 440 samples, no suspect seconds.
- Worst terrain 39.8%; worst dark 52.9%.
- The handset was foregrounded to another app from about 110s, so the last 10s
  are excluded. The raw 119–121s hits were WhatsApp/Instagram, not Vantage.
- Captures: `sweep-92s-overview.png`, `sweep-108s-follow.png`.
- 4Hz sampling catches outages of roughly 250ms or longer. Shorter faults,
  ghosting and frame pacing are not excluded.

Summary: `sweep-summary.json`.

## Limits

- `gfxinfo` aggregates HWUI/compositor frame work and shared-GPU contention. It
  is not a Perfetto GPU trace, a GL-thread frame counter or a SurfaceFlinger
  per-frame presentation trace. The before/after comparison is valid because the
  procedure, scene, device and display mode were identical.
- The average frame count is similar, but 2× SSAA roughly doubles measured GPU
  frame cost and lifts late frames from ~1.7% to ~4.0%. Frame p95 is 24 ms on a
  60Hz panel (16.7ms budget), so **do not claim 60 fps**.
- Sustained SoC/GPU thermals, other Android devices, physical iPhone and
  accessibility remain unverified.
