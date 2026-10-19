import * as THREE from 'three';
import { carModel } from './objects';

/** Native GLES3/WebGL2 fleet: five shared material batches for the whole field.
 * Pose groups stay separate for camera/picking/grouping. Root is world-aligned.
 * Hidden grouped projections are packed OUT, not uploaded as intersecting cars.
 */
export function createCarFleet(drivers:readonly {number:number;color?:string|null}[]) {
  const root=new THREE.Group(),actors=new Map<number,THREE.Group>(),colors=new Map<number,THREE.Color>();
  const prototype=carModel('#ffffff');
  const scale=prototype.scale.clone();
  const batches:THREE.InstancedMesh[]=[];
  for(const part of prototype.children) {
    if(!(part instanceof THREE.Mesh))continue;
    const mesh=new THREE.InstancedMesh(part.geometry,part.material,drivers.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Twenty moving cars cover the tiny maquette. No stale per-instance bounds.
    mesh.frustumCulled=false;mesh.count=0;
    if(part.material instanceof THREE.MeshStandardMaterial&&part.material.color.getHex()===0xffffff){
      mesh.userData.teamPaint=true;
      mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(drivers.length*3),3).setUsage(THREE.DynamicDrawUsage);
    }
    batches.push(mesh);root.add(mesh);
  }
  for(const driver of drivers) {
    const pose=new THREE.Group();actors.set(driver.number,pose);root.add(pose);
    colors.set(driver.number,new THREE.Color(driver.color??'#c0d5df'));
  }
  const matrix=new THREE.Matrix4();
  const update=()=>{
    let index=0;
    for(const [number,actor] of actors) {
      if(!actor.visible)continue;
      actor.updateMatrix();matrix.copy(actor.matrix).scale(scale);
      for(const mesh of batches) {
        mesh.setMatrixAt(index,matrix);
        if(mesh.userData.teamPaint)mesh.setColorAt(index,colors.get(number)!);
      }
      index++;
    }
    for(const mesh of batches){mesh.count=index;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  };
  return {root,actors,batches,update};
}
