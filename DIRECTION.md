# Vantage — F1 race-viewing exploration

## Brief

User-authored brief, clarified before design. **Vantage is an unverified working name, not a naming recommendation or cleared brand.**

- Product: a rich, three-dimensional F1-viewing subscription product, starting from scratch, intended for iPhone and Android distribution.
- Core action: open the app and see the entire race: the full circuit and all cars, rather than immediately following one driver.
- Feel: **cinematic, precise, tactile**, confirmed by the user.
- Initial deliverable: visual concepts. Not production code, a live-data integration, or a working orbitable scene yet.
- Supplied reference: the miniature football field in the screenshot. The useful idea is sport-as-interface, with event context above and secondary information below.
- Requested inspirations: Formula 1 app, F1 TV, Box Box, NFL app, Apple Sports.
- Existing assets and code: none. Circuit, cars, buildings, vegetation and lighting are procedurally modelled for this exploration. No paid image generation.

## Reference synthesis

Official product pages and current US App Store screenshots were consulted. Downloaded reference imagery stays in `references/` and is not used inside the concepts.

| Reference | Take | Do not copy |
|---|---|---|
| F1 app | Race context, exact lap state, driver codes | News-first home screen, branded red-and-black furniture |
| F1 TV | Camera choices and spectator control | Broadcast footage, unsupported video/onboard rights, desktop multiview crammed onto a phone |
| Box Box | Compact session information, driver shorthand | Turning the core experience into a wall of widgets |
| NFL / supplied image | A physical miniature as the emotional centre | Scoreboard proportions that are wrong for a motor race |
| Apple Sports | One-glance hierarchy and calm explanations | A score-list home page when the purpose is to see the whole race |

## Category default refused

F1, F1 TV and Box Box commonly foreground broadcast imagery, timing information, schedules, news or widgets; black surfaces, strong red sports branding and tightly packed rectangular information modules are familiar conventions. This app will not be their average. The circuit is the content and the main interaction, not a small flat map beneath a dashboard. No neon HUD, carbon-fibre texture, purple glow, generic supercar photography, or decorative stat-card grid. Team colours can encode drivers, but do not become a multicolour UI palette.

## Three concept sentences

### A — Race instrument

**Vantage is a precision scale model of a Grand Prix.**

- Source family: `object` — machined maquette, instrument case, modelmaker's studio.
- Ground: `dark`.
- Type: `mono` — IBM Plex Mono for the circuit name and changing timing; SF Pro for readable labels. Mono is confined to the instrument's identifying and measured information.
- Accent hue: `blue` — a pale blue means selected camera mode and completed lap ticks. Team colours are semantic data.
- Richness: `3d-object` — olive terrain, dark asphalt, white line paint, raised bridge, small grandstands and Ferris wheel, softly lit on a charcoal studio ground.
- Layout: circuit first, camera controls, then a three-row timing strip. The whole field remains visible.
- Own failure mode: looking like a technical map in a black frame. Countermeasure: visible terrain thickness, grounded shadows, material differences and recognisable miniature cars.

### B — Broadcast atlas

**Vantage is a live broadcast atlas of the race.**

- Source family: `media` — an illustrated broadcast map, not a printed timetable.
- Ground: `light`.
- Type: `grotesque` — Archivo 800 for short location and event statements, SF Pro for controls and changing numbers.
- Accent hue: `orange` — selected camera mode. Team colours remain data.
- Richness: `illustration` — a high-angle, softly coloured 3D landscape with deliberately simplified vegetation and architecture, like one consistent illustrated broadcast map.
- Layout: a big location label, aerial circuit, then one sentence explaining who leads; the full timing table is one level deeper.
- Own failure mode: a pale, sterile map. Countermeasure: enough depth and foliage to feel like a place, dark legible asphalt, and a strong race statement.

### C — Tabletop

**Vantage is a slot-car table you can hold in one hand.**

- Source family: `play` — a carefully made physical racing toy, not a game console interface.
- Ground: `colour-field` — racing jade, kept continuous behind content.
- Type: `rounded` — SF Rounded with deliberately substantial display weight.
- Accent hue: `yellow` — warm ivory-yellow denotes selected camera mode and lap progress.
- Richness: `colour-material` — ivory enamel road, jade terrain, muted brass edge, compact lacquered cars. This material system is deliberately more important than literal race-day realism.
- Layout: oversized circuit, a compact horizontal race-order comparison, then reachable camera controls.
- Own failure mode: becoming a children's game. Countermeasure: exact timing, restrained forms and grown-up jade/brass materials.

