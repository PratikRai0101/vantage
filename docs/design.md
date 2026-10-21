# Product and design direction

## Approved brief

Vantage is a cinematic, precise, tactile miniature of a Grand Prix. The user
selected the dark, studio-lit **Race instrument** direction and subsequently
approved the native Expo/React Native implementation. Do not reopen the discarded
light-atlas or toy-tabletop concepts without a new product decision.

The primary action is to see the whole circuit and field, then follow a driver or
compare a genuine pair without losing race context. The working slice is a
historical replay, not a live subscription product. The working name and
commercial data/trademark rights are not cleared.

## Information architecture

- **Race:** native olive circuit miniature first; All cars / Follow / Battle,
  orbit/pinch/select, shared transport and driver detail.
- **Timing:** recorded order, Gap / Interval, completed laps and source age.
- **Lab:** time-aligned comparison traces and recorded telemetry for two drivers.
- Three reachable global destinations. No news feed, decorative KPI cards or
  account widgets in the core spectator loop.

Strategy, subscriptions, onboarding, account management and live-feed integration
are not implemented. Earlier simulated strategy/design studies are retired.

## Visual rules

- Preserve the olive maquette, rounded plinth, restrained planting, warm key/cool
  fill and softly baked vertex contact lighting. Geometry is illustrative.
- Powder blue denotes selection; team/trace colours encode data, not decoration.
  No branded liveries, official meshes, neon HUD, carbon texture or purple glow.
- IBM Plex Mono 400/600 for measured information; native system text for reading
  and controls. Never bundle Apple system fonts for Android.
- Tabular figures, restrained type hierarchy, roughly 20-point side margins and
  4-point spacing increments. Glass belongs on navigation/floating controls,
  not stacks of content cards. Current tokens live in `mobile/src/theme/`.
- Light mode keeps the same olive miniature and material identity.
- Labels remain screen-space readable. Selected cars keep a label and ground
  ring; overlapping projections use honest ×N groups, not invented lanes.

## Interaction and truthfulness

Camera targets ease with a bounded, interruptible response; reduced motion snaps
instead of flying. Follow retains track context and a stable studio azimuth;
Battle frames the actual selected pair, without manufacturing proximity. No idle
spinning or automatic camera changes.

All screens read one replay clock. Selection/camera changes preserve it; seeking
pauses; backgrounding pauses and never silently resumes. Readouts disclose source
age and unavailable/stationary streams. Brake is binary, not analogue pressure.
Missing measurements never become zero. Do not invent fuel, tyre temperature,
battery state, exact contacts/overtakes or broadcast footage.

The approved public demo is the continuous hands-on take in `Showcase/`, with
real interactions and reading pauses—not a screen montage. Native-device and
accessibility acceptance remains separate from visual approval; see
[validation](validation.md) and [data rights](data-rights.md).
