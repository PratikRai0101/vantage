# Native foundation — acceptance log

## Current status

**Physical Android startup, camera change, moving-field and 2× SSAA checks now pass on Samsung Note20 5G / Android13 after the release keep-rule fixes below. iOS Simulator moving replay remains NOT accepted.** Native UI/clock work, and genuine GPU readback shows changing 3D cameras. iOS Simulator screen captures retain the first GL image. This may be an EXGL simulator presentation/capture limitation; it is not yet established as a physical-device failure. Do not mistake offscreen rendering or passing UIKit tests for successful visible playback.

Expo58.0.14 / React Native0.88 / React19.3 / Three0.180. Native UI and EXGL, no WebView or screenshot fallback. Bundled 2024 Suzuka historical fixture, seventeen moving streams / twenty driver records. Personal evaluation only; no commercial/live rights clearance.

## Verified

- Race / Timing / Lab routes, provider-owned replay clock, recorded timing and telemetry.
- TypeScript + ESLint pass; 23 pure tests cover replay, scene maths, formatting, native adapter and actual GLTFLoader host behavior.
- Expo Doctor:20/20 checks passed.
- Local arm64 iOS Simulator Release `.app` compiles, installs and launches on iPhone17Pro / iOS26.5. It is not an iPhone-signed device app.
- Android Release APK builds with JDK21.0.12.1, Gradle9.4.1, NDK27.1.12297006. Test signing only, not Play signing; the SSAA build passes runtime acceptance on the Note20 (see below).
- Initial native miniature genuinely renders. `shots/native-v1/04-race-r3-late.png`: terrain visibility17.2674%, versus0% for renderer-failure captures.
- Standalone XCTest taps actual native cameras, play/pause and tabs and exports eight captures, including return to Race.
- Native GPU readbacks show different overview/follow geometry, not just changed UI labels. Preserved under `shots/native-v1/gpu-readback/`, explicitly separate from on-screen screenshots.
- Font/circuit/Three/React/RN/Expo/native acknowledgement text is included in `assets/licenses/third_party_notices.json`, embedded via expo-asset. Full distribution/license review remains a release gate.
- 2× SSAA is physical-device verified on Note20: hard-step fraction 0.640 → 0.298, mean edge 1.648 → 2.534px, and the camera/motion gate passes at 359,314 / 324,496 changed pixels. Identical 100s Follow runs measured 1.72% → 3.99% janky frames, frame p95 17 → 24ms and GPU p95 9 → 16ms. This is aggregate HWUI/GPU contention, not a GPU trace; do not claim 60fps. A 110s camera-changing sweep found no sustained blackout at 4Hz sampling. Evidence: `shots/quality-overview/note20-ssaa/`.

## Physical Android startup regression (Note20 5G, Android13)

