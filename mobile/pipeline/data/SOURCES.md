# Historical OpenF1 replay fixture

Personal/noncommercial local prototype only. Historical endpoints were publicly accessible without credentials at fetch time. Commercial use/redistribution is **not cleared** by this fixture. OpenF1 access is not a grant of rights to underlying Formula 1 data, marks or imagery. No paid subscription or authentication was used.

All unqualified cached filenames below are relative to `mobile/pipeline/data/`; prepared runtime outputs are under `mobile/assets/replay/`. Original JSON provenance strings are retained verbatim, including historical prototype paths. See [`../README.md`](../README.md) for the full offline rebuild.

## Scope and reproduction

- Official provider: https://openf1.org/ ; API: https://api.openf1.org/v1/ . Endpoint documentation: https://openf1.org/#api-endpoints .
- 2024 Japanese Grand Prix, Suzuka Race, session **9496**, meeting **1232**, 2024-04-07. API session envelope: 05:00–07:00 UTC.
- One unchanged 120-second replay window: **2024-04-07T05:55:00Z–05:57:00Z**. The data was nonempty; no alternate window was used.
- `location` and `car_data`: 05:54:58–05:57:02 UTC (two-second padding). `position` and `intervals`: 05:54:30–05:57:30 UTC (30-second padding). API query bounds are strict; original sample times are retained, including negative/post-window times.
- Drivers, laps and stints are session metadata, fetched once for the selected session. No unbounded location/telemetry feeds or live polling.
- Run `python3 mobile/pipeline/scripts/import_openf1.py --offline` from the project root. Python standard library only. Successful cached raw responses are reused with their original fetch timestamps. Remove `--offline` and add `--refresh` to refetch; failures are explicit in the manifest and result in a nonzero exit. No synthetic fallback.
- Requests are sequential, at least 2.2 seconds between request starts (under 3/sec and 30/minute). Maximum two retries per request, with 3/6-second backoff; transient HTTP errors only, bounded 40-second network timeout, short numeric Retry-After respected. Longer embargoes fail rather than hammering the endpoint.
- `raw-provenance.json` gives the exact source URL, actual UTC fetch date, row count and status for **each raw JSON file**. Clock-reported fetch date was **2026-10-18 UTC**, distinct from the historical event date. `replay.json.provenance.sources` embeds the same records. `validation.json` derives from the same cached raw files and replay, not another network source.

## Files and verified counts

Raw JSON arrays retain API fields and values (JSON formatting is compacted):

| File / endpoint | Raw rows | Replay in-window rows |
|---|---:|---:|
| `session-query.json` / sessions | 1 | metadata |
| `drivers.json` / drivers | 20 | metadata |
| `location.json` / location | 9,500 | 9,180 |
| `car_data.json` / car_data | 8,960 | 8,620 |
| `position.json` / position | 20 | 6 |
| `intervals.json` / intervals | 710 | 481 |
| `laps.json` / laps | 908 | whole-session metadata |
| `stints.json` / stints | 74 | whole-session metadata |

Derived files: `replay.json` (compact fixture), `validation.json` (per-driver counts, coverage, missing streams and gaps), `raw-provenance.json` (source manifest). The canonical `mobile/assets/replay/track.json` belongs to the geometry export and is not produced or modified by this importer.

## Exact replay schema (version 1)

```text
{
  schemaVersion: 1,
  session: <original OpenF1 session object>,
  window: {start: UTC ISO string, end: UTC ISO string, duration: 120,
           samplePaddingSeconds: 2, eventPaddingSeconds: 30},
  drivers: [{
    number: integer, code: string|null, name: string|null,
    team: string|null, color: "#RRGGBB"|null,
    available: boolean,
    motionStatus: "moving"|"stationary_or_stale"|"missing_location"|"missing_telemetry",
    unavailableReason: string|null,
    location: [[t, x, y, z], ...],
    telemetry: [[t, speed, throttle, brake, gear, rpm], ...],
    positions: [[t, position], ...],
    intervals: [[t, gapToLeader, interval], ...],
    laps: [{start: t|null, number: integer|null, duration: seconds|null}, ...],
    stints: [{number: integer|null, lapStart: integer|null, lapEnd: integer|null,
              compound: string|null, tyreAgeAtStart: integer|null}, ...],
    coverage: {
      location: <sample coverage + distinctCoordinatesInWindow>,
      telemetry: <sample coverage + speedRangeInWindow>,
      positions: <event coverage>, intervals: <event coverage>
    }
  }, ...],
  summary: {driverCount, availableDrivers, unavailableDrivers, rawCounts,
            sampleCounts, driversWithNoSamples, driversWithNoInWindowSamples,
            unknownDriverNumbers, droppedRows, failedFiles},
  provenance: {provider, generatedAt, usage, sources: <raw source manifest>}
}
```

