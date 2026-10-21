import type { CameraMode, Driver, ReplayDataset, ReplayState } from './models';
import { snapshotDriver, standings as sampleStandings } from './sampling';

/**
 * React display-clock cadence in accepted frame time. The native scene never uses this.
 * Readouts show whole seconds; see docs/architecture.md for the measured React commit cost.
 */
export const CLOCK_PUBLISH_SECONDS = 1;

/**
 * Caller owns the animation loop. No timers, React, native imports or foreground auto-resume.
 *
 * Two notification channels, one clock:
 * - `subscribe`/`getSnapshot` carry structural state (playing, camera, selection, speed,
 *   and the cursor as of that structural change). Screens re-render only when the user acts.
 * - `subscribeClock`/`getClock` carry the display cursor for small live readouts.
 *   Re-rendering a whole screen from the playback cursor stalls the single JS thread and
 *   drops render frames; the native renderer reads `getTime()` every frame regardless.
 */
export class ReplayEngine {
  readonly data: ReplayDataset;
  private state: ReplayState;
  private time = 0;
  private clockTime = 0;
  private sinceClock = 0;
  private readonly listeners = new Set<() => void>();
  private readonly clockListeners = new Set<() => void>();

  constructor(data: ReplayDataset) {
    this.data = data;
    const eligible = data.drivers.filter(d => d.available);
    if (eligible.length < 2) throw new TypeError('Replay requires two eligible drivers for distinct comparison');
    const selected = eligible.find(d => d.number === 4) ?? eligible[0];
    const compare = eligible.find(d => d.number === 1 && d.number !== selected.number) ?? eligible.find(d => d.number !== selected.number)!;
    this.state = Object.freeze({ time: 0, playing: false, speed: 1, selected: selected.number, compare: compare.number, camera: 'overview' });
  }
  // Bound callbacks can be passed directly to useSyncExternalStore.
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener); return () => { this.listeners.delete(listener); };
  };
  subscribeClock = (listener: () => void): (() => void) => {
    this.clockListeners.add(listener); return () => { this.clockListeners.delete(listener); };
  };
  getSnapshot = (): ReplayState => this.state;
  getTime = (): number => this.time;
  // Stable between notifications so React's tearing check cannot loop on an advancing clock.
  getClock = (): number => this.clockTime;

  private notifyClock(): void {
    this.sinceClock = 0;
    this.clockTime = this.time;
    for (const listener of [...this.clockListeners]) listener();
  }

  private publish(patch: Partial<ReplayState> = {}): void {
    const next = { ...this.state, ...patch, time: this.time };
    if ((Object.keys(next) as (keyof ReplayState)[]).every(k => next[k] === this.state[k])) return;
    this.state = Object.freeze(next);
    for (const listener of [...this.listeners]) listener();
    this.notifyClock();
  }
  playPause(): void {
    if (this.state.playing) { this.pause(); return; }
    // An explicit Play can restart; reaching the end never loops automatically.
    if (this.time >= this.data.window.duration) this.time = 0;
    this.publish({ playing: true });
  }
  pause(): void { this.publish({ playing: false }); }
  seek(t: number): void {
    if (!Number.isFinite(t)) return;
    this.time = Math.min(this.data.window.duration, Math.max(0, t));
    this.publish({ playing: false });
  }
  setSpeed(speed: number): void {
    if (!Number.isFinite(speed) || speed <= 0) return;
    this.publish({ speed });
  }
  private eligible(number: number): boolean { return this.data.drivers.some(d => d.number === number && d.available); }
  selectDriver(number: number): void {
    if (!this.eligible(number)) return;
    const compare = this.state.compare === number
      ? this.data.drivers.find(d => d.available && d.number !== number)!.number : this.state.compare;
    this.publish({ selected: number, compare });
  }
  setCompare(number: number): void {
    if (number !== this.state.selected && this.eligible(number)) this.publish({ compare: number });
  }
  setCamera(camera: CameraMode): void {
    if (camera === 'overview' || camera === 'follow' || camera === 'battle') this.publish({ camera });
  }
  step(deltaSeconds: number): void {
    if (!this.state.playing || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    const delta = Math.min(.25, deltaSeconds);
    this.time = Math.min(this.data.window.duration, this.time + delta * this.state.speed);
    this.sinceClock += delta;
    if (this.time >= this.data.window.duration) this.publish({ playing: false });
    else if (this.sinceClock + 1e-10 >= CLOCK_PUBLISH_SECONDS) this.notifyClock();
  }
  driverSnapshot(number: number, time = this.time) { return snapshotDriver(this.data, number, time); }
  standings(time = this.time) { return sampleStandings(this.data, time); }
  // React/compiler callers must pass selection explicitly: engine identity and
  // paused time alone do not capture a mutable selected-driver dependency.
  battlePartner(time = this.time, selected = this.state.selected): Driver | undefined {
    const mine = this.driverSnapshot(selected, time);
    const others = this.standings(time).filter(s => s.driver.available && s.driver.number !== selected);
    const target = mine?.position === 1 ? 2 : mine?.position == null ? null : mine.position - 1;
    return (others.find(s => target !== null && s.position === target) ?? others[0])?.driver;
  }
}
