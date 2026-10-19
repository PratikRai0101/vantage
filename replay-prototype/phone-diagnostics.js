import {summarizeFrames} from './frame-stats.mjs';
// Explicitly opt-in; no analytics, third-party requests, storage or hidden recording.
const params=new URL(location.href).searchParams;
const panel=document.createElement('section');panel.id='phone-test';
panel.innerHTML=`<style>#phone-test{margin:28px 0 12px;border-top:1px solid #35444b;padding-top:20px}#phone-test h2{font-size:22px;margin-bottom:12px}#phone-test p{color:#a8bbc1;font-size:12px;line-height:1.7;margin:10px 0}#phone-test label{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:12px;margin:12px 0}#phone-test button,#phone-test select{min-height:44px;padding:8px 12px;background:#203139;color:#deedf3;border:1px solid #49616b;border-radius:6px;font-size:12px}#phone-test .actions{display:flex;gap:10px;flex-wrap:wrap}#phone-test pre{font:10px/1.7 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;color:#bbd0da;margin:16px 0}#phone-test [role=status]{color:#d5e7ed}#phone-test ol{padding-left:20px;color:#a8bbc1;font-size:12px;line-height:1.8}</style><h2>Phone test · opt-in</h2><p>This measures JavaScript animation scheduling during three six-second replay workloads. It is <b>not GPU presentation timing, thermals, native-app performance or proof of a physical device</b>. No third-party analytics. With a private test URL, running the sample saves its report to this same-origin test server; otherwise use Download report.</p><label>Test environment<select id="test-environment"><option value="unverified">Unverified</option><option value="physical-phone">Physical phone — user declared</option><option value="simulator">Simulator</option><option value="desktop">Desktop browser</option></select></label><div class="actions"><button id="test-run" disabled>Run 3-camera sample</button><button id="test-export" disabled>Download report</button></div><p id="test-status" role="status">Waiting for the replay…</p><pre id="test-results"></pre><p>Manual feel check, separate from the automated sample:</p><ol><li>Play; switch All cars → Follow → Battle.</li><li>Orbit and pinch. Check that the selected car stays anchored.</li><li>Scrub backward and forward; inspect Timing and Lab.</li><li>Try portrait/landscape and Safari’s expanded/collapsed bars.</li><li>Note missed taps, judder, heat and battery mode. A simulator cannot answer these hardware questions.</li></ol>`;
document.querySelector('main').append(panel);
const $=id=>document.getElementById(id),environment=$('test-environment');
if(['simulator','desktop'].includes(params.get('environment')))environment.value=params.get('environment');
let report=null,running=false,invalidReason=null;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const afterPaint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const errors=[],touches={touch:0,mouse:0,pen:0};
addEventListener('error',e=>errors.push(String(e.message).slice(0,300)));
addEventListener('unhandledrejection',e=>errors.push(String(e.reason).slice(0,300)));
document.addEventListener('visibilitychange',()=>{if(running&&document.hidden)invalidReason='Page was backgrounded; rerun in the foreground.';});
addEventListener('pointerdown',e=>{if(e.pointerType in touches)touches[e.pointerType]++;if(running)invalidReason='User interaction interrupted the sample.';},{passive:true});
addEventListener('wheel',()=>{if(running)invalidReason='User interaction interrupted the sample.';},{passive:true});
addEventListener('keydown',()=>{if(running)invalidReason='User interaction interrupted the sample.';});
function deviceInfo(){
 return {declaredEnvironment:environment.value,physicalDeviceVerified:false,
  userAgent:navigator.userAgent,platform:navigator.platform,hardwareConcurrency:navigator.hardwareConcurrency??null,
  viewport:{width:innerWidth,height:innerHeight,visualHeight:visualViewport?.height??null},
  screen:{width:screen.width,height:screen.height},devicePixelRatio,
  effectiveRenderPixelRatio:window.__replay?.renderer.getPixelRatio()??null,
  reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches,
  webgl2:!!window.__replay?.renderer.getContext(),visibility:document.visibilityState};
}
function controlsClear(){
 // Check only in-viewport controls. Offscreen controls require scrolling, not a pass.
 return ['#play','#seek','#speed','[data-camera=overview]','[data-camera=follow]','[data-camera=battle]'].map(selector=>{
  const el=document.querySelector(selector),r=el.getBoundingClientRect();
  if(r.top<0||r.bottom>innerHeight)return {selector,inViewport:false,clear:null};
  const points=[[.5,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75]];
  return {selector,inViewport:true,clear:points.every(([x,y])=>{const hit=document.elementFromPoint(r.left+r.width*x,r.top+r.height*y);return hit===el||el.contains(hit);})};
 });
}
async function sample(mode){
 const replay=window.__replay;
 replay.setCamera(mode);replay.seek(30);replay.state.speed=1;replay.state.playing=true;replay.state.needsUI=true;
 await delay(1100); // warm camera cut/transition, not a cold-start or transition benchmark
 const start=performance.now(),startTime=replay.state.time,dimensions=[innerWidth,innerHeight];
 let last=null;const intervals=[],calls=[],triangles=[];
 await new Promise((resolve,reject)=>{
  function tick(now){
   if(invalidReason||document.hidden)return reject(new Error(invalidReason||'Invalid sample: page was backgrounded.'));
   if(innerWidth!==dimensions[0]||innerHeight!==dimensions[1])return reject(new Error('Invalid sample: viewport changed; rerun after browser bars settle.'));
   if(!replay.state.playing)return reject(new Error('Invalid sample: playback interrupted.'));
   if(last!==null)intervals.push(now-last);last=now;
   calls.push(replay.renderer.info.render.calls);triangles.push(replay.renderer.info.render.triangles);
   if(now-start>=6000)resolve();else requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
 });
 const wallSeconds=(performance.now()-start)/1000,endTime=replay.state.time;
 replay.state.playing=false;replay.state.needsUI=true;
 return {camera:mode,wallSeconds:Number(wallSeconds.toFixed(3)),replaySeconds:Number((endTime-startTime).toFixed(3)),
  clockToWallRatio:Number(((endTime-startTime)/wallSeconds).toFixed(3)),raf:summarizeFrames(intervals),
  reportedDrawCalls:{min:Math.min(...calls),max:Math.max(...calls)},reportedTriangles:Math.max(...triangles)};
}
function brief(result){
 const lines=[`Environment: ${result.device.declaredEnvironment} (not hardware-verified)`,...result.samples.map(s=>`${s.camera}: ${s.raf?.observedRafHz??'—'} rAF Hz · p95 ${s.raf?.p95IntervalMs??'—'} ms · clock/wall ${s.clockToWallRatio}`)];
 lines.push(`DOM controls: ${result.controlHitTests.filter(x=>x.clear===true).length} clear / ${result.controlHitTests.filter(x=>x.inViewport).length} visible`);
 if(result.error)lines.push('ERROR: '+result.error);
 lines.push('Scheduling cadence only. No native/GPU/thermal certification.');return lines.join('\n');
}
async function saveToLocalCollector(result){
 const token=params.get('testToken');if(!token)return 'Download report to share it.';
 const res=await fetch('./__test-report',{method:'POST',headers:{'Content-Type':'application/json','X-Phone-Test-Token':token},body:JSON.stringify(result)});
 if(!res.ok)throw new Error(`Local report collector returned ${res.status}`);
 const saved=await res.json();return `Saved locally: ${saved.file}`;
}
async function run(){
 if(running||!window.__replay)return;
 running=true;invalidReason=null;$('test-run').disabled=true;$('test-export').disabled=true;environment.disabled=true;
 const replay=window.__replay,saved={time:replay.state.time,speed:replay.state.speed,driver:replay.state.selected,camera:replay.state.camera,tab:replay.state.tab,scroll:scrollY};
 report={schemaVersion:1,startedAt:new Date().toISOString(),device:deviceInfo(),workload:'Three explicit 6s replay samples after 1.1s camera warmup; no manual gesture claim',samples:[],controlHitTests:[],controlHitTestScope:'DOM only; cannot detect native Safari/system overlays or establish touch usability',errors:[]};
 try{
  replay.setTab('race');scrollTo({top:0,behavior:'instant'});await delay(600);
  report.device=deviceInfo();report.controlHitTests=controlsClear();
  for(const mode of ['overview','follow','battle']){$('test-status').textContent=`Sampling ${mode}… keep this tab foreground and don’t touch the controls.`;report.samples.push(await sample(mode));}
  report.completed=true;
 }catch(error){report.completed=false;report.error=error.message;}
 finally{
  replay.state.playing=false;replay.state.speed=saved.speed;$('speed').value=String(saved.speed);replay.choose(saved.driver);replay.seek(saved.time);replay.setCamera(saved.camera);replay.setTab(saved.tab);
  await afterPaint();scrollTo({top:saved.scroll,behavior:'instant'});report.finishedAt=new Date().toISOString();report.errors=[...errors];report.pointerEvents={...touches};
  report.caveats=['rAF scheduling, not GPU presentation','Physical hardware identity is user-declared and unverified','No thermal/battery/haptic measurement','DOM hit tests cannot detect native browser/system overlays','Only this recorded excerpt; not a live feed test'];
  $('test-results').textContent=brief(report);$('test-status').textContent=report.completed?'Sample complete; replay paused.':'Sample invalid; replay paused. '+report.error;
  try{$('test-status').textContent+=' '+await saveToLocalCollector(report);}catch(e){$('test-status').textContent+=' Export the report; '+e.message;}
  running=false;$('test-run').disabled=false;$('test-export').disabled=false;environment.disabled=false;
 }
}
$('test-run').onclick=run;
$('test-export').onclick=()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='vantage-phone-test.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);};
const deadline=performance.now()+45000;
async function ready(){
 if(window.__replay){$('test-run').disabled=false;$('test-status').textContent='Ready. Choose the correct environment before sampling.';if(params.get('autorun')==='1'&&environment.value==='simulator')await run();return;}
 if(performance.now()>deadline){$('test-status').textContent='Replay did not become ready. '+document.getElementById('load-state').textContent;return;}
 setTimeout(ready,100);
}
ready();
