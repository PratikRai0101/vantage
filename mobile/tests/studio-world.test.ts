import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { disposeTree } from '../src/scene/objects';
import { replayTrack } from '../src/state/fixture';

test('actual studio GLB loads offline and has genuine non-uniform baked vertex light',async()=>{
  const bytes=readFileSync(new URL('../assets/models/suzuka-world.glb',import.meta.url));
  const header=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+header).toString());
  assert.ok(!json.images?.length && !json.extensionsRequired?.length);
  assert.ok(!json.buffers.some((b:{uri?:string})=>b.uri));
  const world=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength), '')).scene;
  let ground=false,triangles=0,wheelClearance=Infinity;
  world.updateMatrixWorld(true);
  world.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    const geometry=object.geometry;
    triangles+=(geometry.index?.count??geometry.getAttribute('position').count)/3;
    if(object.name.includes('wheel-red')) {
      const positions=geometry.getAttribute('position');
      for(let i=0;i<positions.count;i++) {
        const p=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);
        for(const t of replayTrack.points)wheelClearance=Math.min(wheelClearance,Math.hypot(p.x-t[0],p.z-t[2]));
      }
    }
    if(!object.name.startsWith('Ground'))return;
    ground=true;
    assert.ok(geometry.getAttribute('position').count>7000,'spatial sampling supports baked contacts');
    const colors=geometry.getAttribute('color');
    assert.ok(colors,'lighting must survive export, not white fallback COLOR_0');
    let min=1,max=0;
    for(let i=0;i<colors.count;i++){min=Math.min(min,colors.getX(i));max=Math.max(max,colors.getX(i));}
    assert.ok(min<.7 && max>.95,`expected real baked range, got ${min}..${max}`);
  });
  assert.ok(ground);
  assert.ok(Number.isFinite(wheelClearance)&&wheelClearance>1.8,`landmark intrudes on road/car envelope: ${wheelClearance}`);
  assert.ok(triangles<100000,'world remains deliberately bounded for phones');
  disposeTree(world);
});
