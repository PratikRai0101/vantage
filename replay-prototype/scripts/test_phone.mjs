import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeFrames} from '../frame-stats.mjs';
test('missing frame observations are unknown, never reported as zero FPS',()=>{
 assert.equal(summarizeFrames([]),null);assert.equal(summarizeFrames([0,-1,NaN,Infinity]),null);
});
test('summary retains long stalls and computes nearest-rank p95',()=>{
 const s=summarizeFrames([10,20,30,40,200,NaN]);
 assert.equal(s.samples,5);assert.equal(s.excluded,1);assert.equal(s.medianIntervalMs,30);
 assert.equal(s.p95IntervalMs,200);assert.equal(s.worstIntervalMs,200);assert.equal(s.over34ms,2);assert.equal(s.over50ms,1);
 assert.equal(s.observedRafHz,16.67);
});
test('refresh cadence is derived from observed intervals, not a hardcoded 60 FPS',()=>{
 assert.equal(summarizeFrames([10,20]).medianIntervalMs,15);
 assert.equal(summarizeFrames(Array(60).fill(1000/60)).observedRafHz,60);
 assert.equal(summarizeFrames(Array(30).fill(1000/30)).observedRafHz,30);
 assert.equal(summarizeFrames(Array(120).fill(1000/120)).observedRafHz,120);
});
