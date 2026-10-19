# Vantage exploration critique

**Selected A expansion:** see [CRITIQUE-A2.md](CRITIQUE-A2.md) for the full screen set and motion-concept rounds,45→48/60. The original exploration is retained below.

This is a direction-selection gate, not a finished-app award claim. The user asked for visual concepts first. Three core-screen alternatives have been reviewed at 402×874 and 375×667, rendered at 3×. Signature motion and the full 5–8-frame set follow selection and remain unscored.

## Round 1 — fresh-eye delegated critic

Task: `node:delegated-task:command%3Amcp%3A0e6914c7-c11b-4616-8de9-464960c8c2ac%3Adelegate-task%3Avantage-explore-review-r1`.
Provider/model: Pi / openai-codex/gpt-6.1-sol. Read-only visual review. All six individual PNGs opened.

| Rubric line | A | B | C |
|---|---:|---:|---:|
| Concept on the pixel | 4 | 4 | 5 |
| Not category average | 4 | 4 | 5 |
| Not skill average | 4 | 4 | 5 |
| Hierarchy | 4 | 3 | 4 |
| Typography | 4 | 4 | 4 |
| Colour | 4 | 4 | 5 |
| Richness | 4 | 4 | 5 |
| Rhythm and space | 4 | 3 | 4 |
| Craft details | 3 | 3 | 3 |
| Native fluency | 4 | 4 | 4 |
| Signature | Pending | Pending | Pending |
| Feature test | 4 | 3 | 4 |
| **Scored subtotal / 55** | **43** | **40** | **48** |

B's subtotal was initially recorded as 39; round 2 corrected the arithmetic to 40 without changing its individual scores.

Recommendation: A best combines cinematic, precise and tactile. C is more distinctive but can read as a racing toy. B is clear editorially, but headlines compete with the circuit and the model gets too small on a short phone.

### Critic asks and response for round 2

1. **Fix car anchoring and move labels away from crossing.** Accepted. Replace fixed pseudo-element stems with SVG paths from projected car coordinates to the actual label perimeter. Add small colour-keyed attachment dots. Reposition both callouts away from the road crossing for each camera.
2. **Make B's small-phone model larger; reduce the lead statement.** Accepted in intent. Keep full-circuit containment instead of literal width-only cropping. Recover stage height by moving Demo race into the toolbar, hiding optional circuit facts on short phones, reducing the lead statement from 29pt to 23pt, and reducing the location heading from 52pt to 44pt (32pt small). The entire circuit must remain visible.
3. **Shrink A/C location headings.** Accepted with one adjustment: A 38→34pt rather than 32, retaining a native large-title step; C 50→40pt. Recovered height goes to the model stage.
4. **Add seconds in A, retain Piastri on small screens.** Accepted. Add `s` to both gaps; show all three timing rows at 375×667 using 36pt non-interactive rows. All 22 remains the separate >=44pt interactive target. Driver rows are display data, not undersized controls.
5. **Replace airplane-like Circuit glyph.** Accepted. Replace it with a closed Suzuka-like circuit outline, maintaining the same 18pt glyph and 44pt control target.

### Scan results

Round 1: zero FAILs at both sizes, no browser errors. Warnings:
- C: three saturated hue families. Deliberate: yellow/ivory selection plus orange NOR and blue VER as semantic driver identifiers, also distinguishable by text.
- App-wide type scale: the scan merges three deliberately different concept systems, not one app. A has seven sizes; B seven; C is tightened further in round 2. Consolidate only after selection.

## Round 2

Screens: `shots/explore-r2/` and `shots/explore-r2-small/`.
Task: `node:delegated-task:command%3Amcp%3A0e6914c7-c11b-4616-8de9-464960c8c2ac%3Adelegate-task%3Avantage-explore-review-r2`.
Same provider/model, with the original brief, full prior findings, responses and unresolved tradeoffs supplied as continuation context. All six final individual PNGs opened.

| Rubric line | A | B | C |
|---|---:|---:|---:|
| Concept on the pixel | 4 | 4 | 5 |
| Not category average | 4 | 4 | 5 |
| Not skill average | 4 | 4 | 5 |
| Hierarchy | 4 | 4 | 4 |
| Typography | 4 | 4 | 4 |
| Colour | 4 | 4 | 5 |
| Richness | 4 | 4 | 5 |
| Rhythm and space | 4 | 4 | 4 |
| Craft details | 4 | 3 | 4 |
| Native fluency | 4 | 4 | 4 |
| Signature | Pending | Pending | Pending |
| Feature test | 4 | 4 | 4 |
| **Scored subtotal / 55** | **44** | **43** | **49** |

All five prior asks landed, with the documented A title-size adjustment accepted. Correct car anchors and board/circuit containment confirmed at both sizes. B's smaller headings and recovered stage height improved its hierarchy, rhythm and feature-test scores. A retains all three drivers with explicit timing units. C remains the most distinctive but has a deliberate toy/material identity.

Remaining concrete defect: B's NOR badge locally occludes an upper hairpin on the small phone. **Post-review fix:** move that badge 12pt right only in the short-phone container rule, retaining its projected car dot and recomputed line. Reshot both sizes and checked both B PNGs. This positional fix is **not re-scored**; the table preserves the critic's actual round-2 scores.

Recommendation remains **A — Race instrument**, best matching cinematic, precise and tactile. C is the bolder material alternative; B is calmer but less cinematic. Critic verdict: **Exploration ready**.

Final mechanical scan: zero FAILs at both sizes, no browser errors. C's three-hue semantic-data warning and cross-concept type-scale warning are answered above. During polish the scan caught a fourth hue from a jade SVG dot outline; changed the outline to the existing ivory material, then reran successfully rather than suppressing the check.

No full skill stop-rule claim: the complete selected screen set, second colour mode and rendered signature are intentionally deferred until the user chooses. Real-device motion, haptics, live positioning, production performance and Android adaptation remain unverified.
