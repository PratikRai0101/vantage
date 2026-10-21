# Native renderer decision — 2026-10-17

## Implementation checkpoint

The Expo58 native slice builds on both platforms and genuinely renders the approved GLB. Two adapter/loader compatibility faults are fixed and regression-tested. **iOS Simulator visible-frame acceptance now passes on the Metal/WebGPU backend:** the screen draws moving cars and camera changes (446,917 camera / 24,120 moving-field changed pixels). Android keeps the accepted EXGL + 2× SSAA path. The EXGL simulator freeze was a real platform/API limit, not a data or camera bug; the original EXGL research below remains the Android and historical record. See `NATIVE-VALIDATION.md` for evidence and the physical-iPhone gate.

The wiring sample below is the original research sketch. Current implementation is `mobile/src/scene/`: `gl-backend.ts` supplies Android's EXGL renderer and `RaceSurface.ios.tsx` supplies the iOS Dawn/Metal surface behind `render-backend.ts`. The scene, replay engine, cars, labels and cameras are shared.

## Recommendation

**Time-box the first native slice to Expo GL + Three 0.180.0, using a tiny explicit EXGL renderer adapter, not a WebView and not the stale `expo-three` dependency.** Reuse the existing scene, geometry, route interpolation, car transforms and camera maths. Start with direct-to-screen rendering, no shadows/postprocessing/compressed textures. Gate the choice on an actual iPhone + Android smoke test; this is a credible implementation path, **not a device-verified compatibility guarantee**.

**Implementation note (October 2026):** the first slice used EXGL on both platforms. iOS now uses `react-native-webgpu` 0.17.0 (Dawn, Metal) with `three/webgpu`; Android remains EXGL + 2× SSAA. This is two platform-specific surfaces behind one `RaceRenderBackend`, not two scene implementations. React Native Filament 1.11.0 remains the fallback if the Metal backend cannot run on physical iPhones; do not add a third renderer without evidence.

### Current comparison

| | Expo GL + Three | React Native Filament | RN WebGPU + Three |
|---|---|---|---|
| Native rendering | EXGL → native OpenGL ES; **not WebView** | Native C++ Filament; Metal on iOS, OpenGL/Vulkan backend options | Native Dawn → WebGPU; **not browser/WebView** |
| Existing Three reuse | Highest: retain Three 0.180 geometry, materials and transforms | GLB reusable; Three scene/cars/cameras not directly reusable | High for ordinary Three meshes/materials; change renderer/imports; custom GLSL/postprocessing requires migration |
| Expo Go | `expo-gl` included | No: native module/custom development build | No: native module/custom development build |
| iOS simulator | Maintainer explicitly warns Three + EXGL works poorly on simulators; use physical hardware as acceptance target | Package includes simulator support work, but no RN 0.88/simulator certification found | Official docs support simulator; disable Metal API Validation (Expo config plugin does it) |
| Android | Yes, but old devices may lack required GLES3/WebGL2 | Yes; native build must succeed on the selected RN version | Yes, Android API 26+, new architecture; emulator may use slow software adapter |
| Main risk | Partial WebGL2, extension objects not equivalent to browser support; JS-thread rendering | Native C++/worklets integration against newest RN; rewrite cost | Latest release is **today**; renderer/init/teardown/asset adapters and Dawn binaries increase scope |

