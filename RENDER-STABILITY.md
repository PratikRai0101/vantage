# Android rendering/motion defects — targeted correction

## Status

Initial round corrected three concrete faults. Follow-up adds honest counted grouping for intersecting car projections, moves a decorative landmark clear of the road, batches the field's car geometry and corrects a stale paused Battle header. Release builds tested on Samsung Note20 5G SM-N981U1 / Android13. **This is not a claim that all reported blackouts, ghosting, overlaps or choppiness are fixed.** User reports remain open where not independently reproduced.

## Red → green evidence

### 1. Grazing orbit hides the race

`python3 mobile/scripts/assert_orbit_visibility.py mobile/build-logs/render-repro/04-low-orbit.png`

Before: terrain16.2%, dark82.3%; **FAIL: grazing orbit loses useful race view behind plinth/horizon**.

Cause: orbit allowed polar angle87.1° (only2.9° above the horizon) and zoom12. Cars disappeared behind scenery/plinth; most of the viewport showed dark background/underside. This explains a reproducible visibility failure, not every intermittent GPU blackout.

Fix: tabletop polar angle0.30–1.02radians (minimum elevation31.6°), zoom cap2 Overview /4.2 Follow and Battle, gentler horizontal orbit sensitivity. Near/far depth range tightened1–350 instead of0.1–700; this is a depth-precision improvement, **not independently proven to eliminate flicker**.

Same gesture after first correction: terrain64.7%, dark26.4%, PASS. Final installed build, selected LEC: terrain61.3%, dark25.2%, PASS. Captures `shots/render-stability/` and `shots/render-stability/final/`.

### 2. Painted car shell faces inward

Actual merged paint geometry had signed volume **−0.1234508293**. The real `carModel()` test failed before the fix. Loft side/cap triangles were wound inward, so backface culling removed normally visible paint panels and lighting used inward normals. This was a geometry bug, not an intended black carbon material.

Fix: reverse loft triangle winding before computing normals. Keep ordinary front-face culling; do not hide the fault with DoubleSide materials or extra lights. All five actual car material batches now have positive signed volume; real car construction/bounds/batching test passes. Final native capture `shots/render-stability/final/lec-playing-a.png` shows solid red bodywork, wings and cockpit.

### 3. Near-180° heading flip in one rendered step

An actual-fixture sweep of seventeen available drivers,120seconds at60Hz, found **179.905°** maximum one-step displayed heading change (LEC around61.15seconds). The old tangent sampled a tiny±0.0005phase baseline, following digitisation micro-loops in the illustrative route.

Fix: derive orientation from a wider±0.003phase track tangent. Exact same sweep now has maximum≈7.878° per1/60s step. A regression rejects any>45° one-step flip across the whole fixture. This changes derived visual orientation, **not measured steering, route positions, telemetry or race order**. Native replay recording around LEC60.5seconds saved locally in `mobile/build-logs/heading-native-check.mp4`.

## Overview framing defect (user-reported blur / low-poly whole-field view)

Report: "in the zoomed-out mode where we see all cars and we see the whole track, the resolution of everything is very blurry, and it is very low poly … I cannot figure out anything."

Cause, measured rather than guessed: the render was **not** downscaled. `gl.drawingBufferWidth/Height` are 1080×956 native pixels for the 1080×956 viewport (1:1), and canvas text is sharp in the same capture. The whole-field camera was the problem: `cameraGoal('overview')` returned the static studio pose at zoom 1, which frames the 114×68 plinth, not the circuit. The recorded centreline only projects 58×54 model units inside a 136×120 view, so the circuit used **43% of the frame width**: cars rendered ~19 px long, road ~5 px wide, kerbs 1–2 px. Small-feature mush, not a low-resolution buffer.

Fix: `overviewGoal(track, aspect)` in `src/scene/math.ts` keeps the approved three-quarter studio direction and solves the framing rectangle per aspect — projected circuit centroid on the frame axis, zoom set so the centreline plus ribbon margin fills the viewport, with asymmetrical headroom (6.6 model units above, 1.2 below) because driver labels and group badges are drawn above cars. Overview pinch limits became relative to the fitted frame (`orbitBounds`), and the first camera application snaps instead of easing in from the default pose. `cameraGoal('overview')` still returns the studio default for non-fitted callers.

Measured on the same device and viewport (paused, t=00:00, scene rect `[0,527][1080,1483]`):

