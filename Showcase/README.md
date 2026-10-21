# Vantage — portfolio walkthrough

[Watch the full walkthrough](vantage-demo.mp4) · [Animated excerpt](preview.gif) · [Poster](poster.jpg) · [Captions](captions.vtt) · [Capture manifest](manifest.json) · [Validation](validation.json)

A **2 minute 30 second**, 1920×1080 H.264 video (~5.8 MB) of the native app being
used, with ten embedded chapters and a separate WebVTT caption file.
The screen is live video throughout: moving cars, camera easing, tab navigation,
animated modal sheets, scrubbing, chart seeking and scrolling. It is not a
slideshow, browser mockup, or a set of screenshots with pans added.

## What is shown

| Time | Workflow |
| --- | --- |
| 00:00 | Real cold launch, then whole-field playback |
| 00:12 | Follow camera, orbit, reset, then Battle |
| 00:28 | Pause, drag the replay cursor, resume |
| 00:46 | Speed picker, 2× playback, return to 1× |
| 01:00 | Timing tab, Gap / Interval, select LEC to return to Race |
| 01:17 | Lab, choose NOR for comparison, seek on the chart, play/pause |
| 01:39 | Scroll through speed, throttle, binary brake, gear, RPM and sample ages |
| 01:54 | Expand the in-app reconstruction disclosure |
| 02:01 | Tap a group badge to cycle drivers; light and dark system appearance |
| 02:18 | Follow the selected car and finish in whole-field playback |

## Capture provenance

- **Runtime:** Android API 37 ARM64 emulator at 1080×2400 / 450dpi, release APK.
- **App:** Expo SDK 58 / React Native 0.88 / Expo GL / Three.js. No WebView.
- **Build:** `vantage-polish1.apk`, SHA-256
  `f35bbd9d00871952f0be55be601db80ce50046ec61075e02693897cecdbcd483`.
- **Data:** bundled historical OpenF1 session 9496, Japanese GP 2024,
  120-second excerpt; 20 driver records, 17 moving streams.
- **Presentation frame:** original iPhone-style vector bezel added in the video
  compositor. **The footage is not an iPhone runtime recording.** The capture
  source is disclosed in the video footer as well as here.
- **Onboarding:** this app does not have onboarding, account creation or a race
  browser. The video starts at the real cold launch rather than inventing them.
- **Sound:** silent; no unlicensed music or generated narration.

The film includes the scrubber and compact Timing/Lab layout pass. The README's
separate still gallery is from the earlier physical Note20 build. Emulator
playback is not a physical-device FPS or thermal benchmark; physical iPhone
acceptance remains open.

## Editing

Two actual screen recordings were used. The main take covers launch through the
reconstruction disclosure; the closing take covers grouped selection, appearance
and continued playback. The launcher and a few missed touches were trimmed.

The native screen was not reconstructed or retimed. It is scaled into a rounded
mask inside the presentation bezel. Editorial chapter copy fades on the left;
these fades are **not** claimed to be animations implemented in the app. Tab
navigation and camera/sheet transitions are preserved as the app renders them.
A 30fps output container duplicates source frames where necessary; no optical
flow or synthetic intermediate frames were added.

Pinch zoom, haptics, TalkBack/VoiceOver, interrupted/background recovery, and
long-run GPU/thermal behavior are not demonstrated by this film. Implemented is
not the same as verified: see [NATIVE-VALIDATION.md](../NATIVE-VALIDATION.md).

## Reproduce

Requires the release app installed on a dedicated Android emulator matching the
capture geometry, Android platform-tools, ffmpeg/ffprobe, Python and Pillow.
Use the cached local build or build from `mobile/` with the documented JDK/SDK.

```sh
# Dedicated emulator only; never drives a personal phone or another app.
# The capture driver expects 1080×2400 / 450dpi and dark appearance.
export SHOWCASE_SERIAL=emulator-5554
adb -s "$SHOWCASE_SERIAL" install -r mobile/builds/vantage-polish1.apk
adb -s "$SHOWCASE_SERIAL" shell cmd uimode night yes
# Keep system window/transition/animator animation scales at 1.
python3 scripts/capture_showcase.py
python3 scripts/render_showcase.py
```

Unedited recordings, action timestamps and intermediate renders stay under
`mobile/build-logs/portfolio-capture/` (ignored). Finished deliverables,
`manifest.json` and this provenance record are committed under `Showcase/`.
Chapter edits are calibrated to the captured take; review and adjust them if
runtime startup/navigation timing differs on a new capture.
