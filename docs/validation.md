# Validation and remaining gates

## Established evidence — October 2026

This is a pre-release app, not a production-performance sign-off. The current
pure suite has 41 tests; run `cd mobile && npm run check` after changes. An XCTest
pass or an advancing HUD does not prove that native 3D frames are changing.

### iPhone 17 Pro Simulator, iOS 26.5

The Metal/WebGPU backend passes real viewport comparison: **446,917 camera /
24,120 moving-field changed pixels**. Current raw stills and motion inputs are in
[`shots/ios-showcase/`](../shots/ios-showcase/). The approved continuous hands-on
recording, encoding checks and motion results are in [`Showcase/`](../Showcase/).
Its **60 fps is an export format, not a physical-iPhone performance claim**.

The simulator source can have conflicting H.264 DTS/PTS after idle screens.
Default FFmpeg best-effort decoding previously produced a 4.8-second frozen tail.
The showcase preserves PTS with `-fflags +igndts` and checks the encoded miniature,
not just the clock or the recording's nominal frame rate.

### Samsung Note20 5G, SM-N981U1, Android 13

Retained physical-device evidence and raw measurements are in
[`shots/android-note20/`](../shots/android-note20/README.md):

- Release startup passes after the GLView constructor/JNI R8 keep rules.
- Camera/motion comparison on 2× SSAA: **359,314 / 324,496 changed pixels**.
- Overview framing fits the recorded circuit, not empty plinth: painted-edge
  extent **478×348 → 902×682 px**, same 1080×956 viewport.
- SSAA hard-step fraction **0.6404 → 0.2978**, mean edge **1.648 → 2.534 px**.
- Identical 100s Follow runs: janky frames **1.72% → 3.99%**, frame p95
  **17 → 24 ms**, GPU p95 **9 → 16 ms**. Average frame counts are similar, but
  the extra GPU cost exceeds the 16.7 ms budget; do not claim artifact-free 60 fps.
- A 110s camera-changing sweep, sampled at 4 Hz, found no sustained black scene.
  The final 10s were excluded because another app was foregrounded. This does
  not exclude shorter faults, ghosting or pacing problems.
- A 1.5× experiment reduced GPU cost but softened edges without consistently
  improving end-to-end jank; **2× remains shipped**, with no adaptive policy.
- The structural/display-clock split improved a bounded JS callback p95 from
  **41.716 → 17.869 ms**. This is scheduling evidence, not GPU completion;
  p99 remained roughly 43.6 ms.

## Corrections protected by regressions

- Safe tabletop orbit limits prevent grazing views from hiding the track.
- Painted loft geometry has outward winding; five real material batches have
  positive signed volume. Do not hide inverted geometry with DoubleSide.
- A wider derived route tangent removes digitisation-driven heading flips:
  whole-fixture maximum **179.905° → ~7.878°** per 1/60s step, without changing
  source positions or telemetry.
- Height-aware counted groups replace intersecting projected cars. The actual
  STR/HUL case at 78.5s conserves both streams and allows selecting either.
- The exported decorative wheel clears every road branch; model tests inspect
  actual GLB geometry, not only placement metadata.
- Paused Battle selection dependencies fix **HUL/HUL → HUL/TSU**. Retained
  native interaction captures are in `shots/android-note20/groups/`.

## Reproduce

Pure checks need no handset:

```sh
cd mobile
npm ci
npm run check
```

Native smoke test, with an installed simulator Release app:

```sh
ruby mobile/scripts/native-smoke/generate.rb /tmp/vantage-native-smoke
xcodebuild test -project /tmp/vantage-native-smoke/NativeSmoke.xcodeproj \
  -scheme NativeSmoke -destination 'platform=iOS Simulator,id=YOUR_UDID' \
  -resultBundlePath /tmp/vantage-native-smoke/result CODE_SIGNING_ALLOWED=NO
xcrun xcresulttool export attachments --path /tmp/vantage-native-smoke/result \
  --output-path mobile/build-logs/native-ui
python3 mobile/scripts/assert_native_scene.py overview.png
python3 mobile/scripts/assert_native_motion.py overview.png follow.png playing-a.png playing-b.png
```

Use the attachment manifest to locate the named screenshots; the bare PNG names
above are placeholders for those exported paths. Python image checks require
Pillow/NumPy. Motion crops exclude changing HUD text.

From `mobile/`, with an authorized Note20 and installed Release build:

```sh
bash scripts/assert_android_launch.sh build-logs/android-launch
python3 scripts/capture_android_render.py
python3 scripts/assert_orbit_visibility.py build-logs/render-repro/04-low-orbit.png
python3 scripts/assert_battle_identity.py
python3 scripts/measure_aliasing.py ../shots/android-note20/01-overview.png --crop 0,527,1080,1483
bash scripts/measure_presentation_pacing.sh ssaa 100
python3 scripts/capture_replay_sweep.py
# assert_recorded_scene.py accepts the app-only recording path from that sweep.
```

Capture scripts use device-specific coordinates/crops; do not treat them as a
cross-device harness. Do not record private launcher/other-app footage as product
media. Keep diagnostic outputs ignored under `mobile/build-logs/`; retain only
curated regression evidence in `shots/`.

## Still required

- A physical iPhone: offline asset load, moving scene/cameras, lifecycle, gestures,
  haptics, GPU pacing and thermals. Simulator acceptance is insufficient.
- Sustained Android GPU-trace/SoC thermal profiling, p99 hitches and more devices.
  HWUI aggregates are not a Perfetto GPU trace or a GL presentation counter.
- Reproduction of intermittent blackouts and ghosting if reported again; the
  bounded sweep does not dismiss those reports. Audit remaining scenery overlaps.
- VoiceOver/TalkBack, large text, contrast, reduced motion and real-device feel.
- Compatible dependency security remediation, distribution signing, commercial
  data/trademark clearance and store acceptance. Nothing is on an app store.

Older exploratory screenshots, one-off probe sources, comparison APKs and
step-by-step investigation journals are retired. Git history retains them;
these current guardrails and the curated measurements are the maintenance record.
