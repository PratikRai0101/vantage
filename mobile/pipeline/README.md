# Cached replay and model authoring

This is the offline rebuild source for the native app's historical Suzuka replay.
Run every command below from the repository root. No browser frontend is needed.

- `geometry/render_circuits.py` holds the original authored plan, illustrative elevation and scene. `geometry/suzuka.geojson` is the original geographic input. The native exporter still applies its literal source transformations to this file; keep their matching text intact when changing authoring code.
- `data/` retains the eight original OpenF1 responses, `raw-provenance.json`, the full-session `position-history.json` and its separate provenance, and the useful derived `replay.json`, `validation.json`, `calibration.json` and `registration.png` diagnostics. The history cache is essential: the bounded position query alone cannot seed all 20 drivers.
- `scripts/` imports the cached responses, exports the original track, prepares registered playback, and validates coverage and historical rank seeds.
- `../assets/replay/{track,playback}.json` are the single canonical prepared outputs consumed by the app and tests. There are no prepared copies in `data/`.
- `../assets/models/suzuka-world.glb` is the separately refined native model. Native visual smoothing never feeds back into replay track export or GPS registration.

## Offline rebuild

Requirements: Python 3 with NumPy and Pillow, and Blender (including its bundled
Python, `bpy` and `mathutils`). The cached rebuild needs no API access, credentials
or dependency upgrades. Set `BLENDER` to an existing executable; on this Mac:

```sh
BLENDER=/Applications/Blender.app/Contents/MacOS/Blender
python3 mobile/pipeline/scripts/import_openf1.py --offline
"$BLENDER" --background --python mobile/pipeline/scripts/export_track.py
python3 mobile/pipeline/scripts/prepare_playback.py --offline
"$BLENDER" --background --python mobile/scripts/export_studio_world.py
python3 mobile/pipeline/scripts/validate_fixture.py
```

These commands overwrite the derived files at their canonical paths. The importer
regenerates `provenance.generatedAt` to the current time, while retaining original
raw URLs, fetch timestamps and source values. Do not rewrite historical metadata
paths merely because the original prototype was retired. `--offline` fails if a
required cache is missing or the import manifest does not match; it never falls
back to an API request. The preparation requires both the cached position history
and its provenance. Network refresh remains an explicit authoring action: omit
`--offline` (and use the importer's `--refresh` only when intentionally refetching).

For verification without changing checked-in fixtures or the native model:

```sh
BLENDER=/Applications/Blender.app/Contents/MacOS/Blender
WORK=$(mktemp -d)
cp -R mobile/pipeline/data "$WORK/data"
python3 mobile/pipeline/scripts/import_openf1.py --offline --data-dir "$WORK/data"
"$BLENDER" --background --python mobile/pipeline/scripts/export_track.py -- --output "$WORK/replay/track.json"
python3 mobile/pipeline/scripts/prepare_playback.py --offline --data-dir "$WORK/data" --replay-dir "$WORK/replay"
"$BLENDER" --background --python mobile/scripts/export_studio_world.py -- --output "$WORK/suzuka-world.glb"
python3 mobile/pipeline/scripts/validate_fixture.py --data-dir "$WORK/data" --replay-dir "$WORK/replay"
```

The validator checks 443 cached historical rank events, exact per-driver as-of
seeding, 26 prepared rank records, coverage counts, original telemetry and GPS
streams, 8,075 route timestamps, continuity and the 1,026-point track. Runtime
sampling and engine behavior are covered by `mobile/tests/replay.test.ts`.
The native model bake is the slow step; track export itself builds no scene or GLB.
Use the same Blender version when comparing generated geometry or model bytes.

## Rights, provenance and outputs

[`data/SOURCES.md`](data/SOURCES.md) records the historical session, exact queries,
fetch timestamps, counts and reconstruction limitations. Raw caches and provenance
are retained together. OpenF1 access does not clear commercial redistribution of
the underlying Formula 1 data, marks or imagery; this fixture remains for personal,
noncommercial local use.

The Suzuka plan comes from MIT-licensed `bacinger/f1-circuits`; the notice is in
[`../assets/licenses/CIRCUIT-LICENSE.txt`](../assets/licenses/CIRCUIT-LICENSE.txt).
Scene structures, road width, elevation, terrain and scale are authored and
illustrative, rather than surveyed geometry or accurate lane placement.

`replay.json`, `validation.json`, `calibration.json`, `registration.png`, the two
canonical runtime JSON files and the native GLB can be regenerated. Keep the raw
source responses, both provenance manifests and geographic source when cleaning
outputs. Historical JSON metadata is evidence of the original import, not a list
of current filesystem locations. No browser GLB is produced by this pipeline.
