# Sources and feasibility notes

## Historical replay prototype — implemented after visual approval

The local `replay-prototype/` now uses actual OpenF1 recordings for session9496, Suzuka 2024, 05:55–05:57UTC. Twenty metadata streams, seventeen moving; three stationary streams excluded from animation. Exact queries, clock-reported fetch timestamps and counts are in `replay-prototype/data/SOURCES.md` and its JSON provenance files. A separately documented full-session ranking-event fetch supplies causal pre-window rank seeds.

`prepare_playback.py` registers approximate GPS to the approved centreline and outputs `playback.json`; `registration.png` and `calibration.json` make the fit inspectable. Recorded timestamps are retained, GPS movement is interpolated, and telemetry is read as-of the cursor. A small registration residual is not a guarantee of geographic/lane accuracy. Elevation, road width, car scale and pit geometry remain illustrative. No exact overtaking or broadcast/onboard claim.

The browser proof vendors Three.js0.180.0 under MIT (`replay-prototype/vendor/THREE-LICENSE.txt`); no runtime CDN or API access. Seven causal-clock/fixture tests and responsive Chrome interaction checks pass. Native iPhone/Android performance and commercial/live rights are still unresolved. The following static-design notes describe the earlier simulated assets, not this separate recorded replay.

## Selected A — static telemetry design constraints

Rechecked primary documentation at https://openf1.org/docs/ for the expanded enthusiast screens. Car data is documented at approximately3.7Hz; intervals approximately4s. Brake reports pressed/not pressed, not analogue pressure. Position data is approximate and does not establish exact left/right lane placement. The UI therefore shows binary brake and reconstructed camera views, and makes no fuel-load, tyre-temperature, battery-state or exact wheel-to-wheel claim.

All traces are authored deterministic samples in `scripts/build_a2_data.py`. Speed profiles integrate to the displayed completed-lap times, and the delta is derived from those profiles. Race gaps, current-frame driver values and historical-lap cursor values are separate labelled contexts. The pit-rejoin control is a fixed-gap scenario using an explicit assumed pit loss, not a prediction.

Original additional miniature assets and camera films: `scripts/render_a2_assets.py` / `scripts/capture_a2_motion.py`. Road-intersecting vegetation was removed, and the whole overview/follow film rebuilt. No paid generated imagery or official car mesh is used.

Checked 18 October 2026. This is a design exploration, not a legal opinion or a commercial data agreement. Search extracts and product pages can change; revalidate terms directly before integration.

## Inspiration: official product sources

- F1 Live Timing: https://f1help.formula1.com/nl-NL/article/F1-Live-Timing — timing, tyres, driver tracker, per-driver information and replay. Subscription availability varies by feature and region.
- Formula 1 app: https://apps.apple.com/us/app/formula-1/id835022598 — current US App Store screenshots consulted for race context, schedule and navigation patterns.
- F1 TV: https://apps.apple.com/us/app/f1-tv/id1315007279 — official descriptions of live/on-demand footage, onboard cameras and multi-feed viewing. Do not assume its video or data rights are reusable by an independent SaaS.
- F1 / Apple integration: https://www.formula1.com/en/latest/article/apple-reveal-details-of-f1-integration-on-apple-tv-apple-maps-apple-news-and.4JJY1CUT4eobqZ78wTcO3L — primary 2026 article describing driver tracker, telemetry, timing, Sports results and Maps circuit landmarks. These are inspiration, not exposed public APIs.
- Box Box: https://apps.apple.com/us/app/box-box-club-formula-widgets/id1621241916 — compact schedules, driver/team widgets and race updates. Product description and screenshots consulted; no assets copied into the design.
- NFL: https://support.nfl.com/hc/en-us/articles/35869707768084-What-s-in-the-new-version-of-the-App — official app description: scoring, in-game highlights, drive charts and subscription content. The supplied miniature-football-field screenshot is the primary structural reference for sport-as-interface.
- NFL screenshots: https://apps.apple.com/us/app/nfl/id389781154 .
- Apple Sports: https://apps.apple.com/us/app/apple-sports/id6446788829 — glanceable live results and statistics; screenshots consulted for the hierarchy, not for a score-list-first home page.

