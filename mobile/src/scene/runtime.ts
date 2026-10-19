import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { ReplayEngine, TrackData } from '../replay';
import { cameraFrustum, cameraGoal, constrainOrbit, overviewGoal, routeHeading, routePoint, type CameraGoal } from './math';
import { carContactShadow, disposeTree, driverLabel, driverTether, fieldMarker, selectionRing } from './objects';
import { nativeRendererParameters } from './gl-adapter';
import { prepareLoaderHost } from './loader-host';
import { groupProjectedCars, nextGroupDriver, type ProjectedGroup } from './projected-groups';
import { createCarFleet } from './instanced-cars';

export type SceneReadyInfo = { backend: 'expo-gl'; drawCalls: number; triangles: number };
type Callbacks = { ready: (info: SceneReadyInfo) => void; error: (error: Error) => void };

/** Canvas-shaped host metadata only. All GPU calls go to the real EXGL context. */
function makeRenderer(gl: ExpoWebGLRenderingContext) {
  if (typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext)) throw new Error('Native 3D requires a GLES3 / WebGL2 context on this device.');
  const renderer = new THREE.WebGLRenderer(nativeRendererParameters(gl));
  renderer.setPixelRatio(1); renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  // Shader failures must reach the native diagnostic, not masquerade as a successful scene.
  renderer.debug.onShaderError = (context, program, vertex, fragment) => {
    throw new Error(`Native 3D shader failed: ${context.getProgramInfoLog(program) ?? ''} ${context.getShaderInfoLog(vertex) ?? ''} ${context.getShaderInfoLog(fragment) ?? ''}`);
  };
  return renderer;
}
async function loadWorld() {
  if (typeof TextDecoder === 'undefined') throw new Error('This runtime has no TextDecoder; native GLB decoding is unavailable.');
  // Metro requires a literal require to include this binary in the offline bundle.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const asset = Asset.fromModule(require('../../assets/models/suzuka-world.glb'));
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error('Bundled Suzuka GLB has no local file URI.');
  const bytes = await new File(asset.localUri).bytes();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  // The approved GLB is embedded, untextured and extension-free. Reject replacements
  // requiring remote requests or DOM image loading before handing them to GLTFLoader.
  const view = new DataView(buffer);
  if (view.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) throw new Error('Invalid bundled GLB header');
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength))) as { images?: unknown[]; extensionsRequired?: string[]; buffers?: { uri?: string }[] };
  if (json.images?.length || json.extensionsRequired?.length || json.buffers?.some(b => b.uri)) throw new Error('Native scene requires the approved embedded, untextured GLB.');
  if (typeof navigator !== 'undefined') prepareLoaderHost(navigator);
  return (await new GLTFLoader().parseAsync(buffer, '')).scene;
}

