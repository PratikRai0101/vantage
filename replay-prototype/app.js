import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {snapshot,standings,routeAt,lastCompletedLap,advance,formatTime,formatGap} from './replay.mjs';
const $=id=>document.getElementById(id);
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const state={time:0,playing:false,speed:1,selected:4,compare:1,tab:'race',camera:'overview',reduced:motion.matches,needsUI:true,dirty:true};
let data,track,scene,camera,renderer,controls,model,tween=null,ring,partnerRing;
const actors=new Map(),rowNodes=new Map(),dots=new Map();
const titleCase=s=>s.toLocaleLowerCase().replace(/(^|\s)\p{L}/gu,c=>c.toLocaleUpperCase());
const display=v=>v===null||v===undefined?'—':String(v);
const sec=t=>`${t.toFixed(3)}s`;
const lapTime=t=>Number.isFinite(t)?`${Math.floor(t/60)}:${(t%60).toFixed(3).padStart(6,'0')}`:'—';
const value=(id,v)=>{$(id).textContent=v;};
const selected=()=>data.drivers.find(d=>d.number===state.selected);
function invalidate(){state.needsUI=true;state.dirty=true;}
function seek(t){state.time=Math.max(0,Math.min(data.window.duration,Number(t)));state.playing=false;invalidate();}
function choose(n){const d=data.drivers.find(d=>d.number===Number(n));if(!d?.available)return;state.selected=d.number;if(state.compare===d.number)state.compare=data.drivers.find(x=>x.available&&x.number!==d.number).number;invalidate();if(state.camera!=='overview')resetCamera();}
function setTab(tab){state.tab=tab;document.documentElement.dataset.activeTab=tab;document.querySelectorAll('button[data-tab]').forEach(b=>{b.setAttribute('aria-selected',b.dataset.tab===tab);b.tabIndex=b.dataset.tab===tab?0:-1;});['race','timing','lab'].forEach(t=>$(t+'-panel').hidden=t!==tab);invalidate();if(innerWidth<=760)window.scrollTo({top:tab==='race'?0:document.querySelector('.instrument').getBoundingClientRect().top+scrollY-14,behavior:state.reduced?'auto':'smooth'});}
function play(){if(state.time>=data.window.duration)state.time=0;state.playing=!state.playing;invalidate();}
function updateUI(){
 const d=selected(),s=snapshot(d,state.time),other=snapshot(data.drivers.find(x=>x.number===state.compare),state.time);
 document.documentElement.style.setProperty('--driver-color',d.color||'#d1e3eb');
 $('driver').value=String(d.number);$('compare').value=String(state.compare);
 for(const option of $('compare').options)option.disabled=Number(option.value)===d.number||!data.drivers.find(x=>x.number===Number(option.value))?.available;
 value('driver-number',String(d.number).padStart(2,'0'));value('driver-name',titleCase(d.name));value('driver-team',d.team);value('driver-position',s.position?'P'+s.position:'P—');
 value('race-speed',display(s.speed));value('race-gear',s.gear===0?'N':display(s.gear));value('race-gap',formatGap(s.gap,s.position));value('race-gap-age',s.gap&&s.position!==1?`${(state.time-s.gap[0]).toFixed(1)}s old`:'');
 value('race-lap',s.lap?`${s.lap.number} / 53`:'—');value('race-tyre',s.stint?titleCase(s.stint.compound):'—');value('race-last-lap',lapTime(lastCompletedLap(d,state.time)?.duration));
 const ageText=s.usable?`Recorded sample ${sec(s.age)} before cursor`:'Telemetry unavailable or stale — no values synthesized';
 value('race-age',ageText);value('lab-age',ageText);
 value('lab-speed',display(s.speed));value('compare-speed',`${other.driver.code} ${display(other.speed)} km/h`);
 value('lab-throttle',s.throttle===null?'—':s.throttle+'%');$('throttle-meter').style.width=(s.throttle??0)+'%';
 value('lab-brake',s.brake===null?'—':s.brake?'On':'Off');value('lab-gear',s.gear===0?'N':display(s.gear));value('lab-rpm',display(s.rpm));
 value('trace-driver',d.code);value('trace-compare',other.driver.code);
 value('elapsed',formatTime(state.time));value('compact-elapsed',formatTime(state.time));
 for(const id of ['seek','compact-seek']){$(id).value=String(state.time);$(id).setAttribute('aria-valuetext',`${formatTime(state.time)} of two minutes`);}
 const icon=state.playing?'<svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor"><path d="M7 5h4v14H7zm7 0h4v14h-4z"/></svg>':'<svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor"><path d="M8 5l12 7-12 7z"/></svg>';
 for(const id of ['play','compact-play']){$(id).setAttribute('aria-label',state.playing?'Pause replay':'Play replay');$(id).innerHTML=icon;}
 value('paused-state',state.playing?'PLAYING':'PAUSED');
 const utc=new Date(Date.parse(data.window.start)+state.time*1000).toISOString().slice(11,19);value('clock',utc+' UTC');
 const order=standings(data.drivers,state.time),leader=order.find(x=>x.position===1&&x.driver.available);value('lap-number',leader?.lap?.number??s.lap?.number??'—');
 const list=$('timing-rows'),focused=document.activeElement,restoreFocus=list.contains(focused);
 for(const [i,entry] of order.entries()){
  const {driver,position,gap}=entry,node=rowNodes.get(driver.number);
  node.classList.toggle('selected',driver.number===state.selected);node.setAttribute('aria-pressed',String(driver.number===state.selected));
  node.querySelector('.timing-rank').textContent=display(position);node.querySelector('.timing-gap-value').textContent=driver.available?formatGap(gap,position):'—';
  node.querySelector('.timing-age').textContent=!driver.available?'stationary stream':gap?`${Math.max(0,state.time-gap[0]).toFixed(1)}s old`:'no gap sample';
  // DOM, visual and keyboard order must agree; don't move unchanged nodes.
  if(list.children[i]!==node)list.insertBefore(node,list.children[i]||null);
 }
 if(restoreFocus&&document.activeElement!==focused)focused.focus({preventScroll:true});
 drawChart(d,other.driver);
 value('camera-title',state.camera==='overview'?'The whole field':state.camera==='follow'?`Following ${d.code}`:`${d.code} + ${battlePartner()?.code??'field'}`);
 state.needsUI=false;
}
function drawChart(d,compare){
 const x=t=>Math.max(0,Math.min(300,t/120*300)),y=v=>125-Math.max(0,Math.min(360,v))/360*120;
 const path=driver=>{let started=false,result='';for(const r of driver.telemetry){if(r[0]<0||r[0]>120)continue;if(r[1]===null||r[1]<0||r[1]>400){started=false;continue;}result+=(started?'L':'M')+x(r[0]).toFixed(2)+','+y(r[1]).toFixed(2);started=true;}return result;};
 const s=snapshot(d,state.time),currentX=x(state.time);
 $('speed-chart').innerHTML=`<path d="M0 5H300M0 65H300M0 125H300" fill="none" stroke="#31444b" stroke-width=".6"/><path d="${path(compare)}" fill="none" stroke="#a9c7d5" stroke-width="1.1" opacity=".7"/><path d="${path(d)}" fill="none" stroke="${d.color}" stroke-width="1.6"/><path d="M${currentX} 0V128" stroke="#d2e4ec" stroke-width=".8" stroke-dasharray="2 3"/>${s.speed===null?'':`<circle cx="${currentX}" cy="${y(s.speed)}" r="3" fill="#f0f5f5" stroke="${d.color}" stroke-width="1.5"/>`}`;
 $('speed-chart').dataset.time=String(state.time);$('speed-chart').setAttribute('aria-valuenow',state.time.toFixed(2));$('speed-chart').setAttribute('aria-valuetext',`${formatTime(state.time)} of two minutes`);
}
function battlePartner(){
 const all=standings(data.drivers,state.time).filter(x=>x.driver.available&&x.driver.number!==state.selected),mine=snapshot(selected(),state.time);
 return (all.find(x=>x.position===(mine.position===1?2:mine.position-1))||all[0])?.driver;
}
function routePoint(phase){
 const distance=((phase%1)+1)%1*track.length,a=track.lengths;let lo=0,hi=a.length-1;
 while(lo+1<hi){const mid=(lo+hi)>>>1;if(a[mid]<=distance)lo=mid;else hi=mid;}
 const f=(distance-a[lo])/(a[lo+1]-a[lo]||1),p=track.points[lo],q=track.points[(lo+1)%track.points.length];
 return new THREE.Vector3().fromArray(p).lerp(new THREE.Vector3().fromArray(q),f);
}
function carPosition(driver){const r=routeAt(driver.route||[],state.time);return r?routePoint(r.phase):null;}
function cameraGoal(){
 if(state.camera==='overview')return {target:new THREE.Vector3(0,.3,0),position:new THREE.Vector3(88,102,125),zoom:1};
 const p=carPosition(selected())||new THREE.Vector3();
 if(state.camera==='battle'){
  const partner=battlePartner(),q=partner?carPosition(partner):p,centre=p.clone().add(q||p).multiplyScalar(.5),distance=p.distanceTo(q||p);
  return {target:centre,position:centre.clone().add(new THREE.Vector3(19,25,26)),zoom:THREE.MathUtils.clamp(136/(distance*1.6+19),1,6)};
 }
 const r=routeAt(selected().route,state.time),ahead=r?routePoint(r.phase+.001):p.clone().add(new THREE.Vector3(1,0,0)),direction=ahead.sub(p).normalize();
 return {target:p,position:p.clone().add(direction.multiplyScalar(-15)).add(new THREE.Vector3(8,15,12)),zoom:5};
}
function setCamera(mode){state.camera=mode;document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.camera===mode));resetCamera();invalidate();}
function resetCamera(){
 const goal=cameraGoal();
 if(state.reduced){camera.position.copy(goal.position);controls.target.copy(goal.target);camera.zoom=goal.zoom;camera.updateProjectionMatrix();tween=null;}
 else tween={start:performance.now(),position:camera.position.clone(),target:controls.target.clone(),zoom:camera.zoom};
 invalidate();
}
function animateCamera(now,dt){
 if(tween){const p=Math.min(1,(now-tween.start)/800),e=p*p*(3-2*p),goal=cameraGoal();camera.position.copy(tween.position).lerp(goal.position,e);controls.target.copy(tween.target).lerp(goal.target,e);camera.zoom=THREE.MathUtils.lerp(tween.zoom,goal.zoom,e);camera.updateProjectionMatrix();if(p===1)tween=null;return true;}
 if(state.camera!=='overview'){
  const goal=cameraGoal(),factor=state.reduced?1:1-Math.exp(-dt*14),target=controls.target.clone().lerp(goal.target,factor),delta=target.clone().sub(controls.target);let moved=false;
  if(state.camera==='battle'&&Math.abs(camera.zoom-goal.zoom)>.0001){camera.zoom=THREE.MathUtils.lerp(camera.zoom,goal.zoom,factor);camera.updateProjectionMatrix();moved=true;}
  if(delta.lengthSq()>.000001){camera.position.add(delta);controls.target.copy(target);moved=true;}return moved;
 }
 return false;
}
function carModel(color){
 const group=new THREE.Group(),paint=new THREE.MeshStandardMaterial({color,roughness:.29,metalness:.18}),carbon=new THREE.MeshStandardMaterial({color:'#192327',roughness:.72}),tire=new THREE.MeshStandardMaterial({color:'#151b1d',roughness:.9}),silver=new THREE.MeshStandardMaterial({color:'#aebdc0',metalness:.65,roughness:.35});
 const box=(size,pos,mat)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
 box([1.22,.15,.40],[0,.22,0],paint);box([.67,.14,.24],[.55,.18,0],paint);box([.64,.13,.25],[-.26,.35,0],paint);box([.38,.055,.24],[.03,.39,0],carbon);
 box([.18,.045,1.05],[.91,.13,0],carbon);box([.22,.055,.91],[-.77,.46,0],paint);box([.045,.23,.08],[-.77,.33,0],carbon);
 const wheelGeo=new THREE.CylinderGeometry(.165,.165,.15,12);wheelGeo.rotateX(Math.PI/2);
 for(const x of [-.52,.57])for(const z of [-.39,.39]){const wheel=new THREE.Mesh(wheelGeo,tire);wheel.position.set(x,.165,z);wheel.castShadow=true;group.add(wheel);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.156,10),silver);hub.rotation.x=Math.PI/2;hub.position.copy(wheel.position);group.add(hub);}
 const halo=new THREE.Mesh(new THREE.TorusGeometry(.14,.023,5,14),carbon);halo.rotation.x=Math.PI/2;halo.position.set(.08,.47,0);group.add(halo);
 // Generic static rear detail. F1 rear lamps are NOT brake lights.
 const rear=new THREE.Mesh(new THREE.BoxGeometry(.025,.045,.11),new THREE.MeshStandardMaterial({color:'#713b33',roughness:.7}));rear.position.set(-.81,.26,0);group.add(rear);
 return group;
}
async function initWorld(){
 scene=new THREE.Scene();scene.background=new THREE.Color('#101719');
 renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#101719');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 camera=new THREE.OrthographicCamera(-68,68,50,-50,.1,700);camera.position.set(88,102,125);
 controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.3,0);controls.enableDamping=!state.reduced;controls.dampingFactor=.09;controls.minZoom=.75;controls.maxZoom=12;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI/2-.05;controls.maxDistance=300;controls.update();
 controls.addEventListener('start',()=>{tween=null;});controls.addEventListener('change',()=>{state.dirty=true;});
 const hemi=new THREE.HemisphereLight('#d8e8ef','#26332b',2.1);scene.add(hemi);
 const key=new THREE.DirectionalLight('#e8edf0',3.1);key.position.set(-40,90,35);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-85,right:85,top:75,bottom:-75,near:1,far:220});key.shadow.bias=-.00015;key.shadow.normalBias=.08;key.shadow.radius=3;scene.add(key);
 const fill=new THREE.DirectionalLight('#b6d8ed',.75);fill.position.set(55,25,-35);scene.add(fill);
 const gltf=await new GLTFLoader().loadAsync('./data/suzuka-world.glb');model=gltf.scene;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(model);
 for(const d of data.drivers){if(!d.available)continue;const actor=carModel(d.color||'#c0d5df');actor.scale.setScalar(1.4);actor.userData.driver=d.number;actors.set(d.number,actor);scene.add(actor);const dot=document.createElement('i');dot.className='field-dot';dot.style.background=d.color||'#bfdbe8';$('field-markers').append(dot);dots.set(d.number,dot);}
 ring=new THREE.Mesh(new THREE.RingGeometry(1.06,1.11,48),new THREE.MeshBasicMaterial({color:'#c2dfef',side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;scene.add(ring);
 partnerRing=new THREE.Mesh(ring.geometry,new THREE.MeshBasicMaterial({color:'#8daebd',side:THREE.DoubleSide,depthWrite:false}));partnerRing.rotation.x=-Math.PI/2;partnerRing.visible=false;scene.add(partnerRing);
 const resize=()=>{const {width,height}=$('viewport').getBoundingClientRect();if(!width||!height)return;const aspect=width/height,vertical=Math.max(91,136/aspect);camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();renderer.setSize(width,height,false);state.dirty=true;};
 new ResizeObserver(resize).observe($('viewport'));resize();
 let down=null;
 $('scene').addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});
 $('scene').addEventListener('pointerup',e=>{if(!down||Math.hypot(down.x-e.clientX,down.y-e.clientY)>5)return;const rect=$('scene').getBoundingClientRect();let best=null,distance=22;for(const [n,a]of actors){if(!a.visible)continue;const v=a.position.clone().project(camera);if(v.z>1||v.z< -1)continue;const x=rect.left+(v.x+1)*rect.width/2,y=rect.top+(1-v.y)*rect.height/2,d=Math.hypot(x-e.clientX,y-e.clientY);if(d<distance){distance=d;best=n;}}if(best!==null)choose(best);});
 $('scene').addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['f','o','b','escape',' '].includes(key)){e.preventDefault();if(key===' ')play();else setCamera(key==='f'?'follow':key==='b'?'battle':'overview');}});
 $('scene').setAttribute('aria-keyshortcuts','F O B Space');
}
function updateActors(){
 for(const d of data.drivers){const actor=actors.get(d.number);if(!actor)continue;const r=routeAt(d.route,state.time);actor.visible=!!r;if(!r)continue;const point=routePoint(r.phase),a=routePoint(r.phase-.0005),b=routePoint(r.phase+.0005);actor.position.copy(point);actor.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);}
 const actor=actors.get(state.selected);ring.visible=!!actor?.visible;if(ring.visible){ring.position.copy(actor.position);ring.position.y+=.025;}
 const partner=state.camera==='battle'?battlePartner():null,second=partner?actors.get(partner.number):null;partnerRing.visible=!!second?.visible;
 if(partnerRing.visible){partnerRing.position.copy(second.position);partnerRing.position.y+=.025;}
}
function positionLabel(){
 const bounds=$('viewport').getBoundingClientRect();
 for(const [n,mesh]of actors){const dot=dots.get(n),v=mesh.position.clone().add(new THREE.Vector3(0,.7,0)).project(camera),x=(v.x+1)*bounds.width/2,y=(1-v.y)*bounds.height/2;dot.hidden=state.camera!=='overview'||!mesh.visible||v.z>1||v.z< -1||x<0||x>bounds.width||y<0||y>bounds.height;dot.style.transform=`translate(${x-3}px,${y-3}px)`;}
 function place(label,driver){
  const actor=driver?actors.get(driver.number):null;if(!actor?.visible){label.hidden=true;return null;}
  const v=actor.position.clone().add(new THREE.Vector3(0,.8,0)).project(camera),x=(v.x+1)*bounds.width/2,y=(1-v.y)*bounds.height/2;
  label.hidden=v.z>1||v.z< -1||x<0||x>bounds.width||y<0||y>bounds.height;if(label.hidden)return null;
  label.textContent=driver.code;const w=label.offsetWidth,h=label.offsetHeight,left=THREE.MathUtils.clamp(x-w/2,3,bounds.width-w-3),top=THREE.MathUtils.clamp(y-h-8,4,bounds.height-h-4);
  label.style.left=left+'px';label.style.top=top+'px';return {left,top,w,h,x,y};
 }
 const first=place($('car-label'),selected()),secondLabel=$('battle-label');
 const second=place(secondLabel,state.camera==='battle'?battlePartner():null);
 if(first&&second){
  const overlaps=()=>first.left<second.left+second.w+8&&first.left+first.w+8>second.left&&first.top<second.top+second.h+6&&first.top+first.h+6>second.top;
  if(overlaps())second.top=THREE.MathUtils.clamp(second.y+12,4,bounds.height-second.h-4);
  if(overlaps())second.left=THREE.MathUtils.clamp(first.left>bounds.width/2?first.left-second.w-10:first.left+first.w+10,3,bounds.width-second.w-3);
  secondLabel.style.left=second.left+'px';secondLabel.style.top=second.top+'px';
 }
}
function buildControls(){
 for(const d of data.drivers){for(const id of ['driver','compare']){const o=document.createElement('option');o.value=String(d.number);o.textContent=d.available?`${d.code} · ${titleCase(d.name.split(' ')[0])}`:`${d.code} — stationary`;o.disabled=!d.available;$(id).append(o);}
  const button=document.createElement('button');button.className='timing-row';button.style.setProperty('--team',d.color||'#8eacb4');button.disabled=!d.available;button.setAttribute('aria-label',`Select ${titleCase(d.name)}${d.available?'':' — stationary stream'}`);button.innerHTML=`<span class="timing-rank"></span><span class="timing-code">${d.code}</span><span class="timing-gap"><span class="timing-gap-value"></span><span class="timing-age"></span></span>`;button.onclick=()=>choose(d.number);$('timing-rows').append(button);rowNodes.set(d.number,button);
 }
 $('timing-rows').style.display='flex';$('timing-rows').style.flexDirection='column';
 $('driver').onchange=e=>choose(e.target.value);$('compare').onchange=e=>{const candidate=Number(e.target.value);if(candidate!==state.selected&&data.drivers.some(d=>d.number===candidate&&d.available))state.compare=candidate;else e.target.value=String(state.compare);invalidate();};
 for(const id of ['play','compact-play'])$(id).onclick=play;for(const id of ['seek','compact-seek'])$(id).oninput=e=>seek(e.target.value);$('speed').onchange=e=>{state.speed=Number(e.target.value);invalidate();};
 document.querySelectorAll('button[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>setCamera(b.dataset.camera));$('reset-camera').onclick=resetCamera;$('open-lab').onclick=()=>{setTab('lab');document.querySelector('[data-tab="lab"]').focus();};
 document.querySelector('.tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=['race','timing','lab'],i=tabs.indexOf(state.tab),next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;setTab(tabs[next]);$('tab-'+tabs[next]).focus({preventScroll:true});});
 $('speed-chart').addEventListener('click',e=>{const rect=$('speed-chart').getBoundingClientRect();seek((e.clientX-rect.left)/rect.width*120);});
 $('speed-chart').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();seek(e.key==='Home'?0:e.key==='End'?120:state.time+(e.key==='ArrowRight'?1:-1));}});
 const motionUpdate=()=>{state.reduced=motion.matches;if(state.reduced){state.playing=false;tween=null;}if(controls)controls.enableDamping=!state.reduced;value('motion-note',state.reduced?'Reduced motion: cameras cut directly. Replay starts paused; Play enables car movement.':'Replay starts paused. Camera transitions take 800 ms; reduced motion is supported.');invalidate();};
 motion.addEventListener('change',motionUpdate);motionUpdate();
 document.addEventListener('visibilitychange',()=>{if(document.hidden){state.playing=false;invalidate();}});
}
async function start(){
 try{
  const responses=await Promise.all([fetch('./data/playback.json'),fetch('./data/track.json')]);if(responses.some(r=>!r.ok))throw new Error('Historical fixture missing.');[data,track]=await Promise.all(responses.map(r=>r.json()));
  $('app').hidden=false;buildControls();value('moving-count',data.drivers.filter(d=>d.available).length);
  await initWorld();$('load-state').hidden=true;
  window.__replay={state,data,track,actors,snapshot:()=>snapshot(selected(),state.time),seek,choose,setCamera,setTab,get camera(){return camera;},get renderer(){return renderer;},routePoint};
  let previous=performance.now(),lastUI=0;
  function frame(now){requestAnimationFrame(frame);const dt=Math.min(.25,(now-previous)/1000);previous=now;if(document.hidden)return;
   if(state.playing){state.time=advance(state.time,dt,state.speed,data.window.duration);if(state.time>=data.window.duration){state.playing=false;state.needsUI=true;}state.dirty=true;if(now-lastUI>95)state.needsUI=true;}
   if(state.needsUI){updateUI();lastUI=now;}
   if(state.dirty)updateActors();const moved=animateCamera(now,dt),controlled=controls.update();
   if(state.dirty||moved||controlled){positionLabel();renderer.render(scene,camera);state.dirty=false;}
  }
  updateUI();updateActors();renderer.render(scene,camera);requestAnimationFrame(frame);
 }catch(error){console.error(error);$('load-state').hidden=false;$('load-state').classList.add('error');$('load-state').textContent='Replay could not start. Use the local HTTP server and a browser with WebGL 2. '+error.message;}
}
start();