## Exact exploration content (written before screen layout)

All three show the **same simulated race state**, not an asserted result from an actual Grand Prix. No calendar date or live-feed indicator is shown.

- Clock: 14:37.
- Event: Japanese Grand Prix.
- Circuit: Suzuka.
- Race state: Demo race; Lap 31 / 53; 22 cars on circuit.
- Circuit facts where shown: 5.807 km; 18 turns.
- Position 1: Norris / NOR / Leader.
- Position 2: Verstappen / VER / +1.842 seconds to leader.
- Position 3: Piastri / PIA / +4.106 seconds to leader.
- Diagram labels: 1 NOR; 2 VER. Other cars are visible but unlabelled at overview scale; a full list is proposed behind All 22.
- A: Japanese Grand Prix; Suzuka; Lap; 31 / 53; Demo race; Drag to orbit; 22 cars on circuit; Circuit; Follow; Battle; Race order; All 22; Norris NOR Leader; Verstappen VER +1.842s; Piastri PIA +4.106s; Simulated positions; Sync.
- B: Japanese Grand Prix; Suzuka; Lap; 31 / 53; 5.807 km · 18 turns; Full circuit; Demo race (toolbar); Full circuit · 22 cars; Norris leads.; Verstappen is 1.842s behind.; Race order; All 22 drivers; Circuit; Follow; Battle; Simulated positions; Sync.
- C: Race room; Japanese Grand Prix; Suzuka; Lap; 31 / 53; Demo race · 22 cars; Turn the whole circuit; Race order; All 22; 1 NOR Leader; 2 VER +1.842s; 3 PIA +4.106s; Circuit; Follow; Battle; Simulated positions; Sync.
- Symbol-only controls: Back; More; Expand circuit.

## Exploration tokens

| Role | A / dark studio | B / daylight | C / jade material |
|---|---|---|---|
| ground | #111A1D | #EFF3F1 | #105A4B |
| raised | #1E2A2F | #FFFFFF | #226B58 |
| ink | #F2F4F0 | #182823 | #FCF1CF |
| ink-2 | #A8B8BC | #52635D | #D7E5D3 |
| ink-3 | #97A9AE | #607068 | #C5DACA |
| rule | #344247 | #D1DBD5 | #4B8771 |
| accent | #B9D4F5 | #A94D27 | #F2DB8E |
| on-accent | #142735 | #FFFFFF | #28483B |

- Primary side margin: 20pt across all explorations.
- Spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48pt. Circuit area absorbs changes in phone height.
- Corners: 6pt diagram labels; capsules for camera choices; 44pt circular toolbar targets. No content card stack.
- Base type roles: 11pt tertiary/diagram label; 12–13pt metadata; 15pt body/timing; 17pt subheading; 20–23pt lap/comparison; 23pt B lead statement; 34–44pt display. Variation is limited per direction; this is not a combined product type scale.
- Regular/bold contrast: 400/600 in A; SF 400/600 and Archivo 800 in B; SF 400/600 and Rounded 800 in C.
- Display tracking: A -1.5pt at 34; B -1.7pt at 44; C -1.2pt at 40.
- Live figures use tabular numbers. Glass is confined to navigation and camera controls.
- Final light/dark counterparts and a single consolidated token system follow selection; B is not claimed to be A's light mode, nor vice versa.

## Signature interaction — proposed, not yet implemented

**Hold the race, then dive into it.**

1. Overview: the whole circuit and all 22 cars are in frame.
2. Touch a car: its small label lifts, other labels recede, and a fine camera target settles around the car in 120ms. No interruption of incoming positions.
3. Follow: the camera travels to a trailing view over 480ms using a critically damped, interruptible spring. The selected car remains the spatial anchor. One light selection haptic at lock-on.
4. Pinch out or choose Circuit: reverse the move to the full field in 420ms. A light impact confirms the overview fit. The return never loses the race's live time.
5. Reduced motion: preserve camera state and selection, crossfade between overview and follow in 120ms; no flying camera.