USB device SM-N981U1 reproduced the user's immediate release startup crash. `scripts/assert_android_launch.sh` fails `FAIL: app died during startup`. The fatal exception is `Didn't find a correct constructor for class le2`; the matching R8 mapping identifies `le2` as `expo.modules.gl.GLView`. Expo58 `ViewDefinitionBuilder.createViewFactory()` uses `getConstructor(Context, AppContext)`, while GLView extends TextureView rather than ExpoView. Release optimization removed the reflected constructor. A narrow CNG config plugin, `plugins/with-gl-constructor.js`, preserves the GLView constructor without disabling R8. That fix exposes a second stripped native boundary: `EXGLJniApi.cpp` invokes `GLContext.flush()` through `GetMethodID`, causing `JNI DETECTED ERROR: mid == null`. The plugin also preserves that exact callback. No native vendor-source edits.

Rebuilt Release APK installed on the user's phone. `bash scripts/assert_android_launch.sh build-logs/android-launch-verified` now passes: release process11347 survives launch. Overview→Follow and playing-a→playing-b screenshots under `shots/android-note20/` pass the real GL-region comparison: **847,288 camera changed pixels / 451,160 moving-field changed pixels**. Screenshot inspected: native Follow geometry and clock00:06.4. This establishes visible camera and playback changes on this handset, not FPS, thermals, all cameras, every interaction or broad device compatibility. TypeScript/ESLint and23 tests pass. The fixed APK replaces `mobile/builds/vantage-replay.apk` and is already installed on the phone.

## Red gate retained

`mobile/scripts/assert_native_motion.py` rejects on-screen captures: **camera0 changed pixels, moving-field0**. This crops away from changing HUD labels. The UIKit test can pass while GL playback fails; both checks are required.

The approved working browser replay remains available, unchanged. Native Race explicitly labels itself a preview with presentation under investigation.

## Diagnosis and completed fixes

1. Expo58 WebGL2 inherits WebGL1; Three r180 misclassifies an explicitly supplied context. Normal `canvas.getContext('webgl2')` acquisition fixes this. Genuine WebGL2 check retained; no fabricated GPU capabilities, extension results or global WebGL classes.
2. GLTFLoader inspects missing RN `navigator.userAgent` even for an image-free GLB. Honest ReactNative host metadata fixes it; an actual GLTFLoader test reproduces the failure then passes, preserving existing browser UA.
3. Shared clock, camera targets and GPU draw callbacks continue correctly. Local traces showed finite changing camera matrices/zoom and advancing engine time. GPU readback confirms real new views.
4. Activity-aware surface recreation and a memoized, non-collapsing GL host are retained for resource ownership. These did not make the screen-capture gate pass.
5. Explicit native framebuffer binding did not fix the screen issue; removed.
6. A pinned native presentation trial scheduled actual drawable presentation after EXGL blitting. It did not fix the gate; **fully rolled back**, including the node_modules Swift source and config plugin.
7. Temporary JSON tracing, extra blocking getError probe and GPU readback hooks were removed from application code. They were local-only, not analytics or performance measurements. No vendor patch or fake image fallback is shipped.

The expo-three maintainer explicitly warns about poor Three/EXGL simulator behavior; see `NATIVE-RENDERER.md`. We have reached that compatibility gate, not proved the data/engine broken.

## Reproduce

Install the built app. Generate an independent UI test project (never hand-edit Expo native projects):

```sh
ruby mobile/scripts/native-smoke/generate.rb /tmp/vantage-native-smoke
xcodebuild test -project /tmp/vantage-native-smoke/NativeSmoke.xcodeproj \
  -scheme NativeSmoke -destination 'platform=iOS Simulator,id=YOUR_UDID' \
  -resultBundlePath /tmp/vantage-native-smoke/result CODE_SIGNING_ALLOWED=NO
xcrun xcresulttool export attachments --path /tmp/vantage-native-smoke/result \
  --output-path shots/native-ui
