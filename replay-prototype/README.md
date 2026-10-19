# Vantage — historical moving-car prototype

**Question:** can the whole-field miniature, anchored cameras and driver instruments stay coherent on one recorded race clock?

This is a throwaway **browser proof**, not a native iOS/Android app, production architecture or live-feed integration. It continues the approved A visual identity without reopening direction exploration. Vanilla JavaScript + locally vendored Three.js 0.180.0; no framework or native stack decision implied. No user or playback state is persisted.

## Run

From the project root:

```sh
python3 replay-prototype/serve.py
```

Open **http://127.0.0.1:8765/replay-prototype/**. Stop with Ctrl-C. A different port: `--port 8766`.

No npm install, credentials or API requests are needed at runtime. A current browser with WebGL 2 is required. The fixture, world, font and libraries are local. The server binds to loopback by default. For an intentional test on a phone on your trusted LAN, run with `--host 0.0.0.0` and visit your computer’s LAN IP; do not expose the development server publicly.

## Actually implemented

- A car-free GLB of the approved miniature, with **17 genuinely moving 3D cars**, not an animated camera over fixed cars.
- Whole-field, selected-driver follow and two-car battle cameras. Drag/orbit, pinch/wheel zoom and reset. Select a car directly or use the accessible driver selector/timing list.
- One 120-second clock for positions, ranking events, telemetry, charts, camera targets and UTC time. Pause, seek and ¼×/½×/1×/2×/4× playback; stop at the end rather than silently looping.
- Race / Timing / Lab. Recorded ranks and gaps; current lap/compound and last completed lap. Speed, throttle, binary brake, gear and RPM. Two-driver speed comparison is **time aligned**, not a distance-aligned lap delta.
- Linked chart scrubbing, keyboard chart arrows/Home/End, arrow-key tabs and native keyboard-accessible controls. Canvas shortcuts: F follow, O/Escape overview, B battle, Space play/pause.
- Starts paused. Reduced-motion cameras cut directly; car playback is explicitly user initiated. Switching the browser to reduced motion or leaving the tab pauses playback.
- Responsive desktop/phone layouts. Mobile Timing/Lab have a compact transport connected to the **same** clock, not a second player.

## Historical data, not the simulated design state

**2024 Japanese GP, session 9496; 7 Apr 2024, 05:55–05:57 UTC.** This differs intentionally from the approved static 22-car hypothetical grid and NOR-leading demo. The actual 2024 session has 20 driver streams. RIC, ALB and ZHO publish stationary/zero-speed values throughout the excerpt; those three are retained as disabled timing entries, not fabricated as moving cars and not labelled official retirements. Seventeen streams are eligible for movement.

The raw location/telemetry queries have two-second padding. Maximum observed sample gaps are 1.100s and 1.159s respectively. These are observations for this clip, not an SLA. Rankings are sparse events: the consumer separately retrieves and documents full-session position history to seed the last event before t=0. No order is guessed from track progress. Future rank events and incomplete future lap times do not leak into readouts.

`data/SOURCES.md` documents exact schemas, source URLs, fetch timestamps, counts, limitations and the later playback-preparation supplement. The browser consumes **`data/playback.json`**, not the original unseeded `replay.json`.

### Reconstruction limits

- Source GPS is approximate. A robust 2D registration maps it to the authored plan; each sample is projected onto the centreline. `data/registration.png` shows the fit; `calibration.json` records it. Small fit residuals are **not** proof of positional/lane accuracy.
- Between recorded position samples, route progress is interpolated; crossings use temporal continuity to retain the correct bridge branch. No extrapolation over large gaps. Illustrative track elevation replaces recorded altitude.
- Road and car scales are enlarged. Lane placement, pit-lane geometry, contact and exact overtakes are **not represented**. Battle is a reconstructed two-car view, not broadcast/onboard footage.
- Telemetry uses the latest recorded sample **at or before** the playhead; >2s-old, missing, or out-of-range values show —. Binary brake is not pressure. No fuel, battery or tyre-temperature claims.
- No fictional brake lights: the generic car’s rear detail is static. Formula 1 rear lamps are not brake lights.
- Source gap values are held, not interpolated, and their ages are shown. Rank events persist until a later recorded rank event; their age is not treated as stream staleness.
- The approved strategy workbench remains a separate visual study; it is **not connected** to this historical excerpt.