| | before (static zoom 1) | after (fitted zoom 1.879) |
|---|---|---|
| circuit painted-edge extent | 478 × 348 px | 902 × 682 px |
| red/white kerb pixel area | 2.7 k px | 10.0 k px (3.7×) |
| plinth on screen | whole slab, 1024×538 px | full-bleed crop |
| top driver label | clipped at the viewport top edge | 28 px inside |

Evidence: `shots/quality-overview/before-overview.png`, `after-overview.png` (installed APK, real handset), and `full.png`/`review.png` from `scripts/preview-overview.ts` — a browser art-review harness that imports the same scene/maths and is **not** native acceptance.

Two overview-only art corrections shipped with it: the selected car no longer draws a team field dot on top of its own bodywork (it already has the ground ring, label and stem; the 15 px disc covered the cockpit at the new scale), and the irritant field dots for other cars stay at 3.5 dp.

Still open after this pass: no MSAA on Android (`expo-gl` passes `msaaSamples` to iOS only, so EXGL renders the default framebuffer unmultisampled), so road/kerb edges remain 1–2 px aliased; a supported, measured AA path is still required. Follow/Battle framing, playback motion and pacing were **not** re-captured after this change — the phone owner resumed using the device mid-check.

## Runtime verification

- Android release build succeeds; APK installed via ADB.
- Startup regression passes (release process remains alive).
- Native camera/orbit/reset/Timing return/background reentry sequence captured before and after. No new app exception or shader error observed in the captured process log; this does not prove absence of every intermittent failure.
- TypeScript + ESLint + **28 tests** pass.
- Initial phone recording during continuous Follow/Battle had encoded-frame interval median≈16.8–16.9ms,95th≈33.6ms, maximum≈51ms in short windows. These are **screen-recording intervals under recording overhead**, not native GPU FPS or a sustained performance result. No performance-improvement claim is made from them.
- Temporary runtime per-frame disk instrumentation was not introduced. Diagnostic video/log files stay local; only app PID logs collected. Screen recording briefly includes launcher during background test and is not published as a user-facing visual.

## Still open

- Intermittent complete material/scene blackouts were not reproduced in this bounded run; need exact triggering camera/time/action or a recording if they recur.
- Ghosting/noise may include surface/depth aliasing, context presentation or temporal hold; not isolated yet. No temporal accumulation or motion blur added as camouflage.
- Overview framing is fitted and device-verified, but Follow/Battle re-capture after that change and a native antialiasing path are still outstanding.
- Car-to-car display intersections are now suppressed using counted projection groups, not invented lanes/contact. This is a display reconstruction rule, not proof about physical race proximity. Other environmental intersections still need individual geometry inspection.
- Short unrecorded CPU measurements improved after car batching (details below), but long callback gaps remain. Sustained GPU/presentation profiling is still required; neither recording intervals nor JS CPU timings prove GPU FPS.
- Car aesthetics, refined materials/lighting, supported antialiasing and optional cinematic blur remain work. Fixing inverted normals improves visibility but is not a finished car-design pass.
- iOS physical-device validation and earlier simulator presentation problem remain separate.

## Reproduce

From `mobile/`, authorized Note20, installed release build:

```sh
python3 scripts/capture_android_render.py
python3 scripts/assert_orbit_visibility.py build-logs/render-repro/04-low-orbit.png
npm run check
# overview framing art review (browser only, not native acceptance)
./node_modules/.bin/esbuild scripts/preview-overview.ts --bundle --format=esm --target=es2022 \
  --outfile=../shots/quality-overview/preview.js --loader:.json=json
python3 -m http.server 8199 --bind 127.0.0.1   # then open shots/quality-overview/preview.html
```

The capture driver uses this phone's1080×2400 UI coordinates. It creates only a named temporary video under `/data/local/tmp` and local diagnostic artifacts; do not treat it as a cross-device E2E harness. ADB timeouts can interrupt the video transfer; screenshots/events remain independently usable.


## Follow-up: intersecting projections, landmark clearance, submission cost

### Counted groups instead of intersecting miniature cars

At78.5seconds, STR18 and HUL27 project only0.0031427model units apart. The enlarged car mesh measures≈2.25×1.15units, so direct rendering guarantees an intersection and near-coincident surfaces. `projected-groups.test.ts` reproduces that exact case with the actual replay data and verifies a single representative plus ×2count, unchanged source positions, and selection cycling. A whole-fixture sweep checks conservation of every available stream and nonintersecting displayed footprints.