Sources: [Expo GL API](https://docs.expo.dev/versions/v58.0.0/sdk/gl-view/), [expo-three maintainer README](https://github.com/expo/expo-three), [Filament README](https://github.com/margelo/react-native-filament), [WebGPU requirements/troubleshooting](https://wcandillon.github.io/react-native-webgpu/docs/getting-started/installation).

## Exact versions, with compatibility boundaries

Read live npm registry metadata and **actual npm tarball contents**, without installing dependencies:

- Expo **58.0.14** → its `bundledNativeModules.json` selects React **19.3.0**, RN **0.88.0**, `expo-gl ~58.0.3`, `expo-asset ~58.0.16`, `expo-file-system ~58.0.9`. For reproducibility pin **58.0.3 / 58.0.16 / 58.0.9** respectively. Do not independently select a different RN merely because it is latest. If the parent scaffold has already selected another Expo SDK, use **that SDK's** native-module versions instead of mixing SDKs.
- Recommended Three **0.180.0** preserves the prototype, intentionally not today's latest **0.186.1**. Pin matching `@types/three` if TypeScript requires it; the runtime pin is the important one.
- **Do not claim `expo-three@8.0.0` supports Three 0.180**: its actual peer is `three ^0.166.0` (excludes 0.180); its dev baseline is Expo 51/RN 0.73.6. Its renderer is only a small canvas shim, reproduced conceptually below. Avoid `--legacy-peer-deps` as a supposed compatibility fix. A peer-satisfying alternative is Three **0.166.1** + expo-three **8.0.0**, but that changes the approved prototype's Three version and is not more thoroughly device-verified here.
- Filament fallback: **react-native-filament 1.11.0**, **react-native-worklets-core 1.6.3**. Filament peers accept RN `*`, but its package dev baseline is **RN 0.83.1 / React 19.2.0**, not proof against RN 0.88. Worklets-core is **not** interchangeable with `react-native-worklets`.
- WebGPU alternative: **react-native-webgpu 0.16.1**, hard dependency **react-native-webgpu-dawn 154.3.0**; RN peer `>=0.81.0`, new architecture required. Optional worklet peers: `react-native-worklets >=0.7.2`, `react-native-reanimated >=4.2.1`; Expo 58 selects **0.13.0 / 4.7.1**. Use Three **0.180.0** only as a separately tested preservation spike; current docs/examples do not certify that exact combination. No reason to introduce Fiber into the first imperative slice.

Primary metadata/artifacts: [Expo metadata](https://registry.npmjs.org/expo/58.0.14), [Expo tarball including native map](https://registry.npmjs.org/expo/-/expo-58.0.14.tgz), [expo-gl](https://registry.npmjs.org/expo-gl/58.0.3), [expo-three package.json](https://unpkg.com/expo-three@8.0.0/package.json), [Filament package.json](https://unpkg.com/react-native-filament@1.11.0/package.json), [worklets-core](https://registry.npmjs.org/react-native-worklets-core/1.6.3), [WebGPU package.json](https://unpkg.com/react-native-webgpu@0.16.1/package.json), [Three](https://registry.npmjs.org/three/0.180.0).

## EXGL: minimal source-verified wiring (not device-tested)

The following is documentation, **not implemented UI**. It uses the same adapter pattern as [expo-three's actual renderer](https://unpkg.com/expo-three@8.0.0/src/Renderer.ts), bypassing that package's outdated peers/resource patches. `GLView` owns the native context; the object below is only a canvas-shaped JS facade.

```ts
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three'; // pin 0.180.0

class EXGLRenderer extends THREE.WebGLRenderer {
  constructor(gl: ExpoWebGLRenderingContext) {
    const canvas = {
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
      clientWidth: gl.drawingBufferWidth,
      clientHeight: gl.drawingBufferHeight,
      style: {},
      addEventListener() {},
      removeEventListener() {},
      setAttribute() {},
      getContext: () => gl,
    };
    super({ canvas: canvas as any, context: gl as any, antialias: false });
    this.setPixelRatio(1); // drawingBufferWidth/Height are already pixels
    this.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
    this.setClearColor('#101719', 1);
    this.shadowMap.enabled = false;
  }
}

// Mount: <GLView style={{flex: 1}} msaaSamples={0} onContextCreate={start} />
// start's returned stop function must be retained/called by component cleanup.
function start(gl: ExpoWebGLRenderingContext) {
  if (!(gl instanceof WebGL2RenderingContext)) {
    throw new Error('Native GLES3/WebGL2 context required');
  }
  const renderer = new EXGLRenderer(gl);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 700,
  );
  camera.position.set(88, 102, 125);
  camera.lookAt(0, 0.3, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x394749, 2));
  // await loadBundledWorld(); scene.add(world); create 17 generic car Groups.
  // On each frame, apply the SAME replay clock to cars and camera targets.
  let raf = 0, stopped = false;
  const frame = (now: number) => {
    if (stopped) return;
    // sample replay -> car position/yaw -> follow/battle camera -> lookAt
    renderer.render(scene, camera);
    gl.endFrameEXP(); // REQUIRED native presentation; flush alone is insufficient
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    renderer.dispose();
    // Also dispose owned geometries/materials/textures; stop on AppState background.
  };
}
```

Use prototype's **OrthographicCamera** rather than the perspective smoke camera above for visual parity. Copy `routePoint`, car construction and camera goals from `replay-prototype/app.js`; `replay.mjs` is already DOM-free. Browser `OrbitControls` uses pointer/DOM events: **the canvas no-op listeners do not provide native gestures**. Feed RN touch/pinch input into azimuth/elevation/zoom and compute camera position/lookAt directly. Follow uses selected car + heading offset; battle uses both cars' midpoint and distance; no additional renderer feature is needed. Resize projection from GL drawing-buffer aspect after layout/context changes; avoid multiplying physical dimensions by PixelRatio a second time.

### Partial WebGL2: do not wave this away

[Expo docs](https://docs.expo.dev/versions/v58.0.0/sdk/gl-view/#webgl-api) list unimplemented methods. **Actual 58.0.3 npm source disagrees in one useful detail:** `getInternalformatParameter` IS implemented with `glGetInternalformativ`; `renderbufferStorageMultisample` remains unimplemented. Prefer published source over an assumption that the docs' whole list is current.

- [Actual EXGL methods](https://unpkg.com/expo-gl@58.0.3/common/EXWebGLMethods.cpp): `getBufferSubData`, framebuffer/renderbuffer parameter queries and multisample renderbuffer storage remain unimplemented.
- [Actual EXGL textures](https://unpkg.com/expo-gl@58.0.3/common/EXWebGLMethodsTextures.cpp): compressed 2D/3D uploads remain unimplemented. No KTX2/Basis path in this slice.
- [Actual EXGL extensions](https://unpkg.com/expo-gl@58.0.3/common/EXWebGLMethodsDraw.cpp): names are filtered against supported extensions; most supported names return an **empty JS object**, with anisotropy specially handled. Presence of an extension name is not proof its JS functions exist. Never inject fake successful extensions or no-op required GPU APIs.
- [Three r180 WebGLTextures](https://github.com/mrdoob/three.js/blob/r180/src/renderers/webgl/WebGLTextures.js) invokes `renderbufferStorageMultisample` for multisampled render targets. Avoid composer/bloom/SSAO/transmission, MSAA render targets and float render targets in the first slice. `antialias:false` and `msaaSamples={0}` remove separate default-surface AA ambiguity; they do not magically implement target MSAA.
- Disable shadows initially (prototype has a 2048² shadow map). Reintroduce only after instrumented device success; material parity and performance remain acceptance work. ACES output tone mapping itself is not synonymous with a multipass composer.
- EXGL rendering runs on JS: update 17 actor transforms imperatively; avoid 60-Hz React state updates. Test frame time rather than inferring it from 48k triangles. No FPS or production-readiness claim is supported by this research.

## Local GLB parsing: this exact asset avoids the hardest trap

Inspected **`replay-prototype/data/suzuka-world.glb`** directly: **1,812,432 bytes**, one embedded BIN buffer, **13 materials, no images, no textures, no glTF extensions**. This matters more than a generic claim that “GLTFLoader works in RN.”

Append `glb` to the Expo default Metro `resolver.assetExts` (do not replace all defaults). Use a literal bundled `require`, `Asset.downloadAsync()` and local binary file bytes:

```ts
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

async function loadBundledWorld() {
  const asset = Asset.fromModule(require('./assets/suzuka-world.glb'));
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error('Bundled GLB has no local file URI');
  const bytes = await new File(asset.localUri).bytes();
  // Respect byteOffset/byteLength; .buffer alone may include unrelated bytes.
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  if (typeof TextDecoder === 'undefined') throw new Error('GLTFLoader requires TextDecoder');
  return (await new GLTFLoader().parseAsync(buffer, '')).scene;
}
```

Exact APIs: [Asset.downloadAsync/localUri](https://docs.expo.dev/versions/v58.0.0/sdk/asset/), [File API](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/), [published File source](https://unpkg.com/expo-file-system@58.0.9/src/File.ts), [GLTFLoader r180](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/loaders/GLTFLoader.js).

Hidden pitfalls:

1. Metro `require(glb)` returns an asset ID, **not bytes**; passing it directly to `parse` is invalid. `fetch(file://...)` is not a portable replacement for native filesystem reads; base64 text is not a binary GLB.
2. `GLTFLoader.parseAsync(ArrayBuffer, '')` avoids top-level URL/FileLoader/fetch loading. Empty resource path is safe here **only because buffers are embedded and there are no images/external URIs**.
3. Embedded GLB textures would still go through `self.URL`, `Blob`, `URL.createObjectURL` and TextureLoader/ImageBitmapLoader. Native RN does not automatically supply working DOM image decoding merely because the GLB is local. A textured replacement requires an explicit texture loader/plugin/native image path; EXGL texture input accepts `{localUri}`. `global.self = global` alone does not solve images.
4. Verify TextDecoder on the selected runtime; add a UTF-8 decoder only if missing. Do not globally pretend a browser DOM exists. Avoid `expo-three`'s global loader patches without auditing their SDK/file-system assumptions.
5. Run an offline release/development-bundle load, not only Metro HTTP loading. Fail visibly on missing bytes/parse error instead of silently substituting a different track.

## Fallback wiring and exact API references

Filament's published API supports this real minimal scene (no Three adapter required):

```tsx
import { FilamentScene, FilamentView, DefaultLight, Model, Camera }
  from 'react-native-filament';

<FilamentScene>
  <FilamentView style={{ flex: 1 }}>
    <DefaultLight />
    <Model source={require('./assets/suzuka-world.glb')} />
    <Camera cameraPosition={[88, 102, 125]} cameraTarget={[0, 0.3, 0]}
      near={0.1} far={700} />
  </FilamentView>
</FilamentScene>
```

Requires worklets-core Babel plugin with `processNestedWorklets:true`, native rebuild/pods, and Metro `glb` extension. Do not update 17 `<Model>` props through React every frame: use its render callbacks/transform manager on the render worklet, transporting the replay clock deliberately. [Getting started](https://margelo.github.io/react-native-filament/docs/guides), [asset loading](https://margelo.github.io/react-native-filament/docs/guides/asset-loading), [actual Camera props + per-frame lookAt](https://unpkg.com/react-native-filament@1.11.0/src/react/Camera.tsx), [actual Model source/transform API](https://unpkg.com/react-native-filament@1.11.0/src/react/Model.tsx), [scene engine/backend wiring](https://unpkg.com/react-native-filament@1.11.0/src/react/FilamentScene.tsx). RN 0.88 compile/runtime and simulator remain verification gates, not consequences of a permissive peer range.

WebGPU's current [Three integration](https://wcandillon.github.io/react-native-webgpu/docs/integrations/three-js) uses `import * as THREE from 'three/webgpu'`, native `<Canvas>`, `ref.current.getContext('webgpu')`, and `new THREE.WebGPURenderer({canvas:context.canvas, context, device})`. **Await `renderer.init()`**, then each frame `renderer.render(scene,camera); context.present();`. Do not call `gl.endFrameEXP` on this backend or configure the context twice. [Expo plugin](https://wcandillon.github.io/react-native-webgpu/docs/getting-started/expo) handles simulator validation and Android min SDK; [Canvas API](https://wcandillon.github.io/react-native-webgpu/api/canvas) documents pixel density/presentation. Custom development build required. Plain Three GLTF asset loading still needs the native binary path above; WebGPU does not make DOM texture loading disappear.

## Minimum acceptance before calling the slice working

1. Physical iPhone and Android: exact approved GLB, correct framing/material colours, 17 moving generic cars, 120-second fixture clock, seek/pause/speed changes.
2. Orbit/follow/battle use the same clock, no browser DOM handlers; switching selection does not reload the GLB.
3. No required unimplemented EXGL calls/native crashes; capture unsupported-extension logs without suppressing them globally.
4. Background/resume, unmount/remount and resize cleanly; no orphan RAF loops or growing GPU allocations.
5. Offline bundled asset success; record actual device/OS/build/frame-time evidence. Simulator success alone does not establish phone support.

**Scope performed:** research + asset/source inspection only. No dependencies installed, native UI implemented, device rendering tested, or `mobile/` files changed.