- **Every `t` and lap `start` is elapsed seconds relative to exactly 2024-04-07T05:55:00Z**, not to a driver's first sample, lap or session start. Fractional timestamps are preserved to microsecond resolution. Whole-session lap starts can be negative or much greater than 120. `duration` is a duration, not a timestamp.
- Driver streams are sorted by `t`; laps and stints by their original numbers. No interpolation, synchronization onto a fabricated common cadence, downsampling, smoothing, map alignment or rank inference is performed. Read the two independent streams against the same clock. Pad samples permit consumers to interpolate at replay boundaries; do not display the extra pad as replay time.
- `location` uses the API's arbitrary coordinate system as returned, **not surveyed track geometry or guaranteed lateral precision**. Do not interpret the coordinates as accurate lane offsets, metres or contact/tyre positions. Geometry alignment is deliberately deferred.
- Speed: km/h. Throttle: percent. Brake: binary **0/1**, the only numeric normalization (raw OpenF1 values remain in `car_data.json`). Gear: original `n_gear`; RPM: original engine RPM.
- `position` is the **recorded race ranking**, unrelated to XYZ. Position records are sparse changes, not a full-grid snapshot. Negative-t events can seed a driver's known rank; positive-t events must not be backdated. No event in the bounded query means **unknown**, not last place. Never generate a 20- or 22-car order from this fixture.
- Gap and interval values preserve API numbers, strings such as lap deficits if present, and nulls. Numeric values are seconds; null is unknown, not zero. This fetch contains 20 null gap/interval cells. No gap interpolation or fabricated leader values.
- `available` means eligible for **moving-car** replay in this window: in-window coordinates exist, recorded speed exists and becomes positive, and coordinates vary. It is not an official running/retirement classification. Raw stationary samples remain accessible.
- Event coverage: `count`, `inWindowCount` (inclusive t=0..120), `first`, `last` (elapsed seconds or null). Sample coverage additionally includes `maxSampleGapSeconds`, `gapsOver2Seconds`, `leadingGapSeconds`, `trailingGapSeconds`. Gaps use original in-window samples; absent streams have null max gap and 120-second uncovered boundaries. Distinct-coordinate and min/max-speed diagnostics use in-window samples only. Null telemetry values remain null.

## Observed coverage of the original bounded import

- All **20 real 2024 session drivers** are present in metadata; each has 475 padded location samples and 448 padded telemetry samples. No extra cars were invented.
- **17 eligible moving cars**: numbers 1, 2, 4, 10, 11, 14, 16, 18, 20, 22, 27, 31, 44, 55, 63, 77, 81.
- **Unavailable for moving replay: 3 RIC, 23 ALB, 24 ZHO**. The endpoint unexpectedly keeps publishing their stationary/near-stationary locations and zero-speed telemetry. RIC/ALB each have exactly one distinct coordinate and only lap 1 metadata. ZHO has three near-identical coordinates, zero speed throughout the window and only 13 lap entries (last incomplete). Keep all three out of the moving-car field; do not mistake repeated timestamps for continued racing. This conclusion is based on recorded samples, not invented retirement times.
- Location coverage for each driver: padded **t=-1.899..121.881**; 459 in-window samples, first t=0.202 and last t=119.721. Maximum in-window sample gap **1.100 s**; no gaps over 2 s.
- Telemetry coverage for each driver: padded **t=-1.667..121.653**; 431 in-window samples, first t=0.214 and last t=119.734. Maximum in-window sample gap **1.159 s**; no gaps over 2 s. Boundary padding brackets the whole 120-second window.
- No position records anywhere in the 30-second-padded query for **1, 3, 14, 22, 23, 24, 77**. Some other drivers have only post-window events; those cannot seed a rank at replay start. Only six position events actually fall in-window. Consumers must leave unknown ranks unknown or obtain a separately documented earlier historical seed.
- No interval records for **3, 23, 24**. All other drivers have interval data, but the leader's first record is at t=7.086; missing initial values must not be fabricated.
- All four timestamped streams verified sorted; all tuple widths and binary brakes verified. No unknown driver numbers, dropped rows or failed final source files. Inspect `validation.json` for machine-readable per-driver details.

