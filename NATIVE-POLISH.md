# Native miniature polish — first implementation pass

**Historical pass, not final visual acceptance.** The user subsequently reported black/noisy surfaces, intersections, ghosting and choppy motion. Current targeted fixes, native red→green evidence,34-test suite and remaining open defects are documented in `RENDER-STABILITY.md`. The installed Android build now also includes counted projection groups, five shared car batches for the field and a road-clear landmark placement. Captures below predate those corrections.

## Delivery

Updated native scene is built into `mobile/builds/vantage-replay.apk` and was installed on Samsung Note20 5G (SM-N981U1), Android13. This is an actual native EXGL scene, not a WebView, screenshot fallback or video. The iOS simulator app in `mobile/builds/Vantage.app` predates this polish pass; do not present it as the new build.

Final real-phone captures: `shots/native-polish/final-device/{overview,follow,battle,playing-a,playing-b}.png`. `*-viewport.webp` files are crops of those screenshots, excluding phone notifications and app controls. Earlier `r1/r2/r3` renders were a browser art-review harness using native scene functions, **not handset acceptance**. The historical browser prototype and its model remain unchanged.

## What changed

- Separate native GLB: continuous rounded ground outline, bevelled plinth/building edges, quieter grove planting and small pit-roof louvres. Illustrative, not surveyed architecture.
- Baked ambient contact and soft studio key occlusion in actual GLB vertex colours. No runtime shadow maps or screen-space postprocessing. Warm key / cool fill / restrained matte materials.
- Procedural open-wheel cars: tapered bodywork, wing planes/endplates, hubs, suspension and helmets. Geometry merged into five material batches per car instead of a draw call per component.
- Native GPU labels rasterised from bundled OFL IBM Plex Mono: antialiased coverage, proper sRGB colour, charcoal fill, fine powder-blue rim, smaller size, short anchor stem and subordinate comparison label. No browser canvas/image decoder.
- Follow zoom5→3.1, stable studio azimuth rather than spinning with the car's heading. Battle remains centred on the actual pair, with tighter distance-based framing and maximum zoom3.8. No invented racing proximity or lanes.
- Fixed visual road seams: the original Catmull path had tiny backtracking loops that twisted ribbon edges. A triangular radius7 smoothing kernel changes the **visual mesh only**, preserving sample count and bridge indices. Maximum nearest distance from unchanged source route to new road centreline is **0.17543 model units**, versus road half-width1.025; export aborts above0.30. Historical fixture/registration files were not rewritten.
- Android explanatory footer now says “Illustrative circuit · drag to orbit · pinch to zoom”. iOS preview warning remains because its presentation gate is unresolved.

## Validation

- `npm run check`: TypeScript, ESLint and **26 tests pass**. Tests include actual car construction/batching, finite geometry, antialiased label texture, genuine non-uniform baked GLB lighting, offline GLTFLoader and wider stable-azimuth camera contracts.
- New geometry regression first failed on incompatible UV attributes, then passed after removing unused UVs from all untextured car batches. Initial light export accidentally emitted white fallback vertex colours; explicit named export and an actual-GLB range test now catch that failure.
- Expo Doctor **20/20** passes.
- Android Release build succeeds with targeted GLView constructor / GLContext.flush keep rules retained. APK is locally debug-signed evaluation software, not a Play submission.
- Updated APK installed and startup check passed on Note20. Final actual screen comparison: **462,512 changed camera pixels / 295,405 changed moving-field pixels**. This is not a GPU FPS measurement.
- Overview, Follow, Battle and running Follow captured on the handset; replay left paused after testing. No physical iPhone result, thermal test, sustained frame-presentation benchmark or accessibility sign-off.

## Independent critique history (viewport only)

| Criterion | Browser art-review round1 | Actual Note20 round2 |
|---|---:|---:|
| Concept | 4 | 4 |
| Not category average | 4 | 4 |
| Not skill average | 4 | 4 |
| Hierarchy | 3 | 3 |
| Typography | 3 | 3 |
| Colour | 3 | 4 |
| Richness | 3 | 3 |
| Rhythm/space | 3 | 3 |
| Craft | 3 | 3 |
| Signature (static evidence) | 3 | 3 |
| Feature test | 3 | 3 |

Native iOS fluency not scored from Android stills. No false 12-line total or production-ready claim.

Round1 asks: better material separation, smaller selected labels/stems, tighter truthful pair composition. Round2 verified material/plinth/shadow changes substantially landed and label changes landed; Battle composition partially landed. Artificially moving cars or manufacturing a closer battle was declined. Round2's concrete road-seam finding was subsequently fixed in the visual mesh; Battle framing tightened again. Final screenshot inspected locally, but requested round3 independent review failed due provider usage limit. **Those final changes are unscored**, not silently promoted to passes. An invalid earlier before-overview screenshot was excluded; only `before/playing-b.png` is a legitimate pre-polish app capture.

## Remaining quality work

This is a visible improvement pass, not final art acceptance. Selected cars still compete with broad ground and generic planting at some phases. Architecture and surface materials can be more distinctive without adding random detail. Fine road-edge aliasing now has a measured 2× render-target supersample path (see `RENDER-STABILITY.md`); Note20 capture and GPU pacing of that path remain open. Battle needs a broader set of actual time/driver pairs tested before its composition is considered finished. Native FPS, thermals, camera feel, gestures and accessibility require separate acceptance.

## Reproduce assets

From repo root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python mobile/scripts/export_studio_world.py
python3 mobile/scripts/build_label_glyphs.py  # Pillow
cd mobile
npm run check
npm run build:android                     # JDK/SDK environment required
```

The optional `mobile/scripts/preview-studio.ts` browser harness is art-review tooling only. It must never be substituted for native captures or used to label browser timings as handset performance.
