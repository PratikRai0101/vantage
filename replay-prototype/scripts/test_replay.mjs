import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {asOf,routeAt,snapshot,standings,lastCompletedLap,advance,formatGap} from '../replay.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/playback.json',import.meta.url)));
test('as-of lookup never reads a future telemetry sample',()=>{
 assert.equal(asOf([],1),null);assert.equal(asOf([[1,10]],.9),null);
 assert.deepEqual(asOf([[0,10],[1,20],[1,21],[2,30]],1),[1,21]);
 for(const d of data.drivers)for(let t=0;t<=120;t+=.37){const r=asOf(d.telemetry,t);if(r)assert.ok(r[0]<=t);}
});
test('location interpolation takes the short path across the start/finish wrap',()=>{
 const s=routeAt([[0,.99],[1,.01]],.5);assert.ok(s.phase<.000001||s.phase>.999999);
 assert.equal(routeAt([[0,.1],[20,.8]],10),null);
 assert.equal(routeAt([[0,.1],[20,.8]],1).held,true);
});
test('all 17 eligible streams have coverage; three stationary streams are not animated',()=>{
 assert.equal(data.drivers.length,20);assert.equal(data.drivers.filter(d=>d.available).length,17);
 assert.deepEqual(data.drivers.filter(d=>!d.available).map(d=>d.code).sort(),['ALB','RIC','ZHO']);
 for(const d of data.drivers)for(const t of [0,.5,30,67.5,119.9,120]){
  const s=snapshot(d,t);assert.equal(!!s.route,d.available);
  if(d.available){assert.ok(s.usable);assert.ok(s.age>=0&&s.age<2);assert.ok(s.speed>=0);assert.ok([0,1].includes(s.brake));}
  else {assert.equal(s.speed,null);assert.equal(s.throttle,null);}
 }
});
test('ranks are seeded from pre-window events, not guessed from geometric progress',()=>{
 assert.equal(standings(data.drivers,0)[0].driver.code,'VER');
 assert.equal(standings(data.drivers,0)[0].position,1);
 for(const d of data.drivers){assert.ok(d.positions.some(r=>r[0]<=0));}
});
test('last lap is complete at the cursor, not a future known lap from the dataset',()=>{
 for(const d of data.drivers)for(const t of [0,40,80,120]){const lap=lastCompletedLap(d,t);if(lap)assert.ok(lap.start+lap.duration<=t);}
});
test('derived fixture counts and route timestamps match the actual playback streams',()=>{
 assert.equal(data.summary.sampleCounts.positions,data.drivers.reduce((n,d)=>n+d.positions.length,0));
 assert.equal(data.summary.rawCounts.positionHistory,443);
 for(const d of data.drivers){
  assert.equal(d.coverage.positions.count,d.positions.length);
  if(d.available){assert.deepEqual(d.route.map(r=>r[0]),d.location.map(r=>r[0]));
   for(let i=1;i<d.route.length;i++){let diff=d.route[i][1]-d.route[i-1][1];diff=(diff+.5+1)%1-.5;assert.ok(Math.abs(diff)<.025,'Unexpected crossing/phase jump');}
  }else assert.deepEqual(d.route,[]);
 }
});
test('one bounded replay clock, no implicit looping and no background catch-up',()=>{
 assert.equal(advance(119.8,.2,2,120),120);assert.equal(advance(10,30,1,120),10.25);assert.equal(advance(10,-1,1,120),10);
 assert.equal(formatGap(null,1),'Leader');assert.equal(formatGap(null,2),'—');
});