- Selected driver always represents its group; otherwise Battle partner then stable driver number wins.
- Footprints are oriented and height-aware: grade-separated bridge traffic is not grouped.
- Small release hysteresis reduces boundary toggling. Seeking resets historical membership.
- A group remains at its representative's own projection, never an invented centroid/lane.
- Timing/picker still expose every driver. A44point count hit area cycles members; actual native tap changed STR→HUL at the same paused78.5s cursor.
- Grouping is explicitly disclosed in the viewport legend and reconstruction text. It is NOT a claim of actual contact, exact lanes or overtakes.

### Landmark intersection — actual GLB regression

Before: `npm test` failed actual-asset clearance with **0.0443807084units** from wheel geometry to route centre. Wheel supports/gondolas straddled a different track branch because placement checked only an offset from one sample.

Native-only exporter now chooses the nearest suitable illustrative site with>6units centre-to-road clearance, avoids existing/future building footprints, then rebakes vertex lighting. New site(28,−20) has6.04939units centre clearance. The actual exported wheel geometry now passes>1.8units horizontal clearance to the replay route, not just a placement-metadata assertion. Approved browser asset/source scene remains unchanged. This is an illustrative landmark relocation, not surveyed Suzuka geography.

### Five shared car batches, not five per car

`instanced-cars.ts` uses real WebGL2/GLES3 core instancing, shared geometry/materials and per-instance linear team colours. No capability/extension overrides. Grouped-out actors are packed OUT of the instance range, not uploaded as intersecting geometry. Pose objects remain the source for camera/picking. Disposal releases instance buffers as well as shared geometry/materials; a regression checks all five disposal events.

Short unrecorded Note20 comparisons, same initial70s/STR/Follow seed;90warmup frames then300rendered samples:

| Scene JS preparation/submission | Separate cars | Instanced cars |
| --- | ---: | ---: |
| Median |6.744ms|4.938ms|
|95th percentile|11.364ms|9.001ms|
| Median scene draw calls|62|37|
|95th callback interval|46.087ms|41.716ms|

This is a **short single-run comparison, not a statistical benchmark**. Source motion/group membership changes across the run. Measurements include JS scene preparation and command submission, not GPU completion. It supports reducing submission overhead; it does not establish smooth60FPS. Both probes report1080×956native drawing buffers. Temporary aggregate probe removed before final delivery; no per-frame logging/disk writes/GPU readback added.

### Full excerpt capture and remaining blackout gate

App-only120second sweep exercised Follow/Battle/Overview across the complete excerpt. `capture_replay_sweep.py` and `assert_recorded_scene.py` save the evidence locally.494samples at4Hz showed no sustained all-black scene (worst terrain coverage23.3%, worst dark72.8%). This sampling can miss shorter faults and cannot validate ghosting, aliasing or GPU frame pacing. No matching app shader exception/fatal was found. The intermittent full-blackout report remains **unreproduced/open**, not dismissed.

Final pure suite: **34tests**, TypeScript and ESLint pass. Expo Doctor20/20. Native screenshots under `shots/render-stability/groups/`; probe logs and videos under ignored `mobile/build-logs/`. iOS is not newly validated by this Android work.


### Paused Battle header: explicit selection dependency

Final native checking found another fault: at paused78.5s, select STR→tap×2to select HUL→Battle produced **HUL/HUL** in the native heading. `python3 mobile/scripts/assert_battle_identity.py` read the actual Android hierarchy and failed with `FAIL: stale partner duplicates selected driver`.

Expo React Compiler is enabled. `engine.battlePartner(state.time)` hides its selected-driver dependency in mutable engine state, so selection-only changes at a fixed time can retain a memoized old query result. The runtime renderer reads current state, but the header showed the stale partner.

`battlePartner(time, selected)` now accepts that dependency explicitly; React and runtime callers both pass selection. The actual fixture regression checks STR→HUL and HUL→TSU queries at unchanged78.5s without modifying the replay cursor. Native header regression must pass on the final installed build, not just this pure test.


Native red→green header gate rerun after installing the final clean APK: **HUL/HUL→HUL/TSU**, PASS. Native header hierarchy comes from the app, not a model of the UI. Final installed-build captures `01-str-group`, `02-hul-group-tap`, `09-battle-header-fixed` are under `shots/render-stability/groups/final/`. Earlier same-round orbit/motion gates: terrain74.6%, dark7.6%;187264camera-changed pixels and345335moving-field-changed pixels. The latter prove changed images, not artifact-free motion or GPU FPS. No temporary CPU probe remains in shipped source.


## Display-cadence correction after the pacing comparison (Note20, measured)

The bounded JS callback-pacing gate was red on the prior native trace (p95 41.716ms against a 25ms target). The controlled comparison below separated the cause. Every row is one release-build run using the same `vantage:///?time=70&driver=18&camera=follow` start, one play tap and the same 75–85s dataset window. These are short single runs, not a statistical benchmark; nothing here measures GPU completion or presented FPS.

