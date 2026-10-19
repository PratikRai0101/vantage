# Vantage — native replay foundation

Expo 58 + React Native 0.88 + React 19.3. Native Race / Timing / Lab UI, native Expo GL + Three 0.180 rendering. **No WebView wrapper.** This is a private evaluation build, not an App Store release.

## Run and check

```sh
npm ci
npm run check  # TypeScript, ESLint, pure replay/scene/format/adapter tests
npx expo-doctor
npm start
```

Use a matching SDK58 Expo Go installation where the bundled native modules are supported, or create a native development build with `npm run ios` / `npm run android`. A Metro preview is not physical-device performance evidence.

## Offline release artifacts

```sh
npm run build:ios
# builds/Vantage.app — simulator only, host architecture, no Apple account needed
xcrun simctl install booted builds/Vantage.app
xcrun simctl launch booted dev.vantage.spectator

# Working JDK + Android SDK required. Export JAVA_HOME, PATH and ANDROID_HOME first.
npm run build:android
# builds/vantage-replay.apk — local testing key, NOT Play Store signing
```

Native folders are CNG-generated from `app.json`; do not hand-edit them. The simulator `.app` cannot be installed on a physical iPhone. Device distribution needs appropriate Apple signing. Logs/artifacts are ignored by Git.

## Implemented slice

- Bundled 120-second Japanese GP 2024 historical replay, OpenF1 session 9496, 05:55–05:57 UTC.
- Twenty driver records, seventeen moving streams; three stationary streams remain disclosed, not labelled official retirements.
- Whole-field, Follow and Battle cameras; native orbit/pinch/tap selection and camera reset.
- Play/pause, seek and speed, recorded timing, selected-driver telemetry, comparative speed chart.
- Shared replay engine/clock; latest-known telemetry, stale-data handling, causal rankings and completed-lap gating.
- Automatic dark/light semantic UI colors, bundled IBM Plex Mono, system-native labels and tabs.
- App backgrounding pauses replay; returning does not silently resume it. Hidden/idle scene rendering is suspended.
- Explicit rendering failures, not a screenshot fallback.

Native capture links seed existing state once, for example:

```sh
xcrun simctl openurl booted 'vantage:///?time=47.5&driver=4&camera=follow'
xcrun simctl openurl booted 'vantage:///timing'
xcrun simctl openurl booted 'vantage:///lab'
```

The links are repeatable state inputs, **not a substitute for touch/VoiceOver testing**. Identical query seeds are deliberately not reapplied while switching tabs. A changed time/camera/driver seed applies immediately.

## Honest limits

- See `../NATIVE-VALIDATION.md` for the actual build/runtime evidence and remaining device gates. Compile/test success alone does not prove native 3D rendering.
- Physical iPhone/Android performance, GPU presentation timing, thermals, sustained playback, gestures, haptics, VoiceOver/TalkBack, large text and Android rendering need real-device acceptance.
- Geometry, elevation, racing lanes and pit paths are illustrative; route projection is not surveyed positioning. No exact contact/overtake claims, simulated fuel, tyre temperature or battery data.
- No accounts, billing, licensed live feeds or production backend yet.
- `npm audit` currently reports 27 advisories (8 moderate, 19 high). Do not force incompatible Expo downgrades. Assess advisory reachability and adopt compatible upstream patches before production.

## Sources and rights

The JSON fixtures are byte-identical to the prepared browser replay; the native model is a separately refined car-free GLB with baked vertex lighting, rounded edges, quieter planting and roof details. The browser model remains unchanged. Regenerate the native world with Blender using `scripts/export_studio_world.py`; regenerate OFL Plex GPU-label coverage with `python3 scripts/build_label_glyphs.py` (Pillow). See `../replay-prototype/data/SOURCES.md` for source windows, provenance, registration and runtime/source distinctions. The original model and both licenses are bundled under `assets/`.

Circuit-plan source: MIT `bacinger/f1-circuits`. Font: IBM Plex Mono, OFL. No official F1 mesh, logo, broadcast footage or Apple font is bundled. **Historical data availability is not commercial clearance.** Personal/noncommercial evaluation only until rights are resolved.