## Derived playback — authoritative runtime fixture

The native app consumes **`mobile/assets/replay/playback.json`**, prepared from the original `replay.json` plus separately documented ranking history and illustrative geometry. The preceding bounded-import counts and unknown-rank warnings describe `replay.json`; they do not claim that ranks remain unknown after historical seeding.

Run `python3 mobile/pipeline/scripts/prepare_playback.py --offline` after the import and original track export (`export_track.py`). This authoring step needs NumPy and Pillow; neither is needed at runtime. The original preparation cached one additional official query, **https://api.openf1.org/v1/position?session_key=9496**, in `position-history.json`: **443 recorded rank events**. Exact URL and actual fetch timestamp are in `position-history-provenance.json` and runtime `provenance.positionHistory`. No additional location/car-data window, live polling, rank inference or future backdating is introduced.

For each driver, retain only the **last event at or before t=0** as its historical seed, then the events in t>0..120. This produces **26 runtime position records** (20 historical seeds + six in-window changes). Rank-event timestamps retain microsecond resolution against the same UTC origin. The original raw `position.json` and base `validation.json` remain unchanged. Runtime position coverage and summary counts are refreshed in `playback.json`; original bounded raw counts remain under their original keys, with an additional `rawCounts.positionHistory=443`.

The canonical `mobile/assets/replay/track.json` is exported from the approved original A scene with `mobile/pipeline/scripts/export_track.py`, without exporting the retired browser GLB. The native car-free `mobile/assets/models/suzuka-world.glb` is built separately by `mobile/scripts/export_studio_world.py`, with visual smoothing that does not alter the replay centreline. The geographic plan is MIT-licensed (`../../assets/licenses/CIRCUIT-LICENSE.txt`); terrain elevation, bridge, road width, structures and car scale are illustrative. `track.json.points` has **1,026** authored centreline vertices in Three.js X/Y-up/Z coordinates, cumulative `lengths` and total model `length`.

`prepare_playback.py` robustly registers the approximate API XY coordinates to the authored XY plan using a 2D similarity transform. It projects onto continuous centreline edges, with temporal continuity to avoid switching between branches at the figure-eight crossing. **8,075 route samples** are added for the 17 moving streams; all original GPS sample timestamps are retained. Unavailable/stationary drivers have an empty route, not an invented one. New per-driver fields:

```text
route: [[t, phase, projectionErrorInModelUnits], ...]  // phase in [0,1), wraps at start/finish
routeRepresentation: <explicit reconstruction limitation string>
```

The runtime resolves phase against the 3D centreline, linearly interpolating between recorded route samples; it does not extrapolate across >3s gaps. Elevation comes from the **illustrative mesh**, not source altitude. `calibration.json` records the transform, method, median and p95 residuals; `registration.png` is a human-inspectable overlay. Small residuals measure agreement with the authored plan, **not** surveyed accuracy or lane precision. Pit-lane paths, lateral positioning, contacts and exact overtakes are not represented.

Recorded telemetry and gap values are unchanged from the imported fixture. Consumers hold the last telemetry sample at or before the playhead, display stale (>2s), missing or out-of-range values as —, show brake as On/Off, and show source-gap age. Rankings hold event state; a long time since a rank event does not by itself mean the event stream is stale. The last-lap readout requires completion by the playhead; whole-session metadata must not expose a known future lap time as already completed.

This extra processing does not change the noncommercial/rights limitation above. It is a bounded historical reconstruction, not a licensed live feed or surveyed digital twin.
