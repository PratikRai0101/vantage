import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCarFleet } from '../src/scene/instanced-cars';
import { disposeTree } from '../src/scene/objects';

test('whole native fleet shares five batches, preserves team paint and packs out grouped cars',()=>{
  const drivers=[{number:4,color:'#ff8800'},{number:18,color:'#226644'},{number:27,color:'#eeeeee'}];
  const fleet=createCarFleet(drivers);
  assert.equal(fleet.batches.length,5);
  fleet.actors.get(4)!.position.set(12,.45,-4);fleet.actors.get(4)!.rotation.y=.7;
  fleet.actors.get(18)!.visible=false;fleet.update();
  const mat=new THREE.Matrix4();
  for(const batch of fleet.batches){
    assert.ok(batch instanceof THREE.InstancedMesh);assert.equal(batch.count,2);
    batch.getMatrixAt(0,mat);
    assert.ok(Math.abs(mat.elements[12]-12)<1e-5);
    assert.ok(Math.abs(mat.elements[13]-.45)<1e-5);
    assert.ok(Math.abs(mat.elements[14]+4)<1e-5);
    const scale=new THREE.Vector3();mat.decompose(new THREE.Vector3(),new THREE.Quaternion(),scale);
    assert.ok(Math.abs(scale.x-1.12)<1e-5);
  }
  const paint=fleet.batches.find(b=>b.userData.teamPaint)!;assert.ok(paint);
  const color=new THREE.Color();paint.getColorAt(0,color);
  const orange=new THREE.Color('#ff8800');
  assert.ok((['r','g','b'] as const).every(k=>Math.abs(color[k]-orange[k])<1e-5));
  paint.getColorAt(1,color);assert.ok(Math.abs(color.g-new THREE.Color('#eeeeee').g)<1e-5,'packed index follows visible number27');
  fleet.actors.get(4)!.visible=false;fleet.actors.get(18)!.visible=true;fleet.update();
  paint.getColorAt(0,color);assert.ok(Math.abs(color.g-new THREE.Color('#226644').g)<1e-5);
  let disposed=0;fleet.batches.forEach(b=>b.addEventListener('dispose',()=>disposed++));
  disposeTree(fleet.root);assert.equal(disposed,5,'release per-instance native buffers as well as shared meshes');
});