Rotation tracks a drag directly; release preserves velocity with gentle damping. No idle spinning, decorative motion or auto-camera changes. Sync is proposed as a manually adjustable delay to align the model with a user's broadcast; no broadcast stream is included.

## History check

Read `~/.app-designer/history.md` before rendering. The three rows are:

| app | source family | ground | type | accent hue | richness source |
|---|---|---|---|---|---|
| Vantage A | object | dark | mono | blue | 3d-object |
| Vantage B | media | light | grotesque | orange | illustration |
| Vantage C | play | colour-field | rounded | yellow | colour-material |

Each differs from every existing row on at least three of the five comparison columns. The three concepts use different families, grounds, type designs, accent families and dominant richness systems. They deliberately retain the same physical circuit and race state so the comparison is honest.

## Data, rights and representation

See `REFERENCES.md` for primary-source links and findings. Important: a public API is not a commercial licence. OpenF1 documents free historical access but subscription-based real-time access; its site directs commercial uses to contact the project. Jolpica's published terms also require contact for commercial use. No live integration, contracted availability, or blanket clearance is claimed.

The Suzuka plan comes from the MIT-licensed `bacinger/f1-circuits` repository. Its licence is preserved in `assets/CIRCUIT-LICENSE.txt`. Elevation, buildings, greenery, road widths and car scale are illustrative. Twenty-two procedurally modelled cars are enlarged for overview visibility; this is not a survey-accurate digital twin. Liveries are generic colour cues without manufacturer, team or F1 logos. Editorial driver names do not establish production rights clearance.

## Selected direction — A, confirmed by the user

**A wins for this brief:** the studio-lit model feels cinematic and tangible, while its quiet timing strip preserves precision. It gives the whole race priority without turning into a broadcast video app or a wall of widgets.

- B loses on drama: its daylight atlas is approachable and clear, but less immersive and less physically present.
- C loses on positioning, not craft: its jade/enamel/brass identity is the most distinctive, but risks reading as a racing toy rather than authoritative spectatorship. It remains a strong bolder alternative if the user favours playfulness.
- No unrendered hybrid is claimed. A, B and C are shown as actually rendered.
- Independent review subtotals excluding the unrendered signature: round 1 A43/B40/C48 out of55; round2 A44/B43/C49 out of55. Highest aesthetic score does not automatically mean best fit to the user's product positioning.
- Latest sheet: `shots/explore-r2/sheet.png`. Small phone: `shots/explore-r2-small/sheet.png`. Both mechanical scans have zero FAILs. See `CRITIQUE.md` for the rubric, accepted changes, warning responses and one unscored post-review badge-position fix.

## Current brief extension — selected A

The user selected **A** and confirmed the **miniature treatment**, then requested more visual concepts, an improved live dashboard, enthusiast telemetry/complex analysis, animations and micro-animations. No new direction exploration is needed; preserve the precision-scale-model identity. This remains a visual-concept delivery, not a live product or an App Store-ready build.

## A product structure

- **Race:** full miniature circuit first; switch Circuit / Follow / Battle without losing race context. A compact race-order strip and the latest race event sit below it.
- **Timing:** a genuine race timing tower, not a generic KPI dashboard. Position, driver, gap or interval, last completed lap and tyre age; all 22 drivers in one scrollable table.
- **Lab:** enthusiast tools. Telemetry and Strategy are contextual modes within Lab, not five competing bottom tabs.
- Driver follow is a spatial detail of Race. Feed interruption is a real state: freeze last-known positions and identify stale data, rather than continuing a deceptive live animation.
- Three reachable global destinations: Race / Timing / Lab. Secondary controls remain within their content. No feed, news carousel, account tiles or decorative stat-card grid.

## Consolidated A tokens

| Role | Dark studio (primary) | Light studio |
|---|---|---|
| ground | #111A1D | #E9EEEB |
| raised | #1E2A2F | #FAFCFA |
| ink | #F2F4F0 | #14282E |
| ink-2 | #A8B8BC | #4B6167 |
| ink-3 | #97A9AE | #5B7176 |
| rule | #344247 | #C8D4D3 |
| accent | #B9D4F5 | #285879 |
| on-accent | #142735 | #FFFFFF |
| caution (stale data only) | #D7B57C | #845A23 |

