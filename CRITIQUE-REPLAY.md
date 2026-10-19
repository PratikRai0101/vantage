# Historical replay prototype — fresh-eye critique

The approved static A suite remains 48/60 (`CRITIQUE-A2.md`). This is a distinct browser implementation study, not a native build or a visual-direction restart.

## Round 1 — 46/60, concrete defects found

T3 review task: `node:delegated-task:command%3Amcp%3Aa81af741-6ffb-4903-b310-f1097eb01de0%3Adelegate-task%3Avantage-replay-review-r1`.
Read-only independent critic, original brief plus rendered pixels and source; did not inherit the parent conversation. Reviewed eight screenshots, exercised existing app in Chrome and reran the then-six logic tests. Original renders preserved in `shots/replay-r1/`.

| Criterion | Score | Evidence |
|---|---:|---|
| Concept on the pixel | 4 | Whole miniature and field markers communicate whole-field spectating. |
| Not the category average | 4 | Olive tabletop instead of broadcast/game spectacle. |
| Not this skill’s average | 4 | Dimensional scene gives the instruments a physical identity. |
| Hierarchy | 4 | Circuit leads overview; trace leads Lab. |
| Typography | 4 | Heading scale versus compact Plex measurements. |
| Colour | 4 | Powder-blue interaction, team-colour identification. |
| Richness | 4 | Terrain, trees, wheel, buildings and model cars. |
| Rhythm and space | 4 | Ordered ruled groups and scene space. |
| Craft details | 3 | Accurate ages/binary brake, but short-phone transport obstructed. |
| Native fluency | 3 | Browser range/select styling; deliberately not a native implementation. |
| Signature | 4 | Whole field to labelled miniature follow. |
| Feature test | 4 | Overview/follow make an editorial screenshot story. |

Score stop rule met (10/12 ≥4, none below3), but all concrete defects accepted for correction:

1. **P2 short-phone obstruction:** 375×667 fixed nav began y606 while scrubber spanned y586.6–630.6. Reduced scene height responsively on short screens; added actual centre/four-inset hit tests, not just box-size tests. Added 320×568 coverage.
2. **P2 timing focus order:** CSS order showed ranks while DOM stayed numerical-driver order. Reconcile actual DOM to recorded standings, move only changed nodes and restore focused driver with preventScroll. Tests exercise P1→P2 Tab order and focus retention through a rank change.
3. **P2 ambiguous battle partner:** heading named NOR+HAM but only NOR identified. Added second label/ring, collision-aware placement, hidden outside Battle. Test verifies distinct, visible, nonoverlapping labels.
4. **P3 self-comparison:** only driver-switch handler prevented duplicates. Disable selected driver in comparison menu and guard both directions; test forces invalid self-selection and verifies it is rejected.
5. **P3 source-doc omission:** linked SOURCES described original bounded fixture only. Added authoritative playback pipeline, recorded history seeds, registration, outputs, limitations and reproduction command.

Additional consistency correction: derived position coverage/summary now matches 26 playback events and 443 raw historical events. Original import statistics remain untouched. Added a seventh unit test for counts, source/route timestamps and continuity. No native performance or commercial-rights claim added.

## Round 2 — 47/60, all five fixes independently verified

T3 review task: `node:delegated-task:command%3Amcp%3Aa81af741-6ffb-4903-b310-f1097eb01de0%3Adelegate-task%3Avantage-replay-review-r2`.
Same original brief, all prior findings/responses and unresolved native/browser boundary supplied in a new delegated round; no stylistic restart. App code/screens frozen during review. Latest evidence: `shots/replay/`, seven unit tests and the enhanced passing `shots/replay/validation.json`.

The critic opened seven refreshed screens, independently reran **7/7** logic tests and exercised the corrected interactions without modifying files. All five asks landed. Craft rises **3→4**; all other scores remain as in round1. **47/60: eleven lines4, Native fluency3. Done by the stop rule. No remaining concrete defects found in this verification scope.**

Independent findings:
- 375×667 seek spans y495.6–539.6; 320×568 seek spans y410.2–454.2. Centre/four-inset hit points clear for seek, play, speed and all three cameras.
- P1→Tab reaches PER/P2; DOM ranks are ordered; SAR retains focus across P12→P11.
- Both NOR/HAM labels visible, distinct and nonoverlapping; secondary label hides in Follow. Partner ring source verified.
- Self-comparison rejected in either selection direction.
- Linked source docs correctly distinguish original import from derived playback, historical seeds, geometry and rights.

Real-device Safari/Android, assistive-technology announcements, native performance and commercial/live rights remain **unverified**. No score inflation or native-ready claim. No app/pixel changes after this review; only documentation and a clearly labelled screenshot gallery were finished.