export class RaceSceneRuntime {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-68, 68, 50, -50, 1, 350);
  private readonly target = new THREE.Vector3(0, .3, 0);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly actors = new Map<number, THREE.Group>();
  private fleet: ReturnType<typeof createCarFleet> | undefined;
  private readonly contactShadows = new Map<number, THREE.Mesh>();
  private readonly labels = new Map<number, THREE.Sprite>();
  private readonly tethers = new Map<number, THREE.Line>();
  private readonly markers = new Map<number, THREE.Sprite>();
  private readonly groupBadges = new Map<string, THREE.Sprite>();
  private projectedGroups: ProjectedGroup[] = [];
  private previousGroupTime = -Infinity;
  private resizePending = 0;
  private readonly ring = selectionRing('#BCD5EC');
  private readonly partnerRing = selectionRing('#8DAEBD', 1.48);
  private raf = 0;
  private stopped = false;
  private loaded = false;
  private active = false;
  private dirty = true;
  private reported = false;
  private unsubscribe: (() => void) | undefined;
  private lastFrame = 0;
  private previousCamera = '';
  private manual = false;
  private width = 1;
  private height = 1;
  private bufferWidth = 0;
  private bufferHeight = 0;
  private reducedMotion = false;
  /** First camera application snaps to the fitted frame instead of easing in from the default pose. */
  private snapCamera = true;
  private overview: { aspect: number; goal: CameraGoal } | undefined;
  constructor(private readonly gl: ExpoWebGLRenderingContext, private readonly engine: ReplayEngine, private readonly track: TrackData, private readonly callbacks: Callbacks, background: string) {
    this.renderer = makeRenderer(gl);
    this.renderer.setClearColor(background, 1);
    this.camera.position.set(88, 102, 125); this.camera.lookAt(this.target);
    this.scene.add(new THREE.HemisphereLight('#dce5df', '#29342c', 1.35));
    const key = new THREE.DirectionalLight('#fff0d7', 2.8); key.position.set(-45, 100, 75); this.scene.add(key);
    const fill = new THREE.DirectionalLight('#bfd9e5', .6); fill.position.set(65, 35, -50); this.scene.add(fill);
    this.scene.add(this.ring, this.partnerRing);
  }
  async initialize() {
    try {
      const world = await loadWorld();
      if (this.stopped) { disposeTree(world); return; }
      this.scene.add(world);
      this.fleet=createCarFleet(this.engine.data.drivers.filter(d=>d.available));this.scene.add(this.fleet.root);
      for (const driver of this.engine.data.drivers) {
        if (!driver.available) continue;
        const actor = this.fleet.actors.get(driver.number)!; this.actors.set(driver.number, actor);
        const shadow = carContactShadow(); this.contactShadows.set(driver.number, shadow); this.scene.add(shadow);
        const label = driverLabel(driver.code ?? String(driver.number)); this.labels.set(driver.number, label); this.scene.add(label);
        const tether = driverTether(); this.tethers.set(driver.number, tether); this.scene.add(tether);
        const marker = fieldMarker(driver.color ?? '#c0d5df'); this.markers.set(driver.number, marker); this.scene.add(marker);
      }
      this.loaded = true;
      this.unsubscribe = this.engine.subscribe(() => this.invalidate());
      this.invalidate();
    } catch (error) { this.fail(error); }
  }
  private fail(error: unknown) {
    if (this.stopped) return;
    this.dispose();
    this.callbacks.error(error instanceof Error ? error : new Error(String(error)));
  }
  setActive(value: boolean) {
    this.active = value;
    if (!value) { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.lastFrame = 0; }
    else this.invalidate();
  }
  setReducedMotion(value: boolean) { this.reducedMotion = value; this.invalidate(); }
  resetView() { this.manual = false; this.previousCamera = ''; this.invalidate(); }
  setBackground(color: string) { if (this.stopped) return; this.renderer.setClearColor(color, 1); this.invalidate(); }
  resize(width: number, height: number) { this.width = width; this.height = height; this.resizePending = 3; this.invalidate(); }
  private resizeBuffer() {
    const w = this.gl.drawingBufferWidth, h = this.gl.drawingBufferHeight;
    if (!w || !h) return;
    if (w !== this.bufferWidth || h !== this.bufferHeight) {
      this.bufferWidth = w; this.bufferHeight = h;
      Object.assign(this.camera, cameraFrustum(w / h)); this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false); this.dirty = true;
    }
  }
  private invalidate() { this.dirty = true; this.schedule(); }
  /** Overview framing is aspect-dependent; recompute only when the buffer aspect moves. */
  private overviewCamera() {
    const aspect = (this.camera.right - this.camera.left) / (this.camera.top - this.camera.bottom);
    if (!this.overview || Math.abs(this.overview.aspect - aspect) > 1e-3) this.overview = { aspect, goal: overviewGoal(this.track, aspect) };
    return this.overview.goal;
  }
  private schedule() {
    if (this.active && this.loaded && !this.stopped && !this.raf) this.raf = requestAnimationFrame(this.frame);
  }
  private frame = (now: number) => {
    this.raf = 0;
    if (this.stopped || !this.active) return;
    try {
      this.resizeBuffer();
      if (this.resizePending > 0) this.resizePending--;
      const state = this.engine.getSnapshot(), time = this.engine.getTime();
      const dt = this.lastFrame ? Math.min(.1, (now - this.lastFrame) / 1000) : 1 / 60; this.lastFrame = now;
      const cameraKey = `${state.camera}:${state.selected}`;
      if (cameraKey !== this.previousCamera) { this.manual = false; this.previousCamera = cameraKey; }
      for (const [number, actor] of this.actors) {
        const route = this.engine.driverSnapshot(number, time)?.route;
        actor.visible = !!route;
        const shadow = this.contactShadows.get(number)!; shadow.visible = !!route;
        if (!route) continue;
        actor.position.fromArray(routePoint(this.track, route.phase)); actor.rotation.y = routeHeading(this.track, route.phase);
        shadow.position.copy(actor.position); shadow.position.y -= .012; shadow.rotation.z = actor.rotation.y;
      }
      const selected = this.actors.get(state.selected);
      const partner = state.camera === 'battle' ? this.engine.battlePartner(time, state.selected) : undefined;
      const second = partner ? this.actors.get(partner.number) : undefined;
      this.ring.visible = !!selected?.visible;
      if (selected) { this.ring.position.copy(selected.position); this.ring.position.y += .04; }
      this.partnerRing.visible = !!second?.visible;
      if (second) { this.partnerRing.position.copy(second.position); this.partnerRing.position.y += .045; }
      let moving = false;
      const route = this.engine.driverSnapshot(state.selected, time)?.route;
      const goal = state.camera === 'overview' ? this.overviewCamera() : cameraGoal(state.camera, selected?.position.toArray(), route ? routePoint(this.track, route.phase + .001) : undefined, second?.visible ? second.position.toArray() : undefined);
      if (!this.manual) {
        const position = new THREE.Vector3().fromArray(goal.position), target = new THREE.Vector3().fromArray(goal.target);
        moving = this.camera.position.distanceToSquared(position) > .00001 || this.target.distanceToSquared(target) > .00001 || Math.abs(this.camera.zoom - goal.zoom) > .00001;
        const factor = this.reducedMotion || this.snapCamera ? 1 : 1 - Math.exp(-dt * 6.5);
        this.camera.position.lerp(position, moving ? factor : 1); this.target.lerp(target, moving ? factor : 1);
        this.camera.zoom = THREE.MathUtils.lerp(this.camera.zoom, goal.zoom, moving ? factor : 1);
        this.camera.updateProjectionMatrix();
        this.snapCamera = false;
      } else if (state.camera !== 'overview') {
        // Orbit changes viewing direction, never the selected car's anchor.
        const desired = new THREE.Vector3().fromArray(goal.target);
        const delta = desired.sub(this.target).multiplyScalar(this.reducedMotion ? 1 : 1 - Math.exp(-dt * 14));
        moving = delta.lengthSq() > .00001;
        this.target.add(delta); this.camera.position.add(delta);
      }
      this.camera.lookAt(this.target); this.camera.updateMatrixWorld();
      // Keep labels pixel-sized at every camera zoom; only selected/battle labels display.
      const unitsPerPoint = (this.camera.top - this.camera.bottom) / this.camera.zoom / Math.max(1, this.height);
      const screenUp = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
      const screenRight = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
      const poses = [...this.actors].filter(([,actor])=>actor.visible).map(([number,actor])=>({number,position:[actor.position.x,actor.position.y,actor.position.z] as const,heading:actor.rotation.y}));
      this.projectedGroups = groupProjectedCars(poses,state.selected,partner?.number,Math.abs(time-this.previousGroupTime)<.5?this.projectedGroups:[]);
      this.previousGroupTime = time;
      const representatives = new Set(this.projectedGroups.map(g=>g.representative));
      for(const [number,actor] of this.actors) {
        actor.visible = actor.visible && representatives.has(number);
        this.contactShadows.get(number)!.visible = actor.visible;
      }
      this.fleet?.update();
      this.partnerRing.visible = !!second?.visible;
      for(const badge of this.groupBadges.values())badge.visible=false;
      for(const group of this.projectedGroups) {
        if(group.members.length<2)continue;
        const key=`${group.representative}:${group.members.length}`;
        let badge=this.groupBadges.get(key);
        if(!badge){badge=driverLabel(`×${group.members.length}`);this.groupBadges.set(key,badge);this.scene.add(badge);}
        badge.visible=true;badge.userData.representative=group.representative;
        const named=group.representative===state.selected||group.representative===partner?.number;
        badge.position.copy(this.actors.get(group.representative)!.position).addScaledVector(screenUp,(named?24:17)*unitsPerPoint).addScaledVector(screenRight,(named?42:0)*unitsPerPoint);
        badge.scale.set(13*unitsPerPoint*Number(badge.userData.labelAspect),13*unitsPerPoint,1);
      }
      for (const [number, marker] of this.markers) {
        const actor = this.actors.get(number)!;
        // The selected car already carries a ground ring, label and stem; a field
        // dot on top of its body only hides the geometry at overview scale.
        marker.visible = actor.visible && state.camera === 'overview' && number !== state.selected;
        marker.position.copy(actor.position); marker.position.y += .7;
        marker.scale.setScalar(3.5 * unitsPerPoint);
        marker.material.color.set(this.engine.data.drivers.find(d => d.number === number)?.color ?? '#c0d5df');
      }
      for (const [number, label] of this.labels) {
        const actor = this.actors.get(number)!;
        label.visible = actor.visible && (number === state.selected || number === partner?.number);
        const tether = this.tethers.get(number)!; tether.visible = label.visible;
        if (!label.visible) continue;
        const labelHeight = state.camera === 'overview' ? 14 : 16;
        label.position.copy(actor.position).addScaledVector(screenUp, 24 * unitsPerPoint);
        label.scale.set(labelHeight * unitsPerPoint * Number(label.userData.labelAspect), labelHeight * unitsPerPoint, 1);
        label.material.opacity = number === state.selected ? 1 : .8;
        const points = tether.geometry.getAttribute('position');
        const from = actor.position.clone().addScaledVector(screenUp, 7 * unitsPerPoint);
        const to = actor.position.clone().addScaledVector(screenUp, (24-labelHeight/2) * unitsPerPoint);
        points.setXYZ(0,from.x,from.y,from.z); points.setXYZ(1,to.x,to.y,to.z); points.needsUpdate = true;
        tether.geometry.computeBoundingSphere();
      }
      if (this.dirty || state.playing || moving) {
        this.renderer.render(this.scene, this.camera);
        if (!this.reported) {
          const error = this.gl.getError();
          if (error !== this.gl.NO_ERROR) throw new Error(`Native GLES rejected the initial scene (GL error 0x${error.toString(16)}).`);
        }
        this.gl.endFrameEXP(); this.dirty = false;
        if (!this.reported) {
          this.reported = true;
          this.callbacks.ready({ backend: 'expo-gl', drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles });
        }
      }
      if (state.playing || moving || this.resizePending > 0) this.schedule();
    } catch (error) { this.fail(error); }
  };
  orbit(dx: number, dy: number, pinchRatio = 1) {
    if (this.stopped) return;
    this.manual = true;
    const offset = this.camera.position.clone().sub(this.target), spherical = new THREE.Spherical().setFromVector3(offset);
    const mode = this.engine.getSnapshot().camera;
    const bounds = constrainOrbit(spherical.phi - dy * .008, this.camera.zoom * pinchRatio, mode, mode === 'overview' ? this.overviewCamera().zoom : 1);
    spherical.theta -= dx * .006; spherical.phi = bounds.phi;
    this.camera.position.copy(this.target).add(offset.setFromSpherical(spherical));
    this.camera.zoom = bounds.zoom; this.camera.updateProjectionMatrix(); this.invalidate();
  }
  selectAt(x: number, y: number) {
    for(const badge of this.groupBadges.values()) {
      if(!badge.visible)continue;
      const p=badge.position.clone().project(this.camera);
      if(p.z < -1 || p.z > 1)continue;
      if(Math.abs((p.x+1)*this.width/2-x)>22 || Math.abs((1-p.y)*this.height/2-y)>22)continue;
      const group=this.projectedGroups.find(g=>g.representative===badge.userData.representative);
      if(group){this.engine.selectDriver(nextGroupDriver(group,this.engine.getSnapshot().selected));return;}
    }
    let best: number | undefined, distance = 26;
    for (const [number, actor] of this.actors) {
      if (!actor.visible) continue;
      const p = actor.position.clone().project(this.camera); if (p.z < -1 || p.z > 1) continue;
      const d = Math.hypot((p.x + 1) * this.width / 2 - x, (1 - p.y) * this.height / 2 - y);
      if (d < distance) { distance = d; best = number; }
    }
    if (best !== undefined) this.engine.selectDriver(best);
  }
  dispose() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.unsubscribe?.();
    disposeTree(this.scene); this.actors.clear(); this.contactShadows.clear(); this.labels.clear(); this.tethers.clear(); this.markers.clear(); this.groupBadges.clear(); this.projectedGroups=[]; this.fleet=undefined;
    this.renderer.dispose();
  }
}