Seven type sizes: **11 / 13 / 15 / 17 / 22 / 34 / 52pt**. IBM Plex Mono 400/600 for measured values and identifying display; SF Pro 400/600 for reading and controls. Display tracking -1.5pt at34, -2pt at52. Figures tabular. Team/trace orange NOR and blue VER are semantic data, and traces also differ by solid/dashed style. Medium/hard tyres use explicit M/H and neutral shape, not another decorative palette. Margin20pt; spacing4/8/12/16/20/24/32/40/48; badges8pt; functional sheets24pt; navigation capsules. Glass only on floating controls/navigation.

The light mode keeps the **same olive miniature and machined materials**; it is not B's pastel atlas. Dark content gains lighter elevation, not black shadows on every row.

## Content — A screen set (fixed before layout)

All clocks14:37; event Japanese Grand Prix / Suzuka; current lap31 of53, **30 completed laps**. Every frame says **Live demo** or **Demo**. Source: **Simulated data**. No real data access or measured production latency is implied. The current-race sample, completed-lap comparison and hypothetical pit scenario are explicitly different contexts.

### 01 Race / dark

- Toolbar: Back; Live demo; More.
- Japanese Grand Prix; Suzuka; Lap; 31 /53.
- Image subject: the complete A Suzuka miniature, all22 static simulated cars; labelled1 NOR and2 VER with exact projected anchors.
- Circuit; Follow; Battle. Drag to orbit. 22 cars.
- Lap30 · Norris gained0.143s. Race order; All22.
- 1 Norris NOR Leader; 2 Verstappen VER +1.842s; 3 Piastri PIA +4.106s.
- Simulated data; Sync. Bottom destinations Race / Timing / Lab.

### 02 Timing dashboard

- Live demo; Timing; Suzuka · Lap31 /53; 22 cars.
- Gap / Interval control; column headings Pos, Driver, Gap (or Interval), Last lap, Tyre.
- Row content is fixed in `assets/a2/concept-data.json`: all22 drivers, ranks and gaps. Visible top rows are NOR, VER, PIA, LEC, RUS, HAM, ANT, ALO and SAI; the remainder genuinely scroll below navigation.
- First5: NOR Leader /1:32.184 /H12; VER +1.842 /1:32.327 /H13; PIA +4.106 /1:32.412 /H11; LEC +9.684 /1:33.018 /M3; RUS +12.318 /1:32.856 /H10.
- Gap values are seconds to leader; interval mode is seconds to the car immediately ahead. Tyre age is **completed laps**, not the current partly driven lap.
- Footnote: Tyre age = completed laps. Data is simulated. Reachable Race / Timing / Lab.

### 03 Follow / driver detail

- Back; Live demo; More. Lando Norris; P1 · McLaren.
- Image: trailing three-quarter **3D miniature view** of the orange car on Suzuka's crossover; it is reconstructed geometry, not onboard/broadcast video.
- Circuit / Follow / Battle; Follow selected.
- Main measured value: **286 km/h**; Gear7; Throttle99%; Brake Off; RPM11,284. This is a separate illustrative current-frame sample, not the completed-lap scrub value below.
- Gap to Verstappen1.842s. Last lap1:32.184. Open telemetry.
- Simulated data. Race / Timing / Lab.

### 04 Telemetry / enthusiast comparison

- Back; Demo; More. Telemetry; NOR vs VER.
- Completed lap30; Distance aligned. NOR1:32.184; VER1:32.327.
- Stacked speed (km/h), throttle (%), brake (On/Off), and lap-delta (s) plots share one distance axis0–5.807km and one cursor. NOR solid orange; VER dashed powder blue. No 1000Hz claim or invented brake-pressure percentage.
- Initial cursor: **4.278km**. NOR263km/h, throttle99%, brakeOff, gear7, RPM11,068. VER265km/h, throttle99%, brakeOff, gear7, RPM11,079. Delta NOR−VER **−0.307s** at cursor; at end of lap **−0.143s**.
- Short explanation: Negative delta means Norris is ahead. The0.307s intermediate advantage closes to0.143s at the finish; do not confuse it with the current race gap1.842s.
- Drag to inspect; Simulated traces. Telemetry / Strategy within Lab. Race / Timing / Lab.

### 05 Strategy / enthusiast scenario

