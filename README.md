<div align="center">
  <img src="mobile/assets/images/icon.png" width="96" alt="Vantage app icon: a pale-blue Suzuka-style circuit folded into an S with an orange car" />

  <h1>Vantage</h1>

  <p><strong>A native 3D Formula 1 miniature and historical replay.</strong><br />
  The whole Suzuka field, recorded telemetry and three cameras — drawn natively with Three.js, Expo GL and Metal/WebGPU.</p>

  <p>
    <a href="#run"><img src="https://img.shields.io/badge/Expo-SDK%2058-315D74?logo=expo&amp;logoColor=white" alt="Expo SDK 58" /></a>
    <a href="#run"><img src="https://img.shields.io/badge/React%20Native-0.88-182C3B?logo=react&amp;logoColor=white" alt="React Native 0.88" /></a>
    <a href="#run"><img src="https://img.shields.io/badge/TypeScript-6.0-466D83?logo=typescript&amp;logoColor=white" alt="TypeScript 6" /></a>
    <a href="#run"><img src="https://img.shields.io/badge/WebGPU-Metal-315D74" alt="WebGPU / Metal" /></a>
    <a href="#status-october-2026--pre-release"><img src="https://img.shields.io/badge/status-pre--release-628BA2" alt="Status: pre-release" /></a>
  </p>
</div>

Vantage is a real-time 3D Formula 1 replay app. The native client in `mobile/` (Expo SDK 58 · React Native 0.88 · React 19.3) draws a full circuit, the recorded field of 17 moving cars and three camera modes with Three.js, using Expo GL on Android and react-native-webgpu (Dawn/Metal) on iOS — no WebView, no video playback. It replays the 2024 Japanese Grand Prix fixture from documented OpenF1 recordings and follows the product direction approved in [docs/design.md](docs/design.md).

> [!IMPORTANT]
> **Vantage is pre-release.** The native replay is built and verified on Android and the iPhone 17 Pro Simulator. Physical-iPhone behaviour, GPU pacing, thermals, accessibility and commercial data rights are not verified, and nothing is on the App Store.

## See it in use

<p align="center">
  <a href="Showcase/vantage-demo-framed.mp4">
    <img src="Showcase/vantage-demo-framed.gif" width="260" alt="Vantage in an iPhone 17 Pro frame: the whole field, Follow and Battle cameras, Timing, Lab comparison and telemetry" />
  </a>
</p>

<p align="center">
  <a href="Showcase/vantage-demo-framed.mp4"><strong>Watch the 37-second hands-on demo</strong></a><br />
  <sub>Native iOS · 60 fps · One continuous take · Real taps, camera moves and scrolling</sub>
</p>

Pressing Play, switching Follow and Battle cameras, changing Timing from Gap to
Interval, choosing a Lab comparison driver, scrolling through telemetry and
returning to the whole field. The app is driven by
a UI test on the iPhone 17 Pro Simulator with the bundled OpenF1 excerpt; the 3D
scene is moving, not a sequence of mockups.

[Recording notes and website embed](Showcase/README.md).

Every screenshot and frame below is a real iPhone 17 Pro capture from the iOS 26.5
Simulator. The device frame is drawn around the capture; the app pixels inside it
are untouched.

## Screens

<p align="center">
  <img src="Screenshots/framed/01-race-overview.png" width="300" alt="Vantage Race screen: the whole Suzuka field on an olive tabletop miniature, 17 moving cars, driver labels and group counts" />
  <br />
  <sub><strong>Race</strong> — the whole field at 00:04. Seventeen moving streams, recorded lap and timing, and ×N badges where projected cars overlap.</sub>
