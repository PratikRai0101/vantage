# Vantage — hands-on demo

**[Watch the demo](./vantage-demo-framed.mp4)** · 37.4 seconds · 780 × 1626 · 60 fps

One continuous, normal-speed recording of someone actually using the native app:

1. Press Play and watch the whole field move.
2. Tap Follow, then Battle; watch the camera ease into each view.
3. Open Timing and switch from Gap to Interval.
4. Open Lab and read the speed traces.
5. Open the comparison sheet, choose Carlos Sainz and see the traces update.
6. Slowly scroll down to the live telemetry values.
7. Return to Race, tap All cars and let the whole field play.

**Every interaction stays on screen.** There are no internal cuts or editorial
cross-dissolves. The transitions are the app's own camera easing, button
feedback, tab changes, sheet presentation/dismissal and scrolling. Each result
gets roughly two to three seconds to settle and be read. The slightly longer
runtime makes room for the actual interactions rather than replacing them with
screen-to-screen transitions.

The footage uses the bundled 2024 Japanese GP OpenF1 excerpt on the **iPhone 17
Pro, iOS 26.5 Simulator** (402 × 874 points at 3×). This is the working native
app, not a mockup or slideshow; it is not physical-iPhone performance evidence.

## Preview and sharing

[![Animated hands-on preview](./vantage-demo-framed.gif)](./vantage-demo-framed.mp4)

Use the **60 fps MP4** for smooth, full-quality playback. The smaller GIF preview
is limited to 20 fps and 64 colours; it is not the quality reference.

```html
<video controls muted playsinline preload="metadata"
  aria-label="Vantage hands-on app demo"
  style="display:block;width:100%;max-width:360px;height:auto">
  <source src="vantage-demo-framed.mp4" type="video/mp4">
  <a href="vantage-demo-framed.mp4">Watch the Vantage demo</a>
</video>
```

| File | Dimensions | What it is |
|---|---|---|
| `vantage-demo-framed.mp4` | 780 × 1626 | 60 fps demo inside the drawn iPhone frame |
| `vantage-demo.mp4` | 720 × 1566 | Identical continuous take without the frame |
| `vantage-demo-framed.gif` | 250 × 530 | 20 fps animated preview |
| `vantage-demo.gif` | 190 × 414 | Frameless preview |

The static titanium band and black glass sit outside the capture. Only the four
55 pt display corners are rounded. A single decoded stream feeds both encoders:
**2,243 frames in identical order**, both 37.383 seconds. No synthetic touch
indicators are drawn. The gallery stills are unchanged.

## Keeping it smooth

The original export's final race section contained a measured **4.8-second
freeze**. The simulator's H.264 source can carry conflicting decode and
presentation timestamps after idle screens. FFmpeg's default best-effort
timestamp selection can switch to decode timestamps, discard real moving
frames and pad the tail. A nominal frame-rate label does not catch this.

The pipeline ignores faulty DTS (`-fflags +igndts`) and uses source PTS. It
decodes from the beginning and trims only the head and tail. Playback is never
accelerated, and reading time is real time—not inserted still frames.

The motion check crops the race miniature away from updating HUD text, checks
both final encoded videos, and rejects long static runs and dark scene frames.
It includes the actual Follow/Battle camera changes, not just settled samples.
Intentional static Timing/Lab reading moments and the paused opening are excluded.
This detects sustained freezes; it is not a native GPU benchmark or a guarantee
against every perceptual judder.

## Reproduce

Requires macOS, Xcode, an installed Release app, ffmpeg, Ruby `xcodeproj`, and
Python with Pillow and NumPy. Raw footage, markers and XCTest results stay in
ignored `mobile/build-logs/ios-showcase/`.

```sh
DEVICE=434BDE2E-0A19-4F28-A838-969395AB2682
ruby mobile/scripts/native-smoke/generate.rb /tmp/vantage-smooth-ui \
  mobile/scripts/native-smoke/NativeShowcase.swift
xcodebuild build-for-testing \
  -project /tmp/vantage-smooth-ui/NativeSmoke.xcodeproj -scheme NativeSmoke \
  -destination "platform=iOS Simulator,id=$DEVICE" \
  -derivedDataPath /tmp/vantage-smooth-ui/build CODE_SIGNING_ALLOWED=NO
python3 Showcase/record-demo.py --device "$DEVICE"
python3 Showcase/create-demo.py
```

`NativeShowcase.testHandsOnVideo` performs the complete interaction sequence.
`record-demo.py` saves its start/end and interaction markers relative to the
recorder's first-frame acknowledgement. `create-demo.py` keeps that entire
start-to-end interval, encodes both videos and GIFs, and checks frame counts,
duration, full decoding and race motion. It decodes only once and applies the
static frame in FFmpeg; no screenshot montage is assembled. Do not run heavy
exports while capturing. A failed verification aborts evidence generation.

Machine-readable export and verification evidence:
[vantage-demo.capture.json](./vantage-demo.capture.json).