- Back; Demo; More. Strategy; Norris pit scenario.
- Orange miniature car subject, matching the physical A language.
- If Norris pits now; **P7**; Estimated rejoin.
- Pit loss22.4s; an editable **assumption**, not a measured or predicted stop. Current rankP1. At the demo gaps,22.4s places Norris behind Antonelli (18.229s gap) and ahead of Alonso (25.034s gap).
- Behind ANT4.171s; Ahead of ALO2.634s.
- Stint history; Completed laps1–30; current31 marker; full race53. NOR M1–18,H19–30 (12 completed); VER M1–17,H18–30 (13); PIA M1–19,H20–30 (11); LEC H1–27,M28–30 (3). Neutral compound encoding with M/H labels.
- Assumes other gaps stay unchanged. No traffic, safety-car or tyre-degradation forecast is claimed. Telemetry / Strategy; Race / Timing / Lab.

### 06 Interrupted-position state

- Demo; Suzuka; Lap31 /53. Amber data-state label: Positions paused.
- A miniature held at its last-known car positions, not an animated live field.
- Holding the last known positions. Timing is8.4s old. Last update14:37:12.
- Retry; Keep last frame. Race / Timing / Lab; Simulated interruption.

### 07 Race / light studio

Identical race content and architecture to01, with the consolidated A light tokens and the same olive miniature. Not a new direction or a washed-out map.

### 08 Signature storyboard

Three mini frames, same world and camera: **Overview / Select NOR / Follow locked**; at0 /160 /480ms. Brief copy: Tap a car. Follow without losing the race. Pinch back to the whole field. Genuine rendered camera frames, not a fake perspective zoom. Reduced motion uses a120ms crossfade. Storyboard is a motion panel, not a user screen.

### App icon

A single loop of elevated circuit crossing itself, in powder blue/ivory on studio charcoal, with one orange car-sized notch. No wordmark, chequered flag or generic speedometer. Design for layered foreground track and background field; no official F1 logo. Three colours maximum.

## Motion delivery and specification

- **Camera dive:**30 actual orthographic camera frames of A's 3D geometry, played480ms forward /420ms reverse using a critically damped progress curve; selected NOR remains in frame. The cars in this camera film are frozen at a simulated moment. Do not describe this as a connected live3D engine.
- **Camera selector:** one selection capsule translates on state change,250ms snappy spring; press0.97 then release. Proposed selection haptic at lock-on, not every click.
- **Telemetry scrub:** shared crosshair follows pointer/finger1:1 through all4 channels; values and accessible cursor description derive from that exact sample. Keyboard arrows work. No animation that lags behind the finger; numbers settle on release.
- **Timing update:** trigger a simulated interval tick; only changed digits transition180ms. No whole-list fade or reordering without a real data-state change.
- **Pit assumption:** slider changes assumed pit loss; recompute rejoin from fixed demo gaps and label the result as a scenario. No fabricated confidence score.
- **Stale state:** stop position motion; change data-status label, no alarming pulsing or fake heartbeat. Retry has a one-shot progress acknowledgement.
- **Reduced motion:** system preference plus explicit preview toggle; camera crossfade120ms, no flying camera, no rolling digits. Scrubbing stays direct, data never disappears. Native haptics remain specified but not verified in a browser.

## Scope boundaries

This set covers the core spectator and enthusiast loop, two colour modes, data interruption, a motion storyboard and an icon. Calendar, favourites, onboarding, subscription/paywall, account, purchase restoration and Android-specific screens are **not designed in this iteration**. The user asked for visual concepts, not a production build.

OpenF1's documented telemetry is sampled at about3.7Hz; intervals about4s. Brake is a binary On/Off channel, not brake pressure. Position data is approximate and cannot justify exact wheel-to-wheel lateral placement. Derived lap deltas and pit scenarios are identified as derived. Energy/battery state, tyre temperatures, fuel loads and official video are not promised from these endpoints. Commercial permissions remain unresolved.

## Validation status

Completed eight frames plus icon at3×. Final contact sheet: `shots/a2-r2/sheet.png`; small-phone sheet: `shots/a2-r2-small/sheet.png`. Both mechanical scans exit0 with zero FAILs; exactly7 text sizes. All warnings are answered in `CRITIQUE-A2.md`.

