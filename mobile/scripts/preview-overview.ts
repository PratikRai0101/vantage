/** Art-direction review harness for overview framing. Browser rendering is NOT
 * native acceptance: it shares the real scene functions and fixture, but its
 * MSAA and present path differ from EXGL. Used to compare framing, then verified
 * on the handset. Never label browser timings as device performance.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cameraFrustum, cameraGoal, overviewGoal, routeHeading, routePoint, type CameraGoal } from '../src/scene/math';
import { carContactShadow, carModel, driverLabel, driverTether, fieldMarker, selectionRing } from '../src/scene/objects';
import { groupProjectedCars } from '../src/scene/projected-groups';
import { replayData, replayTrack } from '../src/state/fixture';
import { ReplayEngine } from '../src/replay';
import { createSupersampledRenderer } from '../src/scene/supersample';

const WIDTH = 1080, HEIGHT = 956;
const engine = new ReplayEngine(replayData);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera();
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(WIDTH, HEIGHT, false);
renderer.setClearColor('#101719'); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
scene.add(new THREE.HemisphereLight('#dce5df', '#29342c', 1.35));
const key = new THREE.DirectionalLight('#fff0d7', 2.8); key.position.set(-45, 100, 75); scene.add(key);
const fill = new THREE.DirectionalLight('#bfd9e5', .6); fill.position.set(65, 35, -50); scene.add(fill);
const world = await new GLTFLoader().loadAsync('/mobile/assets/models/suzuka-world.glb'); scene.add(world.scene);

const actors = new Map<number, THREE.Group>(), labels = new Map<number, THREE.Sprite>(), markers = new Map<number, THREE.Sprite>(), tethers = new Map<number, THREE.Line>(), shadows = new Map<number, THREE.Mesh>();
for (const driver of replayData.drivers) {
  if (!driver.available) continue;
  const actor = carModel(driver.color ?? '#c0d5df'); actors.set(driver.number, actor); scene.add(actor);
  const shadow = carContactShadow(); shadows.set(driver.number, shadow); scene.add(shadow);
  labels.set(driver.number, driverLabel(driver.code ?? String(driver.number))); scene.add(labels.get(driver.number)!);
  tethers.set(driver.number, driverTether()); scene.add(tethers.get(driver.number)!);
  markers.set(driver.number, fieldMarker(driver.color ?? '#c0d5df')); scene.add(markers.get(driver.number)!);
}
const ring = selectionRing('#BCD5EC'); scene.add(ring);

Object.assign(camera, cameraFrustum(WIDTH / HEIGHT));
const badgeCache = new Map<string, THREE.Sprite>();
function draw(goal: CameraGoal, time = 74.5, selected = 4, target = renderer, ssaa?: ReturnType<typeof createSupersampledRenderer>) {
  engine.seek(time); engine.setCamera('overview');
  for (const [number, actor] of actors) {
    const route = engine.driverSnapshot(number, time)?.route;
    actor.visible = !!route;
    const shadow = shadows.get(number)!; shadow.visible = !!route;
    if (!route) continue;
    actor.position.fromArray(routePoint(replayTrack, route.phase)); actor.rotation.y = routeHeading(replayTrack, route.phase);
    shadow.position.copy(actor.position); shadow.position.y -= .012; shadow.rotation.z = actor.rotation.y;
  }
  camera.position.set(...goal.position); camera.zoom = goal.zoom;
  camera.lookAt(new THREE.Vector3(...goal.target));
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  // Native runtime measures points against the layout height (dp), not the buffer.
  const unitsPerPoint = (camera.top - camera.bottom) / camera.zoom / (HEIGHT / 2.8125);
  const screenUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const screenRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const poses = [...actors].filter(([, actor]) => actor.visible).map(([number, actor]) => ({ number, position: [actor.position.x, actor.position.y, actor.position.z] as const, heading: actor.rotation.y }));
  const groups = groupProjectedCars(poses, selected, undefined, []);
  const representatives = new Set(groups.map(group => group.representative));
  for (const [number, actor] of actors) { actor.visible = actor.visible && representatives.has(number); shadows.get(number)!.visible = actor.visible; }
  const selectedActor = actors.get(selected)!;
  if (selectedActor.visible) { ring.visible = true; ring.position.copy(selectedActor.position); ring.position.y += .04; } else ring.visible = false;
  for (const badge of badgeCache.values()) { badge.visible = false; }
  for (const group of groups) {
    if (group.members.length < 2) continue;
    const cacheKey = `${group.representative}:${group.members.length}`;
    let badge = badgeCache.get(cacheKey);
    if (!badge) { badge = driverLabel(`×${group.members.length}`); badgeCache.set(cacheKey, badge); scene.add(badge); }
    badge.visible = true; badge.userData.used = true;
    const named = group.representative === selected;
    badge.position.copy(actors.get(group.representative)!.position).addScaledVector(screenUp, (named ? 24 : 17) * unitsPerPoint).addScaledVector(screenRight, named ? 42 * unitsPerPoint : 0);
    badge.scale.set(13 * unitsPerPoint * Number(badge.userData.labelAspect), 13 * unitsPerPoint, 1);
  }
  for (const [number, marker] of markers) {
    const actor = actors.get(number)!;
    marker.visible = actor.visible && number !== selected;
    marker.position.copy(actor.position); marker.position.y += .7;
    marker.scale.setScalar(3.5 * unitsPerPoint);
  }
  for (const [number, label] of labels) {
    const actor = actors.get(number)!, tether = tethers.get(number)!;
    label.visible = actor.visible && number === selected;
    tether.visible = label.visible;
    if (!label.visible) continue;
    label.position.copy(actor.position).addScaledVector(screenUp, 24 * unitsPerPoint);
    label.scale.set(14 * unitsPerPoint * Number(label.userData.labelAspect), 14 * unitsPerPoint, 1);
    const points = tether.geometry.getAttribute('position');
    const from = actor.position.clone().addScaledVector(screenUp, 7 * unitsPerPoint);
    const to = actor.position.clone().addScaledVector(screenUp, 17 * unitsPerPoint);
    points.setXYZ(0, from.x, from.y, from.z); points.setXYZ(1, to.x, to.y, to.z); points.needsUpdate = true;
  }
  if (ssaa) ssaa.render(scene, camera); else target.render(scene, camera);
  return target.domElement;
}

const panels: [string, CameraGoal][] = [
  ['before: static zoom 1', cameraGoal('overview')],
  ['after: circuit fit', overviewGoal(replayTrack, WIDTH / HEIGHT)],
];
const compose = document.createElement('canvas');
compose.width = WIDTH; compose.height = 34 + Math.round(HEIGHT / 2);
const context = compose.getContext('2d')!;
const cellW = compose.width / panels.length, cellH = compose.height - 34;
panels.forEach(([, goal], index) => {
  const source = draw(goal);
  context.drawImage(source, index * cellW, 34, cellW, cellH);
  context.fillStyle = '#c6d9df'; context.font = '18px monospace';
  context.fillText(`${panels[index][0]} · zoom ${goal.zoom.toFixed(2)}`, index * cellW + 10, 23);
});
const full = draw(overviewGoal(replayTrack, WIDTH / HEIGHT));
// Same scene through the native 2x supersampling path. Browser-only proof of
// the resolve shader; it is not a device performance or presentation claim.
const ssaaRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true });
ssaaRenderer.setPixelRatio(1); ssaaRenderer.setSize(WIDTH, HEIGHT, false);
ssaaRenderer.setClearColor('#101719'); ssaaRenderer.toneMapping = THREE.ACESFilmicToneMapping; ssaaRenderer.toneMappingExposure = 1.08;
const ssaa = createSupersampledRenderer(ssaaRenderer, 2);
ssaa.setSize(WIDTH, HEIGHT);
const ssaaFull = draw(overviewGoal(replayTrack, WIDTH / HEIGHT), 74.5, 4, ssaaRenderer, ssaa);
Object.assign(window, { REVIEW: compose.toDataURL('image/png'), FULL: full.toDataURL('image/png'), SSAA: ssaaFull.toDataURL('image/png') });
console.log('ART_REVIEW_ONLY', JSON.stringify({ width: WIDTH, height: HEIGHT, panels: panels.map(([name, goal]) => ({ name, zoom: goal.zoom })) }));
