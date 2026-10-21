# Data, assets and rights

## Historical replay

The native app bundles the 2024 Japanese Grand Prix OpenF1 session **9496**,
05:55–05:57 UTC: twenty metadata streams, seventeen eligible moving streams and
three stationary streams. It makes no runtime API calls. Exact original queries,
fetch timestamps, rank-history provenance and registration evidence are retained
in [`mobile/pipeline/data/SOURCES.md`](../mobile/pipeline/data/SOURCES.md) and its data files.

GPS is registered/projected to an illustrative centreline. Motion is interpolated;
telemetry is read as-of the cursor. A low registration residual does not prove
surveyed geography, exact lanes, pit paths, contacts or overtakes. Elevation,
road width, car scale and scenery remain illustrative. Brake is binary; missing
fuel, tyre temperature and energy data are not manufactured.

## Commercial gates

These are previously recorded feasibility findings, **not legal advice or a new
licence check**. Revalidate primary terms before any live integration or release.

- [OpenF1 documentation](https://openf1.org/docs/),
  [homepage](https://openf1.org/) and [account](https://openf1.org/account): historical
  access and subscription real-time access are different. Public access is not
  blanket commercial redistribution clearance. Educational/personal/noncommercial
  evaluation does not establish a commercial contract, upstream rights, caching
  terms, device/concurrency permissions or availability guarantees.
- [Jolpica docs](https://api.jolpi.ca/docs/) and
  [terms](https://github.com/jolpica/jolpica-f1/blob/main/TERMS.md): useful for
  schedules/results research, not a positional feed; recorded noncommercial terms
  do not establish commercial SaaS permission. Jolpica is not integrated.
- No live-data contract, broadcast licence, commercial trademark review or store
  acceptance is established. Reconstructed Follow/Battle views are not licensed
  onboard or TV footage. The working Vantage name is not cleared.

## Original geometry, fonts and notices

- Circuit plan: [bacinger/f1-circuits Suzuka GeoJSON](https://github.com/bacinger/f1-circuits/blob/master/circuits/jp-1962.geojson),
  MIT. Source retained under `mobile/pipeline/geometry/`; full licence in
  `mobile/assets/licenses/CIRCUIT-LICENSE.txt`.
- Maquette, lighting and generic car geometry are procedurally authored. Native
  world rebuild instructions are in the [pipeline README](../mobile/pipeline/README.md).
  No official F1 car mesh, branded livery, sponsor artwork or broadcast imagery
  is bundled.
- IBM Plex Mono: SIL OFL, with fonts and full licence in `mobile/assets/`.
  Labels use native system fonts; Apple font files are not redistributed.
- Bundled dependency notices: `mobile/assets/licenses/third_party_notices.json`.
  The Expo template's MIT notice remains in `mobile/LICENSE`; Vantage's own
  proprietary terms are in the root `LICENSE`.

The original F1, F1 TV, Box Box, NFL and Apple Sports screenshots were design
references only, not product assets. Those downloaded references, unused Archivo
fonts, simulated design studies and the browser prototype have been removed.