Two fresh-eye full-set rounds: **45→48/60**, ending with all12 criteria4/5 and no substantiated concrete defects. Changes: stronger nav/demo ink, explicit equal navigation columns, assumptions beside pit input, smaller-phone stale-label suppression and a persistent distance/delta rail outside plot scrolling. Road-intersecting vegetation was removed from the actual3D geometry and all camera frames rebuilt.

Working presentation: `presentation-a2.html`, with actual30-frame camera travel, reduced-motion toggle, shared telemetry scrub, timing tick and assumed pit-loss adjustment. Validated at728/390/320px and with system reduced motion; no JavaScript errors or horizontal overflow. All22 timing rows exist and gap/interval toggling is functional in `mockup.html`.

The prior exploration remains preserved at `explore.html` and `shots/explore-r2/`. No production-performance, native haptic, live-feed or Android claims are made.

## Approved continuation — historical interaction proof

After approving the expanded baseline, the user authorized the proposed moving-car replay prototype. `replay-prototype/` is now a working **browser proof**, not a native implementation or a final-stack decision. Vanilla Three.js renders the approved car-free geometry with dynamic cars; no simulated static-gallery values are passed off as recordings.

OpenF1 session9496, Suzuka2024, 05:55–05:57UTC:20 real driver streams,17 eligible for movement; RIC/ALB/ZHO stationary streams retained but not animated or labelled official retirements. Source metadata and dated provenance are in `replay-prototype/data/SOURCES.md`. Full historical rank-event seeds precede the clip; all UI uses one replay clock. Approximate GPS is registered/projected to centreline, not accurate lanes or pit paths; illustrative elevation/car scale remain disclosed.

Implemented: overview/follow/two-car Battle, orbit/zoom/reset, pause/seek/speed, Race/Timing/Lab, causal recorded telemetry, time-aligned comparison and reduced motion. Strategy remains in the separate approved visual study, not falsely connected. Typography uses portable Plex + locally available system labels, not bundled Apple fonts on Android.

Seven logic tests and responsive Chrome checks pass, including375×667/320×568 unobstructed transport, visual/DOM focus agreement, both battle labels, no self-comparison, no heading clipping/overflow or JS/HTTP errors. A fresh critic verified five fixes over **46→47/60**; native fluency honestly remains3 because it is a browser proof (`CRITIQUE-REPLAY.md`). On-device performance, native renderer/stack, Safari/Android behavior, haptics and commercial/live rights remain the next gates.

## Native miniature polish — approved continuation

The user approved Expo/React Native, then requested a substantially more crafted 3D viewport after the Note20 startup fix. Direction A is retained, not reopened. Keep: the real historical fixture/registration, whole-field-first Overview, Follow/Battle, native rendering and controls. Lose: striped terrain, uniformly random planting, crude box cars, pixel-font plaques and heading-driven camera spins. No feature or race-data changes.

Native scene now uses a separately exported olive maquette with continuous rounded ground outline, softly bevelled plinth/buildings, small pit-roof louvres and deterministic grove planting. Ambient contact and soft key occlusion are baked into real vertex colour, not per-frame shadow/postprocessing overhead. These are original illustrative model details, not surveyed track geometry. Runtime lighting separates warm key/cool fill; procedural open-wheel cars have tapered bodywork, wing planes/endplates, hubs, suspension and helmets, merged into five material batches per car. Plex Mono GPU glyphs are rasterised from the bundled OFL font with antialiasing and correct sRGB encoding; selected labels use a fine powder-blue rim, smaller screen-space sizes and short anchor stems.

Follow zoom5→3.1 retains track context and a stable studio azimuth through bends. Battle retains the genuine pair midpoint with distance-based framing and a tighter close-pair bound; no fabricated lateral racing lines. Camera targets ease with a bounded, interruptible exponential response (~0.5s settling), reduced motion snaps immediately. Existing selection haptics remain; physical feel is not scored from screenshots.

Native APK installed and checked on Samsung Note20 5G / Android13: startup passes, all three cameras captured, camera/moving-field pixel gate462399/293502 passes. Screens `shots/native-polish/device/`; tests26 pass, TypeScript/ESLint pass. This is a real native visual improvement pass, not full quality or performance sign-off. iOS Simulator's prior stale-presentation gate remains separate. See `NATIVE-POLISH.md` for critique and outstanding art issues.