| Probe variant | Callback gap p95 | p99 | samples in 10s |
| --- | ---: | ---: | ---: |
| 10Hz React publish, full screen tree (`ui-on`) | 43.41ms | 46.20ms | 458 |
| Control: UI-clock publish suppressed (`ui-off`) | 17.09ms | 17.63ms | 597 |
| Structural/clock split, cursor still 10Hz | 39.14ms | 45.69ms | 487 |
| Split + Compose slider frozen, text still 10Hz | 45.00ms | 48.40ms | 453 |
| **Final: split, 1Hz display clock, whole-second readout** | **17.87ms** | 43.61ms | 586 |

Findings:

- Removing the publish removed every long gap while per-frame scene preparation/submission stayed ~5–10ms p95, so the publish path — not scene cost — owned the stalls.
- Splitting structural state from the cursor made each notification cheap (0.19–0.32ms p95) but did not fix the gaps: the React commit after each notification still measured 32–39ms from notify to layout effect. Freezing the Compose slider changed nothing, so the cost was the text commit, not the native slider.
- Per-update cost is large and roughly fixed, so cadence was the lever. At 1Hz that commit still happens (~37.6ms p50) but about ten times per 10s instead of a hundred, and p95 lands on ordinary frames.

Shipped change:

- `ReplayEngine` now has two channels: `subscribe`/`getSnapshot` for structural state, `subscribeClock`/`getClock` for the display cursor. `step()` moves only the cursor channel; controls and end-of-window flush both. Screens no longer re-render on playback ticks.
- Only small readouts subscribe to the cursor (`RaceTitle`, `LiveDriver`, transport clock/status). The Race screen, GL host, camera buttons and pickers stay structural.
- Transport readouts show whole seconds (`formatClock`, `MM:SS`) at 1Hz. The native renderer still reads the unthrottled `getTime()` every frame, so the 3D scene is unchanged at display rate.
- No timers or sleeps were added; probe code is not in shipped source.

Verification:

- `python3 mobile/scripts/assert_js_pacing.py mobile/build-logs/pacing-split/pacing-1hz2.txt` → **PASS**, p95 **17.869ms**, 586 samples. This is JS scheduling only.
- Native hierarchy read twice around 3.2s of playback on the final installed build: visible clock **01:14 → 01:17**. The diagnostic control deliberately froze this clock, so the check guards against shipping the control.
- 35 pure tests, TypeScript and ESLint pass. Final APK SHA-256 `433d32e7fec9fbaa0fd48122148a4dc7e443caada5e219246378deb1e0ee35a2`; it is also the restore artifact `builds/vantage-stable-before-pacing.apk` and matches `builds/BUILD-STATUS.json`.
- Captures: `shots/render-stability/pacing/race-1hz.png` and `race-1hz-telemetry.png`.

Still open / not proven:

- p99 remains 43.6ms: roughly five isolated hitch frames per 10s. The 25ms p95 gate is a scheduling budget, not proof of artifact-free 60fps.
- GPU presentation, thermal sustainability, other Android devices and iOS are unmeasured. Timing/Lab re-render at the display cadence when open and were not re-measured. A 2Hz readout was not tested.
- Diagnostic evidence: `mobile/build-logs/pacing-comparison/` (`ui-on`/`ui-off`) and `mobile/build-logs/pacing-split/`; APKs under ignored `mobile/builds/diagnostics/`. Probe sources are retained only as `.txt` in ignored `mobile/build-logs/`.
- Eight bounded native lifecycle transitions (Timing↔Race and home↔app) kept the miniature visible; each returned app screenshot had≈76.4%terrain and≈5.4%dark coverage. Two paused recreated surfaces differed by only8pixels above12/255channel error out of1032480scene pixels. This is not proof of every-frame stability or absence of short blackouts/physical display ghosting.
- Important source check: EXGL58's `renderbufferStorageMultisample` is explicitly UNIMPL in `expo-gl/common/EXWebGLMethods.cpp`; `GLView.msaaSamples` is iOS-only. A positive GLES MAX_SAMPLES result is NOT evidence this bridge supports MSAA. Do not enable sample counts or fake extension/method support. A single-frame post-AA path is a candidate only after genuine framebuffer/capability and performance validation; none was shipped here.
- Intermittent full-blackout and ghosting reports remain unreproduced/open. The pacing change does not dismiss them.

Remaining rendering defects are **not solved or signed off** by this work.