```

Use the exported attachment manifest to identify overview/follow/playing-a/playing-b:

```sh
python3 mobile/scripts/assert_native_scene.py overview.png
python3 mobile/scripts/assert_native_motion.py overview.png follow.png playing-a.png playing-b.png
```

Python helpers require Pillow. The motion crop is calibrated to this native402×874 capture. XCTest success alone is not the final verdict. Logs and artifacts are ignored under `mobile/build-logs` / `mobile/builds`; screenshots remain under `shots/native-v1`.

## Native polish checkpoint

A subsequent native-only miniature pass is installed on Note20: baked vertex contact light, refined car meshes, antialiased Plex labels, rounded terrain, stable wider Follow and tighter truthful Battle, plus smoothing of visual road backtracking seams. Replay fixtures unchanged. Final screen gate **462512 camera / 295405 moving-field pixels** passes; TypeScript/ESLint and26 tests pass, Expo Doctor20/20. See `NATIVE-POLISH.md` for screenshots, critique and limits. Earlier23-test/initial-model descriptions above are historical checkpoints. The iOS `.app` has not been rebuilt for this visual pass.

## Follow-up rendering defects

The user subsequently reported black/noisy surfaces, overlaps, ghosting, poor visibility and choppy motion. A targeted device investigation corrected grazing-angle orbit, inward-wound car paint geometry and source-route heading flips. Subsequent work adds counted groups for intersecting projected cars, actual-GLB landmark clearance, five shared car batches and a paused Battle-header dependency fix.35 tests pass; startup/orbit/moving-field and native count-selection gates pass on Note20. A controlled Note20 pacing comparison then found the 10Hz React text commit (32-39ms per tick) dropping the callback loop to ~45fps; structural state and the display cursor are now separate channels and readouts update at 1Hz whole seconds. `scripts/assert_js_pacing.py` passes (p95 17.869ms, target<=25ms) with the visible clock verified advancing 01:14->01:17. These corrections are **not** an all-blackout/ghosting/production-performance resolution. `RENDER-STABILITY.md` records exact red→green evidence and open defects.

A later user report — the whole-field view being blurry, low-poly and unreadable — measured out as a framing defect, not a low-resolution buffer: the drawing buffer was already 1080×956 native pixels, but the static overview zoom 1 framed the plinth and left the circuit at 43% of the frame width (cars ~19px). `overviewGoal()` now fits the recorded circuit per aspect inside the approved studio angle; on Note20 the circuit's painted-edge extent grew 478×348px → 902×682px at fitted zoom 1.879, labels gained asymmetrical headroom and the selected car no longer carries a field dot over its bodywork.36 tests pass. Device evidence `shots/quality-overview/{before,after}-overview.png`. Follow/Battle re-capture and native antialiasing remain outstanding.

A follow-up confirmed the open aliasing report against the same overview frame: the Note20 capture's hard-step fraction is 0.640 versus 0.224 for the browser 4× MSAA reference. Installed expo-gl exposes no Android MSAA path (`msaaSamples` is iOS-only, the EGL config requests no samples, and `renderbufferStorageMultisample` is UNIMPL), so the renderer now uses a 2× render target and a linear fullscreen resolve, with an sRGB target where the driver completes it. Android emulator before/after on the same screen and crop: hard-step fraction 0.611 → 0.285, mean edge length 1.70 → 2.53px.39 tests pass. The SSAA build is now device-verified on the Note20: hard-step 0.640 → 0.298, motion gate 359,314 / 324,496 pixels, 100s aggregate pacing 1.72% → 3.99% janky and GPU p95 9 → 16ms. Follow/Battle were re-captured after the framing change and pass. See `RENDER-STABILITY.md` and `shots/quality-overview/note20-ssaa/`.

## Next acceptance action

**Android handset acceptance is current for the installed SSAA build; test an actual iPhone before further speculative iOS presentation changes.** Samsung Note20 USB validation now establishes visible native replay, Follow/Battle framing and the 2× SSAA path after fixing two R8 entry-point issues. No physical iPhone is connected; app-owned agent device access remains disabled, but Android ADB is available. If real-device presentation also fails, use the documented Metal/Filament fallback (or a separately time-boxed native WebGPU preservation spike), keeping the replay engine, data, routes and approved direction. Do not introduce several renderers simultaneously.

Still required: physical iPhone acceptance, a GPU-trace (Perfetto) and thermal profile, gesture/haptic/VoiceOver/TalkBack/interruption checks, small-screen/light/large-text coverage and independent native visual critique. The 2× SSAA path costs roughly twice the measured GPU frame time and raises late frames to ~4%; decide whether that trade is acceptable for the target device class or add a 1.5×/adaptive mode. GPU glyphs/antialiasing are foundation quality, not final visual acceptance. Dependency audit currently27 advisories (8moderate/19high); assess and patch compatibly before production. Accounts, billing, backend/live feeds and commercial data rights remain deferred.
