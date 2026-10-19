import type { Driver, DriverSnapshot, IntervalEvent, Lap, ReplayDataset, RoutePosition } from './models';

type TimedRow = readonly [number, ...unknown[]];
function upperBound<T extends TimedRow>(rows: readonly T[], time: number): number {
  let lo = 0, hi = rows.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (rows[mid][0] <= time) lo = mid + 1; else hi = mid; }
  return lo;
}
export function asOf<T extends TimedRow>(rows: readonly T[], time: number): T | null {
  if (!Number.isFinite(time)) return null;
  const i = upperBound(rows, time); return i ? rows[i - 1] : null;
}
/** Only route geometry interpolates. Telemetry, ranks and gaps always hold as-of. */
export function routeAt(rows: readonly (readonly [number, number, ...number[]])[], time: number, maxGap = 3): RoutePosition | null {
  if (!Number.isFinite(time) || !Number.isFinite(maxGap) || maxGap < 0) return null;
  const a = asOf(rows, time); if (!a || time - a[0] > maxGap) return null;
  const b = rows[upperBound(rows, time)];
  if (!b || b[0] - a[0] > maxGap) return { phase: a[1], sampleTime: a[0], held: true };
  const f = Math.max(0, Math.min(1, (time - a[0]) / (b[0] - a[0])));
  let delta = b[1] - a[1]; if (delta > .5) delta -= 1; if (delta < -.5) delta += 1;
  return { phase: ((a[1] + delta * f) % 1 + 1) % 1, sampleTime: a[0], held: false };
}
export function lapAt(driver: Driver, time: number): Lap | null {
  if (!Number.isFinite(time)) return null;
  let latest: Lap | null = null;
  // Lap numbers aren't chronological around this race's red flag. Compare timestamps.
  for (const lap of driver.laps) if (lap.start !== null && lap.start <= time && (latest === null || lap.start > latest.start!)) latest = lap;
  return latest;
}
export function lastCompletedLap(driver: Driver, time: number): Lap | null {
  if (!Number.isFinite(time)) return null;
  let latest: Lap | null = null, end = -Infinity;
  for (const lap of driver.laps) {
    if (lap.start === null || lap.duration === null) continue;
    const completion = lap.start + lap.duration;
    if (completion <= time && completion > end) { latest = lap; end = completion; }
  }
  return latest;
}
function valid(v: number | null, min: number, max: number): number | null {
  return v !== null && Number.isFinite(v) && v >= min && v <= max ? v : null;
}
export function snapshot(driver: Driver, time: number): DriverSnapshot {
  const sample = asOf(driver.telemetry, time), age = sample ? time - sample[0] : null;
  const usable = !!(driver.available && sample && age !== null && age <= 2);
  const lap = lapAt(driver, time);
  let stint: DriverSnapshot['stint'] = null;
  if (lap?.number != null) for (const s of driver.stints) {
    if (s.lapStart !== null && s.lapEnd !== null && s.lapStart <= lap.number && s.lapEnd >= lap.number && (!stint || (s.number ?? -1) > (stint.number ?? -1))) stint = s;
  }
  return {
    driver, time, route: driver.available ? routeAt(driver.route, time) : null,
    sampleTime: sample?.[0] ?? null, age, usable,
    speed: usable ? valid(sample![1], 0, 400) : null,
    throttle: usable ? valid(sample![2], 0, 100) : null,
    brake: usable && (sample![3] === 0 || sample![3] === 1) ? sample![3] : null,
    gear: usable ? valid(sample![4], 0, 8) : null, rpm: usable ? valid(sample![5], 0, 20000) : null,
    position: asOf(driver.positions, time)?.[1] ?? null, gap: asOf(driver.intervals, time), lap, stint,
  };
}
export function snapshotDriver(data: ReplayDataset, driverNumber: number, time: number): DriverSnapshot | undefined {
  const driver = data.drivers.find(d => d.number === driverNumber); return driver ? snapshot(driver, time) : undefined;
}
export function standings(data: ReplayDataset, time: number): DriverSnapshot[] {
  return data.drivers.map(d => snapshot(d, time)).sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity) || a.driver.number - b.driver.number);
}
export function formatTime(t: number): string {
  if (!Number.isFinite(t) || t < 0) return '—';
  // Round first so 59.96 never renders 00:60.0.
  const tenths = Math.round(t * 10), minutes = Math.floor(tenths / 600);
  return `${String(minutes).padStart(2, '0')}:${((tenths % 600) / 10).toFixed(1).padStart(4, '0')}`;
}
/** Whole-second replay clock for the transport; the scene remains live at display rate. */
export function formatClock(t: number): string {
  const value = formatTime(t);
  return value === '—' ? value : value.slice(0, 5);
}
export function formatGap(gap: IntervalEvent | null | undefined, position: number | null): string {
  if (position === 1) return 'Leader';
  if (!gap || gap[1] === null) return '—';
  return typeof gap[1] === 'number' ? (Number.isFinite(gap[1]) ? `+${gap[1].toFixed(3)}s` : '—') : gap[1];
}