Downloaded App Store metadata and imagery are reference-only in `references/`. The created mockups do not include those screenshots or logos.

## API constraints that affect the product promise

### OpenF1

Primary sources:
- https://openf1.org/docs/
- https://openf1.org/
- https://openf1.org/account

The documentation explicitly distinguishes free historical access (2023 onward, without authentication) from real-time data requiring a subscription. The site describes approximately three-second live updates, but that is not a contracted end-to-end app latency guarantee. It says the project is intended for educational, research, personal and non-commercial fan uses and asks other use cases to contact it about appropriate licensing and applicable rights.

The homepage's broad 'free for everyone' language must not override the more specific access and use restrictions. Do not put a free-live-data promise into a paid product's pricing page. Obtain explicit commercial terms and clarify upstream rights, live coverage, redistribution, cache policies, permitted end-user devices, concurrency, reliability and fees.

The location endpoint supports the bounded historical proof described above: coverage, observed sample gaps and one-session coordinate registration have now been checked. This is not a multi-session completeness study, surveyed error bound or live-cadence guarantee. Interpolation is identified as reconstructed motion, not exact observed poses. The earlier static gallery remains simulated; only `replay-prototype/` is connected to the cached historical fixture.

### Jolpica

Primary sources:
- https://api.jolpi.ca/docs/
- https://github.com/jolpica/jolpica-f1/blob/main/TERMS.md

Useful to investigate for calendar, results, standings and historical information, not as a substitute for a live positional feed. The published terms describe free non-commercial use under CC BY-NC-SA 4.0 and direct commercial uses to contact the maintainers. A commercial SaaS must not assume that 'free public API' means commercial clearance.

### What remains unverified

No exhaustive free-API audit has been completed or claimed. No credentials or subscription have been purchased. No live feed, data contract, broadcast licence, App Store entitlement, commercial trademark review, or Android implementation exists yet. Reconstructed follow/battle cameras are distinct from licensed onboard or TV footage.

## Original 3D assets and circuit geometry

- Suzuka plan geometry: https://github.com/bacinger/f1-circuits/blob/master/circuits/jp-1962.geojson .
- Repository licence: https://github.com/bacinger/f1-circuits/blob/master/LICENSE — verified via GitHub's licence API as MIT. Copy retained at `assets/CIRCUIT-LICENSE.txt`.
- Local circuit facts in GeoJSON: Suzuka International Racing Course; length 5,807m. The design uses the commonly documented 53-lap race distance and 18-turn layout as context; this is a simulated state, not a dated session or an official result.
- Models and lighting: authored procedurally in `scripts/render_circuits.py`, with Blender Cycles. Source `.blend` files retained in `assets/`.
- Geographic plan is real; terrain height, bridge profile, vegetation and buildings are illustrative, not surveyed. Car dimensions and road width are intentionally enlarged to help overview legibility.
- Cars use generic coloured material cues, not official meshes, sponsor artwork, branded liveries or team logos.
- In the original static gallery, car positions/timing gaps and the iPhone clock are illustrative demo values. The later recorded replay has its own dated fixture and source provenance; it is explicitly historical, never live.

## Fonts

- SF Pro / SF Rounded / system chrome use the app-designer device kit and macOS Apple fonts for iPhone design mockups. A production Android app needs platform-appropriate font licensing and typography adaptation; do not ship Apple system font files cross-platform.
- IBM Plex Mono and Archivo are downloaded from Google Fonts for display exploration. OFL licences are saved as `assets/ibmplexmono-OFL.txt` and `assets/archivo-OFL.txt`.
