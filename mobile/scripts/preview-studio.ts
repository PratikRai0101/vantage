/** Art-direction review harness. Browser rendering is NOT native acceptance.
 * Bundle with esbuild and serve repo root locally. Reuses actual native assets,
 * cars, labels, replay registration and camera goals, not a separate mock scene.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cameraFrustum, cameraGoal, overviewGoal, routeHeading, routePoint } from '../src/scene/math';
import { carContactShadow, carModel, driverLabel, driverTether, fieldMarker, selectionRing } from '../src/scene/objects';
import { replayData, replayTrack } from '../src/state/fixture';
import { ReplayEngine } from '../src/replay';

const engine=new ReplayEngine(replayData);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera();
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setSize(1080,1200); renderer.setClearColor('#101719'); renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.08;
document.body.style.cssText='margin:0;background:#101719';document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight('#dce5df','#29342c',1.35));
const key=new THREE.DirectionalLight('#fff0d7',2.8);key.position.set(-45,100,75);scene.add(key);
const fill=new THREE.DirectionalLight('#bfd9e5',.6);fill.position.set(65,35,-50);scene.add(fill);
const world=await new GLTFLoader().loadAsync('/mobile/assets/models/suzuka-world.glb');scene.add(world.scene);
const actors=new Map<number,THREE.Group>(),labels=new Map<number,THREE.Sprite>(),markers=new Map<number,THREE.Sprite>(),tethers=new Map<number,THREE.Line>();
for(const d of replayData.drivers) {
 if(!d.available)continue;
 const actor=carModel(d.color??'#c0d5df');actors.set(d.number,actor);scene.add(actor);
 const shadow=carContactShadow();actor.add(shadow);shadow.position.y=-.012; // preview only; native keeps unscaled contact on road
 const label=driverLabel(d.code??String(d.number));labels.set(d.number,label);scene.add(label);
 const tether=driverTether();tethers.set(d.number,tether);scene.add(tether);
 const marker=fieldMarker(d.color??'#c0d5df');markers.set(d.number,marker);scene.add(marker);
}
const ring=selectionRing('#BCD5EC');scene.add(ring);
const pairRing=selectionRing('#8DAEBD',1.48);scene.add(pairRing);
Object.assign(camera,cameraFrustum(1080/1200));
function draw(mode:'overview'|'follow'|'battle'='overview',time=6.4) {
 engine.seek(time);engine.setCamera(mode);
 for(const [n,actor] of actors) {
  const route=engine.driverSnapshot(n,time)?.route;actor.visible=!!route;
  if(route){actor.position.fromArray(routePoint(replayTrack,route.phase));actor.rotation.y=routeHeading(replayTrack,route.phase);}
 }
 const selected=actors.get(4)!,partner=mode==='battle'?engine.battlePartner(time):undefined,second=partner?actors.get(partner.number):undefined;
 const route=engine.driverSnapshot(4,time)?.route;
 const goal=mode==='overview'?overviewGoal(replayTrack,1080/1200):cameraGoal(mode,selected.position.toArray(),route?routePoint(replayTrack,route.phase+.001):undefined,second?.position.toArray()); camera.position.fromArray(goal.position);camera.zoom=goal.zoom;camera.lookAt(new THREE.Vector3().fromArray(goal.target));camera.updateProjectionMatrix();camera.updateMatrixWorld();
 ring.position.copy(selected.position);ring.position.y+=.04;
 pairRing.visible=!!second;if(second){pairRing.position.copy(second.position);pairRing.position.y+=.045;}
 const units=(camera.top-camera.bottom)/camera.zoom/400;
 for(const [n,label] of labels) {
  label.visible=n===4||n===partner?.number;
  const up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),anchor=actors.get(n)!.position;
  const labelHeight=mode==='overview'?14:16;
  label.position.copy(anchor).addScaledVector(up,24*units);
  label.scale.set(labelHeight*units*Number(label.userData.labelAspect),labelHeight*units,1);label.material.opacity=n===4?1:.8;
  const tether=tethers.get(n)!;tether.visible=label.visible;
  const from=anchor.clone().addScaledVector(up,7*units),to=anchor.clone().addScaledVector(up,(24-labelHeight/2)*units),points=tether.geometry.getAttribute('position');
  points.setXYZ(0,from.x,from.y,from.z);points.setXYZ(1,to.x,to.y,to.z);points.needsUpdate=true;tether.geometry.computeBoundingSphere();
 }
 for(const [n,marker] of markers){marker.visible=mode==='overview';marker.position.copy(actors.get(n)!.position);marker.position.y+=.7;marker.scale.setScalar((n===4?5.5:3.5)*units);if(n===4)marker.material.color.set('#BCD5EC');}
 renderer.render(scene,camera);
 console.log('ART_REVIEW_ONLY',mode,time,renderer.info.render.calls,renderer.info.render.triangles);
}
Object.assign(window,{draw});draw();
