# Vantage — F1 miniature and historical replay

Vantage is a real-time 3D Formula 1 replay app. The native client in `mobile/` (Expo SDK 58 · React Native 0.88 · React 19.3) draws a full circuit, the recorded field of 17 moving cars and three camera modes with Expo GL + Three.js — no WebView, no video playback. It replays the 2024 Japanese Grand Prix fixture from documented OpenF1 recordings and follows the product direction approved in `DIRECTION.md`.

## Status (October 2026) — pre-release

Verified on a physical Samsung Note 20 5G (Android 13, release APK):

- Native Race / Timing / Lab screens, the shared replay engine and Overview / Follow / Battle cameras.
- Startup, camera change and moving-field pixel gates pass — real GL-region comparisons, not UI-only checks.
- Task/timing pacing, the overview framing fix and 2× SSAA are measured on-device (`RENDER-STABILITY.md`).
- 2× supersampling in the native renderer (sRGB target, linear then direct fallback) cuts the Note20 hard-step fraction 0.640 → 0.298. It roughly doubles measured GPU frame cost; 100s playback is 3.99% janky vs 1.72% without it, so 60fps is not claimed.
- Follow/Battle re-captured after the framing change; the camera/motion gate passes on the SSAA build (359,314 / 324,496 changed pixels).
- 110s SSAA camera sweep: no sustained blackout in the sampled recording (4Hz; shorter faults and ghosting are not excluded).
- `cd mobile && npm run check` — TypeScript, ESLint and 39 pure tests pass.

Not yet established:

- iOS device behaviour. Simulator moving-replay presentation is a known EXGL limitation; no physical iPhone has run the app.
- Sustained 2× SSAA performance and SoC thermals beyond the 100s aggregate run. The pacing figure is HWUI/GPU contention, not a Perfetto GPU trace; a 1.5× experiment traded sharpness for GPU headroom without a consistent jank win, and no adaptive mode is shipped.
- A GPU-trace-level profile, p99 hitches, intermittent blackouts, ghosting, and any device beyond the one test handset.

No store submission. The local APK is debug-key signed — not a Play Store artifact. No live-data integration and no commercial rights clearance; see `REFERENCES.md`.

## Layout

| Path | What it is |
| --- | --- |
| `mobile/` | Native app (Expo + React Native + Expo GL). Run/build instructions in `mobile/README.md`. |
| `replay-prototype/` | Browser proof the app grew out of: 17 moving cars, seekable clock, recorded telemetry. |
| `assets/` | Editable 3D circuit sources (`.blend`), renders, fonts and licences. |
| `shots/` | Dated visual evidence: design sheets, device captures, measured before/after pairs. |
| `references/` | Primary-source research material. |
| `scripts/` | Python scene-render and design-validation scripts. |

## Run

```sh
# Native app
cd mobile && npm ci && npm run check        # typecheck + lint + tests
npm start                                    # Metro dev server
npm run build:android                        # local release APK (debug key, not Play signing)
npm run build:ios                            # simulator .app

# Browser replay proof (no install, no network)
python3 replay-prototype/serve.py            # http://127.0.0.1:8765/replay-prototype/
```

## Records

`DIRECTION.md` (brief and approved direction) · `NATIVE-RENDERER.md` (EXGL/Three architecture) · `NATIVE-VALIDATION.md` (device acceptance gates) · `RENDER-STABILITY.md` (measured render quality, open defects) · `NATIVE-POLISH.md` · `CRITIQUE*.md` · `REFERENCES.md`.

## Retained: working historical replay prototype

`replay-prototype/` now contains a local browser proof with **17 moving 3D cars**, overview/follow/battle cameras, a seekable 120-second clock and synchronized recorded timing/telemetry from the 2024 Japanese GP. Twenty real driver streams; three stationary streams are not animated. This is not the simulated 22-car design state, a native app or a live product.

```sh
python3 replay-prototype/serve.py
# Open http://127.0.0.1:8765/replay-prototype/
```

No runtime API calls, credentials or npm install. See `replay-prototype/README.md` for controls, scope, rebuilding and rights; `replay-prototype/data/SOURCES.md` for provenance. `shots/replay/validation.json` records passing browser interactions at desktop/768/402/375/320px, reduced motion and no JS/HTTP errors. Seven logic tests pass. Responsive emulation is not native device/performance validation. Lane placement, pit paths and elevation remain illustrative; commercial/live rights remain unresolved.