## Validation and evidence

```sh
node --test replay-prototype/scripts/test_replay.mjs
# With the server running; uses this workspace’s Playwright/Chrome:
node replay-prototype/scripts/validate_browser.mjs
```

- Seven pure-logic tests: causal sampling, wrap-aware interpolation/gaps, 17/20 stream eligibility, rank seeds, completed laps, derived-fixture counts/route timestamps/crossing continuity and bounded clock.
- Browser checks: actual car displacement; all three cameras and orbit; seek/selection clock preservation; chart, telemetry and geometry agreement at paused cursors; 20 timing rows/3 stationary; keyboard tabs/chart; proper end-state pause; reduced motion.
- Responsive checks at **768×1024, 402×874, 375×667, 320×874 and 320×568**: no horizontal overflow or clipped headings; relevant button/select/range/summary targets ≥44px; no JavaScript errors or failed HTTP requests. Transport centre/inset hit tests additionally detect navigation obstruction; timing DOM/focus order and both battle labels are checked.
- Screens: `shots/replay/` at the project root; 402px captures are 3×. `shots/replay/validation.json` is the machine-readable result.

These checks ran in **headless macOS Chrome with responsive/touch emulation**. They do not establish Safari/Firefox behavior, actual iPhone/Android frame rates, thermals, haptics, native accessibility or production readiness. No native performance result is claimed.

## Phone-test continuation

An actual iOS26.5 **Simulator/Safari** run now renders the scene and exercises all three cameras. This is still Mac-hosted simulation, not physical-phone performance or touch validation. No physical handset is connected. `PHONE-TEST.md` records results, caveats and the private LAN procedure.

Open `?diagnostics=1` for the opt-in scheduling/report panel. Ten pure tests now pass (seven replay + three frame-summary tests); desktop tooling tests also check private collection and rejection of background-invalidated samples. Full physical-device, Android, native/haptic and thermal checks remain pending. No new native stack decision.

## Rebuild (not required to run)

```sh
# Historical API fetch; standard library, bounded retries, cached by default:
python3 replay-prototype/scripts/import_openf1.py
# Export approved illustrative world without simulated cars:
/Applications/Blender.app/Contents/MacOS/Blender --background --python replay-prototype/scripts/export_world.py
# Register and project GPS; NumPy + Pillow needed only for preparation:
python3 replay-prototype/scripts/prepare_playback.py
```

`prepare_playback.py` additionally caches official full-session rank events; it does not fetch unbounded location or telemetry. Blender is used only at authoring time. All runtime assets are already included in the workspace.

## What survives / what does not

Portable: source timestamps and schema, causal sampling/clock tests in `replay.mjs`, reconstruction boundaries, the whole-field-first interaction and approved art direction. Throwaway: DOM UI, bespoke scene plumbing and calibration/preparation scripts until a broader session/accuracy study is done.

Next gate: test this interaction on actual phones, measure frame times/draw calls/thermals, then explicitly choose the native/cross-platform renderer and app stack. Separately resolve commercial/live rights, recoverable streaming, accounts/subscriptions, native haptics and Android-specific design. This prototype does not unblock commercial deployment.

## Rights

Personal/noncommercial evaluation only; commercial use and redistribution of provider data are not cleared. Historical API access does not convey upstream rights or a live subscription. No official meshes, logos, sponsor liveries or broadcast assets are included. “Vantage” remains an uncleared working name.

Circuit plan: MIT, `../assets/CIRCUIT-LICENSE.txt`. Three.js 0.180.0: MIT, `vendor/THREE-LICENSE.txt`; local files downloaded from `https://cdn.jsdelivr.net/npm/three@0.180.0/` (GLTFLoader’s utility import changed to the local vendored path). IBM Plex Mono: OFL, `../assets/ibmplexmono-OFL.txt`. Labels use locally available system fonts; no Apple font files are bundled.
