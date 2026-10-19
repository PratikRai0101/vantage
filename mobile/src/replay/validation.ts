import type { ReplayDataset, TrackData } from './models';

type Obj = Record<string, unknown>;
function fail(path: string): never { throw new TypeError(`Invalid replay data: ${path}`); }
function object(v: unknown, p: string): Obj { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(p); return v as Obj; }
function array(v: unknown, p: string): unknown[] { if (!Array.isArray(v)) fail(p); return v; }
function finite(v: unknown, p: string): asserts v is number { if (typeof v !== 'number' || !Number.isFinite(v)) fail(p); }
function numeric(v: unknown, p: string, nullable = false) { if (nullable && v === null) return; finite(v, p); }
function integer(v: unknown, p: string, nullable = false) { if (nullable && v === null) return; finite(v, p); if (!Number.isInteger(v) || v < 0) fail(p); }
function text(v: unknown, p: string, nullable = false) { if (!(nullable && v === null) && typeof v !== 'string') fail(p); }
function rows(v: unknown, p: string, width: number, cell: (v: unknown, i: number, p: string) => void) {
  let last = -Infinity;
  for (const [i, value] of array(v, p).entries()) {
    const r = array(value, `${p}[${i}]`); if (r.length !== width) fail(`${p}[${i}].length`);
    finite(r[0], `${p}[${i}].time`); if (r[0] < last) fail(`${p}: unsorted timestamps`); last = r[0];
    for (let j = 1; j < width; j++) cell(r[j], j, `${p}[${i}][${j}]`);
  }
}
// Parsed objects retain provenance/coverage and all source metadata, without normalization.
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function parseReplayDataset(value: unknown): ReplayDataset {
  const d = object(value, 'dataset'); if (d.schemaVersion !== 1) fail('schemaVersion');
  object(d.session, 'session'); object(d.provenance, 'provenance'); object(d.calibration, 'calibration');
  const w = object(d.window, 'window');
  for (const key of ['start', 'end', 'positionSeed']) text(w[key], `window.${key}`);
  for (const key of ['duration', 'samplePaddingSeconds', 'eventPaddingSeconds']) { finite(w[key], `window.${key}`); if (w[key] < 0) fail(`window.${key}`); }
  if (w.duration === 0 || !Number.isFinite(Date.parse(w.start as string)) || !Number.isFinite(Date.parse(w.end as string)) || Math.abs((Date.parse(w.end as string) - Date.parse(w.start as string)) / 1000 - (w.duration as number)) > .001) fail('window bounds');
  const drivers = array(d.drivers, 'drivers'); if (!drivers.length) fail('drivers empty');
  const numbers = new Set<number>();
  const available: number[] = [], unavailable: number[] = [];
  for (const [i, value] of drivers.entries()) {
    const p = `drivers[${i}]`, x = object(value, p); integer(x.number, `${p}.number`);
    if (numbers.has(x.number as number)) fail(`${p}.number duplicate`); numbers.add(x.number as number);
    if (typeof x.available !== 'boolean') fail(`${p}.available`);
    (x.available ? available : unavailable).push(x.number as number);
    for (const key of ['code', 'name', 'team', 'color', 'unavailableReason']) text(x[key], `${p}.${key}`, true);
    if (x.color !== null && !/^#[0-9a-f]{6}$/i.test(x.color as string)) fail(`${p}.color`);
    if (!['moving', 'stationary_or_stale', 'missing_location', 'missing_telemetry'].includes(x.motionStatus as string)) fail(`${p}.motionStatus`);
    if (x.available || x.routeRepresentation !== undefined) text(x.routeRepresentation, `${p}.routeRepresentation`);
    rows(x.location, `${p}.location`, 4, (v, _, p) => numeric(v, p));
    rows(x.telemetry, `${p}.telemetry`, 6, (v, j, p) => { numeric(v, p, true); if (j === 3 && v !== null && v !== 0 && v !== 1) fail(p); });
    rows(x.route, `${p}.route`, 3, (v, j, p) => { finite(v, p); if ((j === 1 && (v < 0 || v >= 1)) || (j === 2 && v < 0)) fail(p); });
    if (!x.available && (x.route as unknown[]).length) fail(`${p}.unavailable route`);
    rows(x.positions, `${p}.positions`, 2, (v, _, p) => { integer(v, p); if (v === 0) fail(p); });
    rows(x.intervals, `${p}.intervals`, 3, (v, _, p) => { if (v !== null && typeof v !== 'string') finite(v, p); });
    for (const [j, value] of array(x.laps, `${p}.laps`).entries()) {
      const l = object(value, `${p}.laps[${j}]`); numeric(l.start, `${p}.lap.start`, true); integer(l.number, `${p}.lap.number`, true); numeric(l.duration, `${p}.lap.duration`, true);
      if (typeof l.duration === 'number' && l.duration < 0) fail(`${p}.lap.duration`);
    }
    for (const value of array(x.stints, `${p}.stints`)) {
      const s = object(value, `${p}.stint`); for (const key of ['number', 'lapStart', 'lapEnd', 'tyreAgeAtStart']) integer(s[key], `${p}.stint.${key}`, true);
      text(s.compound, `${p}.stint.compound`, true);
    }
    const coverage = object(x.coverage, `${p}.coverage`);
    for (const key of ['location', 'telemetry', 'positions', 'intervals']) {
      const c = object(coverage[key], `${p}.coverage.${key}`);
      integer(c.count, `${p}.coverage.${key}.count`); integer(c.inWindowCount, `${p}.coverage.${key}.inWindowCount`);
      numeric(c.first, `${p}.coverage.${key}.first`, true); numeric(c.last, `${p}.coverage.${key}.last`, true);
      if (c.count !== (x[key] as unknown[]).length) fail(`${p}.coverage.${key}.count mismatch`);
    }
  }
  const s = object(d.summary, 'summary'); if (s.driverCount !== drivers.length) fail('summary.driverCount');
  for (const [key, expected] of [['availableDrivers', available], ['unavailableDrivers', unavailable]] as const) {
    const actual = array(s[key], `summary.${key}`);
    if (actual.length !== expected.length || new Set(actual).size !== actual.length || expected.some(n => !actual.includes(n))) fail(`summary.${key}`);
  }
  for (const key of ['rawCounts', 'sampleCounts']) for (const [k, v] of Object.entries(object(s[key], `summary.${key}`))) integer(v, `summary.${key}.${k}`);
  return freeze(value as ReplayDataset);
}
export function parseTrackData(value: unknown): TrackData {
  const t = object(value, 'track'); for (const key of ['model', 'coordinates', 'source']) text(t[key], `track.${key}`);
  finite(t.length, 'track.length'); if (t.length <= 0) fail('track.length');
  const points = array(t.points, 'track.points'); if (points.length < 3) fail('track.points');
  for (const point of points) { const p = array(point, 'track.point'); if (p.length !== 3) fail('track.point'); for (const n of p) finite(n, 'track.point coordinate'); }
  const lengths = array(t.lengths, 'track.lengths'); if (lengths.length !== points.length + 1 || lengths[0] !== 0) fail('track.lengths');
  lengths.forEach((n, i) => { finite(n, 'track.lengths'); if (i && n <= (lengths[i - 1] as number)) fail('track.lengths order'); });
  if (Math.abs((lengths[lengths.length - 1] as number) - t.length) > .000001) fail('track.length mismatch');
  return freeze(value as TrackData);
}