</p>

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="Screenshots/framed/02-race-follow.png" alt="Vantage Follow camera: NOR through the Suzuka hairpin, with the selected car label and ground ring" />
      <br /><sub><strong>Follow</strong> — NOR through the hairpin. Drag to orbit, pinch to zoom; the selected car keeps its label and ground ring.</sub>
    </td>
    <td width="50%" valign="top">
      <img src="Screenshots/framed/03-race-battle.png" alt="Vantage Battle camera: NOR and HAM held in one frame with group count badges" />
      <br /><sub><strong>Battle</strong> — NOR and HAM in one frame. Group counts disclose overlapping projections rather than inventing lanes.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="Screenshots/framed/04-timing.png" alt="Vantage Timing screen: recorded order with gaps, last lap and source age" />
      <br /><sub><strong>Timing</strong> — recorded order with gap or interval, last lap and source age. Sparse events are not inferred from the miniature.</sub>
    </td>
    <td width="50%" valign="top">
      <img src="Screenshots/framed/05-telemetry.png" alt="Vantage Lab screen: time-aligned speed traces and telemetry readouts for two drivers" />
      <br /><sub><strong>Lab</strong> — time-aligned speed traces for the selected pair, plus the shared cursor and telemetry below.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="Screenshots/framed/06-telemetry-values.png" alt="Vantage telemetry values: speed, throttle, brake, gear and RPM for two drivers with source ages" />
      <br /><sub><strong>Telemetry</strong> — speed, throttle, binary brake, gear and RPM at the shared cursor, with source age beside each driver.</sub>
    </td>
    <td width="50%" valign="top">
      <img src="Screenshots/framed/07-return-paused.png" alt="Vantage Race screen after returning from Timing and Lab, with the whole field and selected driver" />
      <br /><sub><strong>Return</strong> — returning to Race keeps the shared cursor and selected driver; the replay does not silently resume.</sub>
    </td>
  </tr>
</table>

## Status (October 2026) — pre-release

Verified on a physical Samsung Note 20 5G (Android 13, release APK) and an iPhone 17 Pro Simulator (iOS 26.5):

- Native Race / Timing / Lab screens, the shared replay engine and Overview / Follow / Battle cameras.
- Android: startup, camera change and moving-field pixel gates pass — real GL-region comparisons, not UI-only checks.
- iOS Simulator: the Metal/WebGPU backend now draws the moving field and camera changes; the real pixel gate passes (446,917 camera / 24,120 moving-field changed pixels). The old EXGL simulator freeze is bypassed.
- Task/timing pacing, the overview framing fix and Android 2× SSAA are measured on-device ([validation record](docs/validation.md)).
- Android 2× supersampling (sRGB target, linear then direct fallback) cuts the Note20 hard-step fraction 0.640 → 0.298. It roughly doubles measured GPU frame cost; 100s playback is 3.99% janky vs 1.72% without it, so 60fps is not claimed.
- Follow/Battle re-captured after the framing change; the Android camera/motion gate passes on the SSAA build (359,314 / 324,496 changed pixels).
- 110s Android SSAA camera sweep: no sustained blackout in the sampled recording (4Hz; shorter faults and ghosting are not excluded).
- `cd mobile && npm run check` — TypeScript, ESLint and 41 pure tests pass.

Not yet established:

- Physical iPhone behaviour. The video and stills are iPhone Simulator captures; no physical iPhone has run the app. Haptics, thermals and real-device GPU pacing remain unverified.
- Sustained Android 2× SSAA performance and SoC thermals beyond the 100s aggregate run. The pacing figure is HWUI/GPU contention, not a Perfetto GPU trace; a 1.5× experiment traded sharpness for GPU headroom without a consistent jank win, and no adaptive mode is shipped.
- A GPU-trace-level profile, p99 hitches, intermittent blackouts, ghosting, and any device beyond the Note20 and iPhone Simulator.

No store submission. The local APK is debug-key signed — not a Play Store artifact. No live-data integration and no commercial rights clearance; see [data and rights](docs/data-rights.md).

## Layout

| Path | What it is |
| --- | --- |
| `mobile/` | Native app, tests, build/capture scripts and bundled runtime assets. |
| `mobile/pipeline/` | Circuit authoring source, cached OpenF1 inputs, provenance and offline rebuild tools. |
| `docs/` | Current design direction, architecture, validation gates and data-rights notes. |
| `shots/` | Curated iPhone Simulator captures and Note20 regression/measurement evidence. |
| `Screenshots/framed/` | The current framed screenshots shown above. |
| `Showcase/` | The approved continuous hands-on demo, previews, capture tools and verification. |

## Run

```sh
cd mobile
npm ci
npm run check          # typecheck + lint + tests
npm start              # Metro dev server
npm run build:android  # local release APK (debug key, not Play Store signing)
npm run build:ios      # simulator .app, not a physical-iPhone build
```

[Native setup and limits](mobile/README.md) ·
[Offline data/model rebuild](mobile/pipeline/README.md) ·
[Demo reproduction](Showcase/README.md)

## Development records

- [Approved design direction](docs/design.md)
- [Native architecture and compatibility guardrails](docs/architecture.md)
- [Device evidence, regressions and remaining acceptance gates](docs/validation.md)
- [Source provenance and commercial-rights limits](docs/data-rights.md)

Only the native app and its current supporting tools/media are maintained here.
Retired HTML mockups, browser app, alternate concepts and superseded capture
rounds are available in Git history rather than kept beside the working app.
