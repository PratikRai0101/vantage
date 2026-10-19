import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { carModel, driverLabel, disposeTree } from '../src/scene/objects';

test('actual car geometry builds with compatible attributes, finite bounds and <=5 draw batches',()=>{
  const car=carModel('#ff8800');
  assert.ok(car.children.length>0 && car.children.length<=5);
  car.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    object.geometry.computeBoundingBox();
    const box=object.geometry.boundingBox!;
    assert.ok([...box.min.toArray(),...box.max.toArray()].every(Number.isFinite));
    assert.ok(object.geometry.getAttribute('normal'));
    const positions=object.geometry.getAttribute('position');
    let volume=0;
    for(let i=0;i<positions.count;i+=3){
      const a=new THREE.Vector3().fromBufferAttribute(positions,i),b=new THREE.Vector3().fromBufferAttribute(positions,i+1),c=new THREE.Vector3().fromBufferAttribute(positions,i+2);
      volume+=a.dot(b.cross(c))/6;
    }
    assert.ok(volume>0, `car batch ${object.material.color.getHexString()} must face outward, signed volume=${volume}`);
  });
  const bounds=new THREE.Box3().setFromObject(car).getSize(new THREE.Vector3());
  assert.ok(bounds.x>2 && bounds.x<3);
  assert.ok(bounds.z>1 && bounds.z<1.5);
  disposeTree(car);
});

test('GPU label uses antialiased bundled-font glyphs rather than 3x5 pixel letters',()=>{
  const label=driverLabel('NOR');
  const map=label.material.map!;
  assert.ok(map.image.width>=80 && map.image.height>=48);
  assert.equal(map.magFilter,THREE.LinearFilter);
  const pixels=map.image.data as Uint8Array;
  assert.ok(pixels.some((value:number,index:number)=>index%4===3 && value>0 && value<200));
  const root=new THREE.Group();root.add(label);disposeTree(root);
});