**Phone-test update:** iOS26.5 Safari **in the simulator** renders the scene and completes the three-camera sample. No physical iPhone/Android is connected; actual-phone feel/performance remains blocked. `replay-prototype/PHONE-TEST.md` documents the opt-in diagnostics, private test server and what the user must run on a reachable handset. Ten pure tests and phone-tooling checks pass; simulator rAF cadence is not a native/GPU performance claim.

## Approved visual baseline: selected A, expanded

 Seven app screens, a camera storyboard and the app icon, plus working browser motion studies. These are visual concepts with simulated data—not an implemented live race product.

- `presentation-a2.html`: complete gallery plus camera dive, linked telemetry scrubber, timing tick, pit-loss scenario and reduced-motion controls.
- `reply-a2.html`: compact inline gallery and camera/timing/pit motion studies.
- `mockup.html`: editable native-size frame set; Gap/Interval, the shared telemetry cursor and pit assumption are functional.
- `shots/a2-r2/sheet.png`: latest full-suite contact sheet; individual3× frames in the same folder.
- `shots/a2-r2-small/`: 375×667 phone validation.
- `CRITIQUE-A2.md`: two full-set rounds, **45→48/60**, all12 final criteria4/5. Both final scans have zero FAILs and exactly7 type sizes.
- `scripts/validate_a2.mjs`: functional checks at728/390/320px plus system reduced motion; `shots/a2-validation.json` records the passing results.

The30-frame camera journey moves through real rendered geometry; cars remain fixed at a simulated moment. No live feed, native haptic, Android implementation or data-rights clearance is claimed.

The original three-direction exploration is preserved below.

## Open

- `presentation.html`: comparison gallery; select A, B or C to enlarge. Native gallery controls work; the pictured app controls are visual proposals.
- `explore.html`: editable iPhone-screen source, using the local app-designer device kit and Apple fonts for mockups.
- `shots/explore-r2/sheet.png`: latest contact sheet.
- `shots/explore-r2/`: individual 3× screens at 402×874.
- `shots/explore-r2-small/`: individual 3× screens at 375×667.

## Design decisions

`DIRECTION.md` contains the user-confirmed brief, reference synthesis, refused defaults, three concepts, tokens, exact demo content, proposed signature and recommended direction A. The user selected A and approved the expanded visual baseline; the historical browser proof continues that direction.

`CRITIQUE.md` records two independent review rounds and all warning responses. `REFERENCES.md` records primary-source research and the difference between historical/free access and commercially cleared live data.

## Original assets

`assets/circuit-{a,b,c}.blend` are editable 3D source scenes. Cars, terrain, bridge, Ferris wheel, grandstands, buildings and lighting were procedurally authored in `scripts/render_circuits.py`. Blender 5.1.2/Cycles was used for the supplied renders.

Suzuka plan geometry is MIT-licensed; the licence is preserved in `assets/CIRCUIT-LICENSE.txt`. Elevation, structures and scale are illustrative, not surveyed. Positions and timing gaps in the original static assets are simulated; the separate historical prototype uses documented OpenF1 recordings. No broadcast footage, official car mesh, sponsor artwork or paid generated imagery is used.

## Validation

Both final phone-size scan runs exit 0, with zero FAILs. Warnings are answered in `CRITIQUE.md`. Gallery view switching was checked at 728px, 390px and 320px with no horizontal overflow, broken images or JavaScript errors; results are in `shots/gallery-checks.json`.

To reshoot on this machine:

```sh
node /Users/pratikrai/.pi/agent/skills/app-designer/scripts/shoot.mjs explore.html --out shots/next
node /Users/pratikrai/.pi/agent/skills/app-designer/scripts/shoot.mjs explore.html --out shots/next-small --width 375 --height 667
```

The mockup links to this machine's app-designer device CSS/JS. For sharing elsewhere, package those dependencies and ensure appropriate font licences; do not bundle Apple font files for Android.

## Next validation gate

Test the replay interaction on actual phones and measure frame times, then explicitly choose the native/cross-platform implementation stack. Live integration, commercial rights, native performance, real-device motion/haptics, subscriptions and Android-specific adaptation remain unverified. The original A/B/C exploration is retained as history, not an open direction decision.
