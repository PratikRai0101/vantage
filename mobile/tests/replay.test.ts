/// <reference types="node" />
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { asOf, routeAt, snapshot, snapshotDriver, standings, lapAt, lastCompletedLap, formatGap, formatClock, formatTime, parseReplayDataset, parseTrackData, ReplayEngine } from '../src/replay/index';
import type { Driver } from '../src/replay/index';

const raw = JSON.parse(readFileSync(new URL('../assets/replay/playback.json', import.meta.url), 'utf8'));
const rawTrack = JSON.parse(readFileSync(new URL('../assets/replay/track.json', import.meta.url), 'utf8'));
const data = parseReplayDataset(raw);
const track = parseTrackData(rawTrack);
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('Battle query selection is an explicit dependency at an unchanged paused cursor',()=>{
  const e=new ReplayEngine(data);e.seek(78.5);
  assert.equal(e.battlePartner(78.5,18)?.code,'HUL');
  assert.equal(e.battlePartner(78.5,27)?.code,'TSU');
  assert.equal(e.getTime(),78.5);
  for(const selected of data.drivers.filter(d=>d.available))assert.notEqual(e.battlePartner(78.5,selected.number)?.number,selected.number);
});

test('as-of lookup never reads future telemetry, rank or gap samples', () => {
  assert.equal(asOf([], 1), null); assert.equal(asOf([[1, 10]], .9), null);
  assert.deepEqual(asOf([[0, 10], [1, 20], [1, 21], [2, 30]], 1), [1, 21]);
  assert.equal(asOf([[0, 1]], NaN), null);
  for (const d of data.drivers) for (let t = 0; t <= 120; t += .37) {
    const s = snapshot(d, t);
    if (s.sampleTime !== null) assert.ok(s.sampleTime <= t);
    if (s.gap) assert.ok(s.gap[0] <= t);
    const rank = asOf(d.positions, t); if (rank) assert.ok(rank[0] <= t);
  }
});
test('route interpolation wraps both ways and never extrapolates across missing coverage', () => {
  near(routeAt([[0, .99], [1, .01]], .5)!.phase, 0);
  near(routeAt([[0, .01], [1, .99]], .5)!.phase, 0);
  assert.equal(routeAt([[0, .1], [20, .8]], 10), null);
  assert.equal(routeAt([[0, .1], [20, .8]], 1)!.held, true);
  assert.equal(routeAt([[0, .1]], 3)!.held, true);
  assert.equal(routeAt([[0, .1]], 3.001), null);
  assert.equal(routeAt([[1, .1]], 0), null);
  assert.equal(routeAt([[0, .1]], Infinity), null);
});
test('17 eligible moving streams and three unavailable stationary streams', () => {
  assert.equal(data.drivers.length, 20); assert.equal(data.drivers.filter(d => d.available).length, 17);
  assert.deepEqual(data.drivers.filter(d => !d.available).map(d => d.code).sort(), ['ALB', 'RIC', 'ZHO']);
  for (const d of data.drivers) for (const t of [0, .5, 30, 67.5, 119.9, 120]) {
    const s = snapshot(d, t); assert.equal(!!s.route, d.available);
    if (d.available) {
      assert.ok(s.usable); assert.ok(s.age! >= 0 && s.age! < 2); assert.ok(s.speed! >= 0); assert.ok(s.brake === 0 || s.brake === 1);
    } else { assert.equal(s.speed, null); assert.equal(s.throttle, null); assert.equal(s.usable, false); }
  }
});
test('historical rank seeds preserve 20 ranks from 443 events with 26 retained events', () => {
  const order = standings(data, 0); assert.equal(order[0].driver.code, 'VER'); assert.equal(order[0].position, 1);
  assert.deepEqual(order.map(s => s.position), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.equal(data.summary.rawCounts.positionHistory, 443);
  assert.equal(data.summary.sampleCounts.positions, 26);
  assert.equal(data.drivers.reduce((n, d) => n + d.positions.length, 0), 26);
  for (const d of data.drivers) {
    assert.equal(d.positions.filter(r => r[0] <= 0).length, 1);
    assert.equal(d.coverage.positions.count, d.positions.length);
    for (const event of d.positions.filter(r => r[0] > 0)) {
      assert.notEqual(asOf(d.positions, event[0] - .000001), event);
      assert.equal(asOf(d.positions, event[0]), event);
    }
  }
  // Changing geometry cannot affect recorded ranks or gaps.
  const altered = { ...data, drivers: data.drivers.map(d => ({ ...d, route: [] })) };
  assert.deepEqual(standings(altered, 30).map(s => [s.driver.number, s.position, s.gap]), standings(data, 30).map(s => [s.driver.number, s.position, s.gap]));
});
test('lap and stint lookup uses timestamps; only completed laps qualify for last lap', () => {
  for (const d of data.drivers) for (const t of [0, 40, 80, 120]) {
    const lap = lastCompletedLap(d, t); if (lap) assert.ok(lap.start! + lap.duration! <= t);
    assert.ok(lapAt(d, t) === null || lapAt(d, t)!.start! <= t);
  }
  const d = { ...data.drivers[0], laps: [{ start: 100, number: 1, duration: 10 }, { start: 0, number: 2, duration: 5 }, { start: 5, number: 3, duration: null }] };
  assert.equal(lapAt(d, 7)?.number, 3); assert.equal(lastCompletedLap(d, 109)?.number, 2); assert.equal(lastCompletedLap(d, 110)?.number, 1);
});
test('fixture metadata, route timestamps, geometry continuity and track remain intact', () => {
  assert.equal(data.session.session_key, 9496); assert.equal(data.window.start, '2024-04-07T05:55:00Z');
  assert.ok(String(data.provenance.usage).includes('noncommercial'));
  assert.equal(track.points.length, 1026); assert.equal(track.lengths.length, 1027); assert.equal(track.lengths.at(-1), track.length);
  for (const d of data.drivers) {
    if (d.available) {
      assert.deepEqual(d.route.map(r => r[0]), d.location.map(r => r[0]));
      for (let i = 1; i < d.route.length; i++) {
        const diff = (d.route[i][1] - d.route[i - 1][1] + 1.5) % 1 - .5;
        assert.ok(Math.abs(diff) < .025, 'Unexpected crossing/phase jump');
      }
    } else assert.deepEqual(d.route, []);
  }
});
test('stale, absent and out-of-range telemetry stays unavailable; gaps hold without extrapolation', () => {
  const d = { ...data.drivers[0], telemetry: [[0, 401, -1, 1, 9, 20001]], intervals: [[0, 2.5, 1]] } as Driver;
  const s = snapshot(d, 1); assert.equal(s.speed, null); assert.equal(s.throttle, null); assert.equal(s.gear, null); assert.equal(s.rpm, null); assert.equal(s.brake, 1);
  assert.equal(snapshot(d, 2.001).usable, false); assert.equal(snapshot(d, -.1).speed, null);
  assert.deepEqual(snapshot(d, 100).gap, [0, 2.5, 1]);
  assert.equal(snapshotDriver(data, -1, 0), undefined);
  assert.equal(formatGap(null, 1), 'Leader'); assert.equal(formatGap(null, 2), '—'); assert.equal(formatGap([0, 2.5, 1], 2), '+2.500s'); assert.equal(formatGap([0, '+1 LAP', null], 20), '+1 LAP');
  assert.equal(formatTime(59.96), '01:00.0'); assert.equal(formatTime(120), '02:00.0'); assert.equal(formatTime(NaN), '—');
  assert.equal(formatClock(78.5), '01:18'); assert.equal(formatClock(120), '02:00'); assert.equal(formatClock(-1), '—');
});
test('runtime validation rejects malformed streams and track, preserving immutable source', () => {
  assert.ok(Object.isFrozen(data.drivers[0].telemetry)); assert.ok(Object.isFrozen(track.points));
  const change = (mutate: (d: any) => void) => { const d = structuredClone(data); mutate(d); assert.throws(() => parseReplayDataset(d), TypeError); };
  assert.throws(() => parseReplayDataset(null), TypeError);
  change(d => { d.schemaVersion = 2; }); change(d => { d.window.duration = Infinity; });
  change(d => { d.drivers[0].telemetry[0][3] = 42; });
  change(d => { d.drivers[0].telemetry.reverse(); });
  change(d => { d.drivers[0].route[0][1] = 1; });
  change(d => { d.drivers[1].number = d.drivers[0].number; });
  const t = structuredClone(track) as any; t.lengths[1] = -1; assert.throws(() => parseTrackData(t), TypeError);
});
test('external-store snapshots are immutable and stable between bounded publications', () => {
  const e = new ReplayEngine(data); const initial = e.getSnapshot(); let calls = 0, clockCalls = 0;
  const unsubscribe = e.subscribe(() => { calls++; assert.ok(Object.isFrozen(e.getSnapshot())); });
  const unsubscribeClock = e.subscribeClock(() => { clockCalls++; assert.equal(e.getClock(), e.getTime()); });
  assert.equal(e.getSnapshot(), initial); assert.ok(Object.isFrozen(initial));
  e.playPause(); assert.equal(calls, 1); assert.equal(clockCalls, 1); const playing = e.getSnapshot();
  e.step(.03); e.step(.03); assert.equal(e.getSnapshot(), playing); near(e.getTime(), .06);
  assert.equal(calls, 1); assert.equal(clockCalls, 1); // playback ticks never publish screen state
  assert.equal(e.getSnapshot().time, 0); // structural cursor is the last deliberate change
  for (let i = 0; i < 4; i++) e.step(.25); // frame catch-up caps at .25s per accepted step
  assert.equal(calls, 1); assert.equal(clockCalls, 2); // 1Hz display clock, still no screen publish
  assert.equal(e.getSnapshot(), playing);
  assert.equal(initial.playing, false); assert.equal(initial.time, 0);
  unsubscribe(); unsubscribeClock(); e.pause(); assert.equal(calls, 1); assert.equal(clockCalls, 2);
  assert.equal(e.getSnapshot().time, e.getTime()); // pause flushes the cursor into screen state
});
test('display clock notifies at most once per second of accepted frame time and follows controls', () => {
  const e = new ReplayEngine(data); const seen: number[] = [];
  e.subscribeClock(() => seen.push(e.getClock()));
  e.seek(10); assert.deepEqual(seen, [10]); seen.length = 0;
  e.playPause(); assert.deepEqual(seen, [10]); seen.length = 0;
  for (let i = 0; i < 3; i++) e.step(.25); assert.deepEqual(seen, []);
  e.step(.25); assert.equal(seen.length, 1); near(seen[0], 11);
  e.playPause(); assert.equal(seen.length, 2); near(seen[1], 11);
  e.step(.25); assert.equal(seen.length, 2); // paused cursor does not tick
  e.seek(20); near(e.getClock(), 20); assert.equal(seen.length, 3);
});
test('seek clamps and pauses; NaN, infinities, negative deltas and invalid speed cannot corrupt state', () => {
  const e = new ReplayEngine(data); e.playPause(); const before = e.getSnapshot();
  for (const invalid of [NaN, Infinity, -Infinity]) { e.seek(invalid); e.setSpeed(invalid); e.step(invalid); }
  e.setSpeed(0); e.setSpeed(-1); e.step(-10); assert.equal(e.getSnapshot(), before); assert.equal(e.getTime(), 0);
  e.seek(999); assert.equal(e.getTime(), 120); assert.equal(e.getSnapshot().playing, false);
  e.seek(-1); assert.equal(e.getTime(), 0); e.seek(55.123); assert.equal(e.getSnapshot().time, 55.123);
  e.playPause(); e.step(30); near(e.getTime(), 55.373); // frame catch-up capped at .25s
  e.pause(); const paused = e.getTime(); e.step(.25); assert.equal(e.getTime(), paused);
});
test('selection and comparison remain eligible/distinct in both directions without touching clock', () => {
  const e = new ReplayEngine(data); e.seek(17.5); e.playPause();
  const first = e.getSnapshot(); assert.equal(first.selected, 4); assert.equal(first.compare, 1);
  for (const n of [-1, 3, 23, 24, NaN, 999]) { e.selectDriver(n); e.setCompare(n); }
  e.setCompare(4); assert.equal(e.getSnapshot(), first);
  e.selectDriver(1); assert.equal(e.getSnapshot().selected, 1); assert.notEqual(e.getSnapshot().compare, 1);
  e.setCompare(4); assert.equal(e.getSnapshot().compare, 4); e.setCompare(1); assert.equal(e.getSnapshot().compare, 4);
  assert.equal(e.getTime(), 17.5); assert.equal(e.getSnapshot().playing, true);
});
test('speed and cameras are independent; driver, standings and battle derive from one cursor', () => {
  const e = new ReplayEngine(data); e.seek(50); e.setSpeed(2); e.setCamera('battle');
  assert.equal(e.getTime(), 50); assert.equal(e.getSnapshot().playing, false); assert.equal(e.getSnapshot().speed, 2);
  const before = e.getSnapshot(); e.setCamera('invalid' as any); assert.equal(e.getSnapshot(), before);
  e.playPause(); e.step(.1); near(e.getTime(), 50.2);
  assert.deepEqual(e.driverSnapshot(4), snapshotDriver(data, 4, e.getTime()));
  assert.deepEqual(e.standings(), standings(data, e.getTime()));
  const mine = e.driverSnapshot(e.getSnapshot().selected)!;
  assert.equal(e.battlePartner()?.number, e.standings().find(s => s.driver.available && s.position === mine.position! - 1)?.driver.number);
  e.selectDriver(1); assert.equal(e.battlePartner()?.number, e.standings().find(s => s.position === 2)?.driver.number);
});
test('playback ticks only move the display clock; controls and end flush immediately', () => {
  const e = new ReplayEngine(data); e.setSpeed(2); e.playPause(); let structural = 0, clock = 0;
  const unsubscribe = e.subscribe(() => structural++); const unsubscribeClock = e.subscribeClock(() => clock++);
  for (let i = 0; i < 60; i++) e.step(1 / 60);
  assert.equal(structural, 0); assert.equal(clock, 1); near(e.getTime(), 2); near(e.getClock(), 2);
  assert.equal(e.getSnapshot().time, 0);
  e.step(.01); const current = e.getTime(); const old = e.getSnapshot(); e.setCamera('follow');
  assert.equal(structural, 1); assert.equal(clock, 2); assert.notEqual(e.getSnapshot(), old); assert.equal(e.getSnapshot().time, current);
  e.seek(119.99); e.playPause(); structural = 0; clock = 0; e.step(.01);
  assert.equal(structural, 1); assert.equal(clock, 1); assert.equal(e.getSnapshot().time, 120); assert.equal(e.getSnapshot().playing, false);
  const ended = e.getSnapshot(); e.step(.25); assert.equal(e.getSnapshot(), ended);
  e.pause(); assert.equal(e.getSnapshot(), ended); e.playPause(); assert.equal(e.getTime(), 0); // explicit restart only
  unsubscribe(); unsubscribeClock();
});
