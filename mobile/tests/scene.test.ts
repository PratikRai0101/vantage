import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraFrustum, cameraGoal, constrainOrbit, orbitBounds, overviewGoal, routeHeading, routePoint, STUDIO_POSITION, STUDIO_TARGET } from '../src/scene/math';
import { routeAt, type TrackData } from '../src/replay';
import { replayData, replayTrack } from '../src/state/fixture';

const track: TrackData = { model: '', coordinates: '', source: '', points: [[0, 0, 0], [10, 0, 0], [10, 0, 10], [0, 0, 10], [0, 0, 0]], lengths: [0, 10, 20, 30, 40], length: 40 };
test('projected route interpolates and wraps negative and multi-lap phases', () => {
  assert.deepEqual(routePoint(track, .125), [5, 0, 0]);
  assert.deepEqual(routePoint(track, 1.125), [5, 0, 0]);
  assert.deepEqual(routePoint(track, -.125), [0, 0, 5]);
  assert.deepEqual(routePoint(track, 1), [0, 0, 0]);
  assert.throws(() => routePoint(track, NaN));
});
test('heading follows source car local +X axis', () => {
  assert.ok(Math.abs(routeHeading(track, .125)) < 1e-10);
  assert.ok(Math.abs(routeHeading(track, .375) + Math.PI / 2) < 1e-10);
});
test('actual replay heading cannot spin 180 degrees through source route micro-loops',()=>{
  let worst=0;
  for(const driver of replayData.drivers.filter(d=>d.available)) {
    let previous:number|undefined;
    for(let frame=0;frame<120*60;frame++) {
      const route=routeAt(driver.route,frame/60); if(!route){previous=undefined;continue;}
      const heading=routeHeading(replayTrack,route.phase);
      if(previous!==undefined) worst=Math.max(worst,Math.abs(Math.atan2(Math.sin(heading-previous),Math.cos(heading-previous))));
      previous=heading;
    }
  }
  assert.ok(worst<Math.PI/4,`maximum displayed heading jump was ${worst*180/Math.PI} degrees/frame`);
});
test('orbit remains above the tabletop and prevents extreme clipping zoom',()=>{
  for(const mode of ['overview','follow','battle'] as const) {
    const low=constrainOrbit(Math.PI/2-.05,12,mode);
    assert.ok(low.phi<=1.02);
    assert.ok(low.zoom<=4.2);
    assert.ok(Math.cos(low.phi)>.5,'camera retains at least a 30 degree elevation');
    assert.ok(constrainOrbit(-10,.01,mode).zoom>=.75);
  }
});
test('overview preserves source camera and full scene fit at portrait and landscape', () => {
  assert.deepEqual(cameraGoal('overview'), { target: [0, .3, 0], position: [88, 102, 125], zoom: 1 });
  for (const aspect of [.5, 1, 2]) {
    const f = cameraFrustum(aspect);
    assert.ok(f.right - f.left >= 136 - 1e-10);
    assert.ok(f.top - f.bottom >= 91);
  }
});
test('overview frames the recorded circuit, not empty studio space',()=>{
  type Vec=[number,number,number];
  const sub=(a:Vec,b:Vec):Vec=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const dot=(a:Vec,b:Vec)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a:Vec,b:Vec):Vec=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=(a:Vec):Vec=>{const l=Math.hypot(...a)||1;return [a[0]/l,a[1]/l,a[2]/l];};
  for(const aspect of [.55,1,1080/956,2]) {
    const goal=overviewGoal(replayTrack,aspect),f=cameraFrustum(aspect);
    const z=unit(sub(goal.position as Vec,goal.target as Vec)),x=unit(cross([0,1,0],z)),y=cross(z,x);
    let fillX=0,fillY=0;
    for(const p of replayTrack.points) {
      const d=sub(p as Vec,goal.target as Vec),u=dot(d,x),v=dot(d,y);
      // Every recorded point stays inside the fitted rectangle with ribbon margin.
      assert.ok(Math.abs(u)<=f.right/goal.zoom+1e-6,`aspect ${aspect} clips the circuit horizontally`);
      assert.ok(Math.abs(v)<=f.top/goal.zoom+1e-6,`aspect ${aspect} clips the circuit vertically`);
      fillX=Math.max(fillX,Math.abs(u)/(f.right/goal.zoom));
      fillY=Math.max(fillY,Math.abs(v)/(f.top/goal.zoom));
    }
    assert.ok(Math.max(fillX,fillY)>=.8,`aspect ${aspect} leaves the circuit at ${Math.round(Math.max(fillX,fillY)*100)}% of the frame`);
    // Studio direction is unchanged: only the framing rectangle moves.
    const direction=unit(sub(goal.position as Vec,goal.target as Vec)),studio=unit(sub(STUDIO_POSITION as Vec,STUDIO_TARGET as Vec));
    assert.ok(Math.abs(dot(direction,studio)-1)<1e-9,'overview must keep the approved three-quarter angle');
  }
  const phone=overviewGoal(replayTrack,1080/956);
  assert.ok(phone.zoom>1.5,`Note20 portrait overview magnifies ${phone.zoom.toFixed(2)}x; the old static zoom was 1`);
  assert.ok(phone.zoom<3,'overview must not crop the circuit into a corner');
  // Pinching out in overview is relative to the fitted frame, not the whole studio.
  assert.ok(orbitBounds('overview',phone.zoom).min>1.2);
  assert.ok(orbitBounds('follow').min===.9);
});
test('follow tracks selected anchor and heading, battle fits actual pair distance', () => {
  const p = [10, 0, 20] as const;
  const follow = cameraGoal('follow', p, [11, 0, 20]);
  assert.ok(follow.zoom <= 3.2, 'Follow keeps a readable section of the miniature, not a car-sized crop');
  assert.ok(follow.position[1] - follow.target[1] >= 30, 'camera stays above the model');
  const corner = cameraGoal('follow', p, [10, 0, 21]);
  assert.deepEqual(corner.position.map((n,i)=>n-corner.target[i]), follow.position.map((n,i)=>n-follow.target[i]), 'studio azimuth must not whip around bends');
  const near = cameraGoal('battle', p, p, [12, 0, 20]), far = cameraGoal('battle', p, p, [110, 0, 20]);
  assert.deepEqual(near.target, [11, 0, 20]);
  assert.ok(near.zoom > far.zoom);
  assert.equal(far.zoom, .9);
  assert.ok(near.zoom <= 3.8, 'close battles retain track context');
});
