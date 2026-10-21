# Native architecture

## Current stack and ownership

Expo SDK 58, React Native 0.88, React 19.3, Three 0.180. Versions are pinned in
`mobile/package-lock.json`; follow `mobile/AGENTS.md` before changing native APIs.
The app is not a WebView and does not play a film to simulate the race.

- `mobile/src/app/`: Expo Router destinations.
- `mobile/src/screens/` and `components/`: native controls, timing and telemetry.
- `mobile/src/replay/`: pure sampling/validation and the shared `ReplayEngine`.
- `mobile/src/state/`: fixture ownership, frame clock and deep-link inputs.
- `mobile/src/scene/`: shared geometry, camera maths, projected groups, picking,
  label atlas and native surface lifecycle.
- `mobile/pipeline/`: cached source data, provenance and reproducible asset tools.

The provider advances one clock. The scene reads its unthrottled cursor every
frame; it must not advance a second clock. Structural state and the 1 Hz display
cursor have separate subscriptions. A measured 10 Hz React text commit cost
32–39 ms per update on the Note20; do not put playback ticks back into screen-wide
React state. Controls and end-of-window flush both channels immediately.

## Render backends

`RaceRenderBackend` owns GPU resources and presentation, not replay state.

| Platform | Surface | Presentation |
|---|---|---|
| Android | `RaceSurface.tsx`, `gl-backend.ts`: Expo GL / Three WebGL | `gl.endFrameEXP()` |
| iOS | `RaceSurface.ios.tsx`: react-native-webgpu / Three WebGPU / Dawn Metal | `context.present()` |

Scene, actors, cameras and replay logic are shared. The original iOS Simulator
EXGL path could advance the JS clock while displaying a stale frame; Metal
passes the actual screen-motion gate. Do not restore EXGL on iOS or add another
renderer without device evidence.

Android renders to a 2× supersampled target, then resolves linearly. It prefers
an sRGB target, falls back to linear if incomplete, then direct rendering rather
than black output. Installed Expo GL does not implement
`renderbufferStorageMultisample`; `msaaSamples` is not an Android solution.
Never fake GPU capabilities or successful extension methods.

## Compatibility and lifecycle guardrails

- Acquire WebGL2 through the canvas path: Expo's WebGL2 object inherits WebGL1,
  so passing it directly can trigger Three's WebGL1 guard.
- `loader-host.ts` supplies honest React Native host metadata for GLTFLoader.
  `patch-three-native.mjs` guards Three r180's browser-only `VideoFrame` sizing
  branch for Hermes; it is a required postinstall patch, not fake WebCodecs.
- `plugins/with-gl-constructor.js` retains Expo GL's reflected constructor and
  JNI `GLContext.flush()` boundary through R8. Removing these caused Android
  release startup failures. Do not edit generated native projects by hand.
- Keep the native surface isolated from readout commits. Hidden-tab React
  Activity cleanup and native view removal can invalidate a GPU context; recreate
  disposed surfaces rather than retaining a stale image. Stop drawing when idle,
  backgrounded or disposed; release owned GPU resources and frame callbacks.
- Load the bundled, image-free GLB using native asset/file bytes and GLTFLoader
  parsing. A future textured model needs an explicit native image-loading path;
  WebGPU does not supply browser DOM loaders.
- Five shared instanced car batches preserve team paint and pack grouped actors
  out of the instance range. Keep outward winding, finite bounds and disposal
  tests. Camera/picking poses remain independent of visible representatives.
- Projected groups conserve every eligible stream, prefer selected/Battle cars,
  respect bridge height, and reset history on seek. They are a display rule,
  never a claim about physical contact or exact lanes.
- Battle queries receive selection explicitly; hiding that dependency in mutable
  engine state previously produced a stale HUL/HUL heading while paused.

## Asset editing and native acceptance

See the [pipeline](../mobile/pipeline/README.md) for rebuilding the replay track,
registered playback, maquette and label atlas. The source centreline must remain
separate from visual-road smoothing; changing registration is a data change,
not cosmetic cleanup.

For optional browser-only art review, bundle either `preview-overview.ts` or
`preview-studio.ts` from `mobile/scripts/`:

```sh
cd mobile
./node_modules/.bin/esbuild scripts/preview-overview.ts --bundle --format=esm \
  --target=es2022 --outfile=build-logs/preview.js --loader:.json=json
cd ..
python3 -m http.server 8199 --bind 127.0.0.1
# Open http://127.0.0.1:8199/mobile/scripts/preview.html
```

This active development harness uses native scene functions/assets; it is not the
retired browser app. Browser imagery, timing and MSAA are **not native acceptance**.
Use the [actual screen and device gates](validation.md) before claiming success.
