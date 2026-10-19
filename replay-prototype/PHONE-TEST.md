# Phone test — status and procedure

## Status: physical hardware still blocked

No physical iPhone appeared in `xcrun devicectl list devices`; `adb devices -l` listed no Android devices. T3’s device panel reported agent device access disabled. **No actual-phone feel, GPU presentation, thermals, battery or haptics result is claimed.**

A local **iPhone 17 Pro / iOS 26.5 simulator running Safari** did render the real miniature and complete all three scripted replay workloads. This is stronger browser-engine compatibility evidence than desktop responsive emulation, but still runs on the host Mac, not a phone’s processor/GPU. No physical gestures were exercised.

## What was added

- `?diagnostics=1` opt-in panel, below the normal replay. Without that parameter, the diagnostic module does not load and the existing app UI is unchanged.
- Three six-second animation-scheduling samples (overview, Follow, Battle) after 1.1s camera warmup, with the same recorded excerpt, speed and position source.
- Frame interval median/p95/worst, rAF cadence, replay-clock/wall-clock ratio, renderer-reported calls/triangles, viewport/DPR and explicit environment declaration.
- Missing measurements are unknown, not zero. Backgrounding, viewport changes or interrupted playback invalidate samples. The replay is restored and left paused.
- Downloadable JSON; no third-party analytics or storage. With a private test-server URL, pressing Run also sends the report only to that same-origin server. Environment is **user-declared**, never automatically asserted to be physical hardware.
- A token-gated, runtime-file-allowlisted local/LAN server with same-origin/token-checked report writes (64KB maximum; 100 reports per process). No public tunnel/deployment. The normal server remains loopback-only.

## Run on your actual phone

From this project root on the computer reachable by your phone:

```sh
python3 replay-prototype/scripts/phone_test_server.py --host 0.0.0.0 --port 8766
```

1. Put phone and computer on the same **trusted** LAN. Copy the printed private URL, replacing `0.0.0.0` with the computer’s LAN IP. Keep its test token; do not post the link publicly. A private host IP is not reachable from an unrelated network or necessarily from a remote development environment.
2. Open it in Safari on iPhone or Chrome on Android. Dismiss any browser first-use education overlay. Do the manual feel checks below first.
3. Scroll to **Phone test · opt-in**, choose **Physical phone — user declared**, then **Run 3-camera sample**. Keep the tab visible, browser bars settled and orientation fixed during the ~22-second run. Don’t interact with controls until it finishes.
4. Reports are saved on the local test server when opened through its private URL; **Download report** also exports JSON. Share the report plus your actual phone model, browser, battery/low-power mode and subjective notes. No model is inferred from a potentially frozen user-agent string.
5. Stop the test server when finished. Do not expose this development server to the public internet. If LAN access is unavailable, establish an authorized phone-accessible connection before testing; this document does not create one.

For export-only diagnostics using the ordinary server, open `/replay-prototype/?diagnostics=1`. That server binds to the computer’s loopback interface by default; `127.0.0.1` on a phone refers to the phone, not this computer.

### Manual feel checks (not proven by the automated sample)

- Play for a full excerpt. All cars → Follow → Battle; watch whether selected cars stay anchored and transitions feel controlled.
- Orbit, pinch and reset; note missed touches or camera jumps.
- Scrub both directions, then inspect Timing and Lab; confirm the clock and measurements agree.
- Check portrait/landscape, expanded/collapsed Safari bars, native select menus and reduced motion.
- Note judder, warmth, battery mode and interruptions. Six-second samples do not establish sustained thermal behavior or native performance.

## Observed simulator evidence

`shots/phone-tests/` contains the raw reports and actual Simulator screenshots (not browser-emulated screenshots or composited mockups):

- `phone-test-20261018T101639Z-c4fff2.json`: completed Safari simulator run; no observed script errors.
- `phone-test-20261018T102230Z-1eb42d.json`: second completed Safari simulator run; no observed script errors; 402×714 CSS viewport inside a 402×874 screen, DPR3 rendered at the app’s DPR2 cap.
- `ios-simulator-safari-relaunch.png`: unobstructed Safari overview, including real simulator status/browser chrome.
- `ios-simulator-follow.png`: Follow during recorded playback. Capturing this screenshot during run2 may affect scheduling observations; run2 is not an isolated benchmark.
- `ios-simulator-safari.png`: initial Safari first-use popover. Retained as evidence that DOM hit tests **cannot detect native browser/system overlays**. Relaunch cleared that education overlay; no app fix or manual touch result is implied.

Across these two **Mac-hosted simulator** runs, overview scheduling varied approximately **51–60 rAF Hz** (p95 17–35ms), Follow/Battle approximately60 rAF Hz. Replay time/wall time ratios remained about1. These are **JavaScript scheduling observations, not displayed/GPU FPS, phone benchmarks or a 60fps guarantee**. Do not cherry-pick the faster run as a physical-performance claim. Full overview reported310 renderer calls; this is a future profiling candidate, not a proven phone bottleneck.

The tested in-viewport primary controls passed DOM hit tests. Native browser overlays, touch target feel, pinch behavior, actual hardware accessibility and Android remain unverified. Physical hardware is explicitly false/unverified in every generated report to date.

## Tooling verification

```sh
node --test replay-prototype/scripts/test_phone.mjs replay-prototype/scripts/test_replay.mjs
# With the private test server running:
node replay-prototype/scripts/validate_phone.mjs
```

Ten pure tests pass: seven existing replay tests plus three scheduling-summary tests. Desktop Chrome verified opt-in loading, complete samples, restored paused clock, background-invalidated samples, private static/report authorization and rejection of paths outside the runtime allowlist. Machine-readable result: `shots/phone-tests/tooling-validation.json`.

These tests validate the measurement tools and browser compatibility. **The requested actual-phone check still requires a reachable physical handset and user interaction.**
