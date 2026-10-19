import type { CameraMode, TrackData } from '../replay';

export type Point3 = readonly [number, number, number];
export type CameraGoal = { target: Point3; position: Point3; zoom: number };
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const sub = (a: Point3, b: Point3): Point3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Point3, b: Point3): Point3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Point3): Point3 => { const length = Math.hypot(...a) || 1; return [a[0] / length, a[1] / length, a[2] / length]; };

/** The approved studio three-quarter view. Overview only changes its framing. */
export const STUDIO_POSITION: Point3 = [88, 102, 125];
export const STUDIO_TARGET: Point3 = [0, .3, 0];
/** Ribbon, kerbs and trim reach past the recorded centreline; labels sit above cars. */
const OVERVIEW_MARGIN = { horizontal: 3, top: 6.6, bottom: 1.2 };
/** The fitted circuit may use this share of the limiting screen axis. */
const OVERVIEW_FILL = .97;

/** Phase is unwrapped across laps; route coordinates are already projected into the GLB. */
export function routePoint(track: TrackData, phase: number): Point3 {
  if (!Number.isFinite(phase) || track.points.length < 2 || track.length <= 0) throw new Error('Invalid projected route');
  const distance = ((phase % 1) + 1) % 1 * track.length;
  let lo = 0, hi = track.lengths.length - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >>> 1; if (track.lengths[mid] <= distance) lo = mid; else hi = mid; }
  const p = track.points[lo % track.points.length], q = track.points[(lo + 1) % track.points.length];
  const f = (distance - track.lengths[lo]) / (track.lengths[lo + 1] - track.lengths[lo] || 1);
  return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f];
}
export function routeHeading(track: TrackData, phase: number): number {
  // This is an illustrative track tangent, not measured steering. A tiny
  // baseline follows digitisation micro-loops and can flip a car 180° in a
  // single frame. Average across a short track neighbourhood instead.
  const a = routePoint(track, phase - .003), b = routePoint(track, phase + .003);
  return -Math.atan2(b[2] - a[2], b[0] - a[0]);
}
export function cameraGoal(mode: CameraMode, p: Point3 = [0, 0, 0], ahead: Point3 = [1, 0, 0], partner: Point3 = p): CameraGoal {
  if (mode === 'overview') return { target: STUDIO_TARGET, position: STUDIO_POSITION, zoom: 1 };
  if (mode === 'battle') {
    const target: Point3 = [(p[0] + partner[0]) / 2, (p[1] + partner[1]) / 2, (p[2] + partner[2]) / 2];
    const distance = Math.hypot(p[0] - partner[0], p[1] - partner[1], p[2] - partner[2]);
    return { target, position: [target[0] + 26, target[1] + 34, target[2] + 40], zoom: clamp(136 / (distance * 1.45 + 28), .9, 3.8) };
  }
  const dx = ahead[0] - p[0], dz = ahead[2] - p[2], d = Math.hypot(dx, dz) || 1;
  // A small lead room follows the route, but the studio's azimuth stays fixed.
  // Tight bends should move the car through a miniature, not spin the viewer.
  const target: Point3 = [p[0] + dx / d * 2, p[1], p[2] + dz / d * 2];
  return { target, position: [target[0] + 26, target[1] + 34, target[2] + 40], zoom: 3.1 };
}
/** Screen-aligned basis of the fixed studio view (three's lookAt, +Y up, no roll). */
function studioBasis() {
  const z = unit(sub(STUDIO_POSITION, STUDIO_TARGET));
  const x = unit(cross([0, 1, 0], z));
  return { x, y: cross(z, x) };
}
/** Overview frames the actual circuit: centroid on the frame axis and zoom so the
 * recorded centreline (plus ribbon padding) fills the viewport at any aspect.
 * The camera direction never changes; only the orthographic rectangle moves. */
export function overviewGoal(track: TrackData, aspect: number): CameraGoal {
  const frustum = cameraFrustum(aspect), basis = studioBasis();
  const bounds = { minU: Infinity, maxU: -Infinity, minV: Infinity, maxV: -Infinity };
  for (const point of track.points) {
    const offset = sub(point, STUDIO_TARGET);
    const u = dot(offset, basis.x), v = dot(offset, basis.y);
    bounds.minU = Math.min(bounds.minU, u); bounds.maxU = Math.max(bounds.maxU, u);
    bounds.minV = Math.min(bounds.minV, v); bounds.maxV = Math.max(bounds.maxV, v);
  }
  if (!Number.isFinite(bounds.minU) || !Number.isFinite(bounds.minV)) return cameraGoal('overview');
  // Headroom is asymmetrical: driver labels and group badges are drawn above cars,
  // so the circuit sits lower in the frame instead of paying the same margin twice.
  const centreU = (bounds.minU + bounds.maxU) / 2;
  const centreV = (bounds.minV + bounds.maxV) / 2 + (OVERVIEW_MARGIN.top - OVERVIEW_MARGIN.bottom) / 2;
  const halfU = (bounds.maxU - bounds.minU) / 2 + OVERVIEW_MARGIN.horizontal;
  const halfV = (bounds.maxV - bounds.minV) / 2 + (OVERVIEW_MARGIN.top + OVERVIEW_MARGIN.bottom) / 2;
  const zoom = clamp(Math.min(frustum.right / halfU, frustum.top / halfV) * OVERVIEW_FILL, .6, 4);
  const offset: Point3 = [
    basis.x[0] * centreU + basis.y[0] * centreV,
    basis.x[1] * centreU + basis.y[1] * centreV,
    basis.x[2] * centreU + basis.y[2] * centreV,
  ];
  return {
    target: [STUDIO_TARGET[0] + offset[0], STUDIO_TARGET[1] + offset[1], STUDIO_TARGET[2] + offset[2]],
    position: [STUDIO_POSITION[0] + offset[0], STUDIO_POSITION[1] + offset[1], STUDIO_POSITION[2] + offset[2]],
    zoom,
  };
}
/** Tabletop-only orbit: never reveal the dark underside or crush the scene into
 * a grazing horizon. Zoom remains useful at car scale, not inside the geometry. */
export function orbitBounds(mode: CameraMode, fitZoom = 1) {
  return mode === 'overview'
    ? { min: fitZoom * .82, max: Math.min(fitZoom * 2.4, 4.2) }
    : { min: .9, max: 4.2 };
}
export function constrainOrbit(phi: number, zoom: number, mode: CameraMode, fitZoom = 1) {
  const bounds = orbitBounds(mode, fitZoom);
  return { phi: clamp(phi, .30, 1.02), zoom: clamp(zoom, bounds.min, bounds.max) };
}
export function cameraFrustum(aspect: number) {
  const vertical = Math.max(91, 136 / Math.max(.01, aspect));
  return { left: -vertical * aspect / 2, right: vertical * aspect / 2, top: vertical / 2, bottom: -vertical / 2 };
}
