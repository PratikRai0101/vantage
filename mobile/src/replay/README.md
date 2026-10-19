# Offline replay core

Pure TypeScript: no React/React Native imports, network requests or animation timers.
`mobile/assets/replay/{playback,track}.json` are byte-for-byte copies of the authoritative prototype fixtures. Rights and reconstruction limitations remain in `replay-prototype/data/SOURCES.md` and the fixtures' own metadata.

## Loading and clock ownership

Import fixture JSON in the UI/provider, then call `parseReplayDataset(json)` and `parseTrackData(json)` once. Parsers validate and deeply freeze the original object without stripping provenance. Invalid data throws `TypeError` with a field path.

Create one `new ReplayEngine(data)`. The parent provider owns requestAnimationFrame, calls `step(deltaSeconds)`, and calls `pause()` when backgrounding. The renderer reads `getTime()`; it must not advance its own clock. `getSnapshot`/`subscribe` are bound callbacks for `useSyncExternalStore` and carry structural state only: playing, camera, selection, speed and the cursor as of that deliberate change. `getClock`/`subscribeClock` are a second channel for the 1Hz display cursor (measured: a 10Hz React text update cost 32-39ms of commit latency per tick and dropped the native callback loop below 60fps on the Note20). Playback ticks notify the clock channel at most every second of accepted frame time and never re-render screens subscribed to structural state; controls and end publish both channels immediately. Frame deltas cap at .25s and reaching the end pauses. Explicit Play at the end restarts from zero; there is no automatic loop or resume.

Initial state: paused at 0, speed 1, selected 4, compare 1, overview camera. Selection/comparison reject unknown/unavailable drivers and stay distinct. Selection/camera/speed never change the cursor or pause playback. Seek clamps to the window and pauses. Non-finite inputs, non-positive speeds and negative frame deltas are ignored.

## Public exports

- Types: `ReplayDataset`, `TrackData`, `ReplayState`, `Driver`, `DriverSnapshot`, `CameraMode`, `RoutePosition`, sample/event/lap/stint/coverage types.
- Parsing: `parseReplayDataset(unknown)`, `parseTrackData(unknown)`.
- Sampling: `asOf(rows,time)`, `routeAt(rows,time,maxGap=3)`, `lapAt(driver,time)`, `lastCompletedLap(driver,time)`, `snapshot(driver,time)`, `snapshotDriver(data,number,time)`, `standings(data,time)`.
- Presentation: `formatTime(seconds)`, `formatClock(seconds)` (whole seconds for the transport), `formatGap(intervalEvent,position)`.
- Engine: `subscribe`, `getSnapshot`, `getTime`, `playPause`, `pause`, `seek`, `setSpeed`, `selectDriver`, `setCompare`, `setCamera`, `step`, `driverSnapshot`, `standings`, `battlePartner`.

`snapshotDriver`/`driverSnapshot` return `undefined` for unknown numbers (unavailable historical drivers still return a snapshot). `asOf`, `routeAt`, `lapAt`, `lastCompletedLap` return `null` when absent. `battlePartner` returns `Driver | undefined`. Engine query methods default to the current per-frame cursor, not the throttled React cursor; optional explicit times are supported. `battlePartner(time, selectedNumber)` also accepts an explicit selection. React/compiler callers must pass both dependencies: changing only the selected driver at a paused cursor must not reuse an old partner query.

Route phase alone interpolates, across the shortest wrap and never across >3s sample gaps. No lateral lane accuracy is claimed; model elevation is illustrative. Telemetry holds the last source sample at/before the cursor, with values hidden after 2s or outside source ranges. Brake is binary. Ranks and gaps hold recorded events indefinitely without geometry inference or extrapolation. All 20 historical ranks remain present, but only 17 drivers may be selected/animated. `lastCompletedLap` gates the last-lap readout; `lapAt` includes whole-session metadata, not proof of completion.

Run from `mobile/`: `npx tsx --test tests/replay.test.ts`.
