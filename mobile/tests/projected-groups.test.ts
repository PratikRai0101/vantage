import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { replayData,replayTrack } from '../src/state/fixture';
import { routeAt } from '../src/replay';
import { routePoint,routeHeading } from '../src/scene/math';
import { carModel,disposeTree } from '../src/scene/objects';
import { footprintsOverlap,groupProjectedCars,nextGroupDriver,type ProjectedCar } from '../src/scene/projected-groups';
const posesAt=(time:number):ProjectedCar[]=>replayData.drivers.filter(d=>d.available).flatMap(d=>{
  const r=routeAt(d.route,time);return r?[{number:d.number,position:routePoint(replayTrack,r.phase),heading:routeHeading(replayTrack,r.phase)}]:[];
});

test('actual STR/HUL coincident projections become counted group, not intersecting meshes or invented lanes',()=>{
  const poses=posesAt(78.5).filter(p=>p.number===18||p.number===27);
  assert.equal(poses.length,2);assert.ok(footprintsOverlap(poses[0],poses[1]),'must reproduce actual old intersection');
  const original=JSON.stringify(poses),groups=groupProjectedCars(poses,18);
  assert.deepEqual(groups,[{representative:18,members:[18,27]}]);
  assert.equal(JSON.stringify(poses),original,'source positions and headings must not move');
  assert.equal(nextGroupDriver(groups[0],18),27);assert.equal(nextGroupDriver(groups[0],27),18);
});
test('whole replay preserves every moving stream and never displays intersecting car footprints',()=>{
  let previous=groupProjectedCars([],4);
  for(let frame=0;frame<=1200;frame++) {
    const poses=posesAt(frame/10),selected=frame%2?18:4;
    const groups=groupProjectedCars(poses,selected,27,previous);previous=groups;
    assert.deepEqual(groups.flatMap(g=>g.members).sort((a,b)=>a-b),poses.map(p=>p.number).sort((a,b)=>a-b));
    if(poses.some(p=>p.number===selected))assert.ok(groups.some(g=>g.representative===selected),'selected stays visible');
    const displayed=groups.map(g=>poses.find(p=>p.number===g.representative)!);
    for(let i=0;i<displayed.length;i++)for(let j=0;j<i;j++)assert.ok(!footprintsOverlap(displayed[i],displayed[j]));
  }
});
test('grouping respects bridge height, stable priority, and a small release hysteresis',()=>{
  const a:ProjectedCar={number:4,position:[0,.45,0],heading:0},b:ProjectedCar={number:18,position:[0,3,0],heading:0};
  assert.equal(groupProjectedCars([a,b],4).length,2);
  const close={...b,position:[2.4,.45,0] as const};
  const previous=groupProjectedCars([a,close],4);assert.equal(previous.length,1);
  const edge={...close,position:[2.5,.45,0] as const};
  assert.equal(groupProjectedCars([a,edge],4).length,2);
  assert.equal(groupProjectedCars([a,edge],4,undefined,previous).length,1);
  assert.equal(groupProjectedCars([a,close],18)[0].representative,18);
});
test('grouping footprint encloses the real car asset, not an outdated guessed size',()=>{
  const car=carModel('#ff8800');car.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(car);
  assert.ok(box.min.x>=-1.23&&box.max.x<=1.23&&box.min.z>=-.61&&box.max.z<=.61);
  disposeTree(car);
});
