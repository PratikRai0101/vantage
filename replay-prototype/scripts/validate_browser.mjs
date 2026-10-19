import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE||'/Users/pratikrai/.pi/agent/skills/app-designer/package.json');
const {chromium}=require('playwright-core');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const base=process.env.REPLAY_URL||'http://127.0.0.1:8765/replay-prototype/';
const out='shots/replay';fs.mkdirSync(out,{recursive:true});
const errors=[],requests=[],results=[];
async function page(options={}){const p=await browser.newPage(options);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)requests.push({url:r.url(),status:r.status()});});await p.goto(base,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__replay&&document.getElementById('load-state').hidden,{timeout:30000});await p.evaluate(()=>document.fonts.ready);return p;}
async function seek(p,t){const actual=await p.locator('#seek').evaluate((e,t)=>{e.value=t;e.dispatchEvent(new Event('input',{bubbles:true}));return Number(e.value);},t);await p.waitForFunction(t=>window.__replay.state.time===t&&!window.__replay.state.needsUI,actual);return actual;}
async function settled(p){await p.waitForTimeout(1050);}
async function unobstructed(p,selector){
 const blocked=await p.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect(),points=[[.5,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75]];return points.map(([x,y])=>{const px=r.left+r.width*x,py=r.top+r.height*y,hit=document.elementFromPoint(px,py);return {x:px,y:py,ok:!!hit&&(hit===e||e.contains(hit)),hit:hit?.tagName};}).filter(p=>!p.ok);});
 assert.deepEqual(blocked,[],`${selector} has covered hit targets`);
}
async function sync(p){const r=await p.evaluate(()=>{const r=window.__replay,s=r.snapshot(),a=r.actors.get(r.state.selected);return {time:r.state.time,chartTime:Number(document.getElementById('speed-chart').dataset.time),value:document.getElementById('race-speed').textContent,expected:String(s.speed??'—'),positionError:a.position.distanceTo(r.routePoint(s.route.phase)),sampleTime:s.sampleTime,speedText:document.getElementById('lab-speed').textContent};});assert.equal(r.value,r.expected);assert.equal(r.speedText,r.expected);assert.equal(r.time,r.chartTime);assert.ok(r.positionError<1e-7);assert.ok(r.sampleTime<=r.time);return r;}
try{
 const p=await page({viewport:{width:1240,height:1000},deviceScaleFactor:2});
 assert.equal(await p.evaluate(()=>window.__replay.state.playing),false);
 assert.equal(await p.evaluate(()=>window.__replay.actors.size),17);
 await sync(p);await p.screenshot({path:out+'/desktop-overview.png',fullPage:true});
 const before=await p.evaluate(()=>window.__replay.actors.get(4).position.toArray());
 await p.locator('#play').click();await p.waitForFunction(()=>window.__replay.state.time>.65);await p.locator('#play').click();
 const movement=await p.evaluate(v=>window.__replay.actors.get(4).position.distanceTo({x:v[0],y:v[1],z:v[2]}),before);assert.ok(movement>.1,'Car did not move');
 await p.locator('#speed').selectOption('4');assert.equal(await p.evaluate(()=>window.__replay.state.speed),4);
 await seek(p,42.25);await sync(p);
 await p.locator('[data-camera=follow]').click();await settled(p);assert.ok(await p.evaluate(()=>Math.abs(window.__replay.camera.zoom-5)<.01));
 await p.locator('#driver').selectOption('16');await settled(p);assert.equal(await p.evaluate(()=>window.__replay.state.time),42.25);await sync(p);
 await p.getByRole('tab',{name:'Lab',exact:true}).click();await p.locator('#compare').selectOption('4');await p.waitForFunction(()=>!window.__replay.state.needsUI);await sync(p);
 assert.equal(await p.locator('#compare option[value="16"]').evaluate(e=>e.disabled),true);
 await p.locator('#compare').evaluate(e=>{e.value='16';e.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForFunction(()=>!window.__replay.state.needsUI);assert.equal(await p.evaluate(()=>window.__replay.state.compare),4);
 assert.ok(['On','Off'].includes(await p.locator('#lab-brake').textContent()));
 await p.locator('#speed-chart').focus();await p.keyboard.press('End');await p.waitForFunction(()=>window.__replay.state.time===120&&!window.__replay.state.needsUI);await sync(p);
 await p.keyboard.press('ArrowLeft');await p.waitForFunction(()=>window.__replay.state.time===119&&!window.__replay.state.needsUI);await sync(p);
 await p.locator('#speed-chart').click({position:{x:150,y:60}});await p.waitForFunction(()=>!window.__replay.state.needsUI);let chartTime=await p.evaluate(()=>window.__replay.state.time);assert.ok(chartTime>40&&chartTime<80);await sync(p);
 await p.getByRole('tab',{name:'Timing',exact:true}).click();assert.equal(await p.locator('.timing-row').count(),20);assert.equal(await p.locator('.timing-row:disabled').count(),3);
 const ranks=await p.locator('.timing-rank').allTextContents();assert.deepEqual(ranks.map(Number),ranks.map(Number).sort((a,b)=>a-b));
 const nextCode=await p.locator('.timing-row:not(:disabled) .timing-code').nth(1).textContent();await p.locator('.timing-row:not(:disabled)').first().focus();await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.querySelector('.timing-code')?.textContent),nextCode);
 await p.getByRole('button',{name:'Select Logan Sargeant',exact:true}).focus();await seek(p,70);assert.equal(await p.evaluate(()=>document.activeElement.querySelector('.timing-code')?.textContent),'SAR');chartTime=await seek(p,chartTime);
 await p.getByRole('button',{name:'Select Lando Norris',exact:true}).click();await p.waitForFunction(()=>window.__replay.state.selected===4&&!window.__replay.state.needsUI);assert.equal(await p.evaluate(()=>window.__replay.state.time),chartTime);
 await seek(p,47.5);await p.locator('[data-camera=battle]').click();await settled(p);assert.equal(await p.evaluate(()=>window.__replay.state.camera),'battle');
 assert.equal(await p.locator('#battle-label').isVisible(),true);assert.notEqual(await p.locator('#car-label').textContent(),await p.locator('#battle-label').textContent());
 const labelOverlap=await p.evaluate(()=>{const a=document.getElementById('car-label').getBoundingClientRect(),b=document.getElementById('battle-label').getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;});assert.equal(labelOverlap,false);
 await p.screenshot({path:out+'/desktop-battle.png',fullPage:true});
 await p.getByRole('tab',{name:'Race',exact:true}).click();await p.locator('[data-camera=overview]').click();await settled(p);
 const cameraBefore=await p.evaluate(()=>window.__replay.camera.position.toArray());const canvas=await p.locator('#scene').boundingBox();await p.mouse.move(canvas.x+canvas.width*.4,canvas.y+canvas.height*.5);await p.mouse.down();await p.mouse.move(canvas.x+canvas.width*.6,canvas.y+canvas.height*.55,{steps:10});await p.mouse.up();await p.waitForTimeout(500);
 assert.ok(await p.evaluate(v=>window.__replay.camera.position.distanceTo({x:v[0],y:v[1],z:v[2]})>1,cameraBefore),'Orbit did not change camera');assert.equal(await p.evaluate(()=>window.__replay.state.time),47.5);
 await p.emulateMedia({reducedMotion:'reduce'});await p.locator('[data-camera=follow]').click();await p.waitForFunction(()=>!window.__replay.state.needsUI);assert.equal(await p.evaluate(()=>window.__replay.camera.zoom),5);assert.equal(await p.evaluate(()=>window.__replay.state.playing),false);
 await p.getByRole('tab',{name:'Race',exact:true}).focus();await p.keyboard.press('ArrowRight');assert.equal(await p.getByRole('tab',{name:'Timing',exact:true}).getAttribute('aria-selected'),'true');
 await seek(p,119.8);await p.locator('#play').click();await p.waitForFunction(()=>window.__replay.state.time===120&&!window.__replay.state.needsUI);assert.equal(await p.locator('#play').getAttribute('aria-label'),'Play replay');assert.equal(await p.locator('#elapsed').textContent(),'02:00.0');
 results.push({test:'desktop interactions',movingActors:17,allRecords:20,stationaryStreams:3,movement,sharedClock:true,cameras:['overview','follow','battle'],orbit:true,keyboardTabs:true,keyboardChart:true,endState:true,reducedMotion:true});await p.close();
 for(const {width,height} of [{width:768,height:1024},{width:402,height:874},{width:375,height:667},{width:320,height:874},{width:320,height:568}]){
  const label=width+(height===568?'-short':'');
  const p=await page({viewport:{width,height},deviceScaleFactor:width===402?3:2,isMobile:width<760,hasTouch:width<760});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow at ${width}`);
  await seek(p,47.5);await sync(p);
  for(const selector of ['#seek','#play','#speed','[data-camera=overview]','[data-camera=follow]','[data-camera=battle]'])await unobstructed(p,selector);
  await p.screenshot({path:`${out}/${label}-race.png`,fullPage:false});
  await p.screenshot({path:`${out}/${label}-race-full.png`,fullPage:true});
  await p.locator('[data-camera=follow]').click();await settled(p);await p.screenshot({path:`${out}/${label}-follow.png`,fullPage:false});
  await p.getByRole('tab',{name:'Lab',exact:true}).click();await p.waitForTimeout(650);await sync(p);
  if(width<760){assert.equal(await p.locator('#compact-play').isVisible(),true);await p.locator('#compact-seek').evaluate(e=>{e.value=62.5;e.dispatchEvent(new Event('input',{bubbles:true}));});await p.waitForFunction(()=>window.__replay.state.time===62.5&&!window.__replay.state.needsUI);await sync(p);}
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.screenshot({path:`${out}/${label}-lab.png`,fullPage:false});
  await p.getByRole('tab',{name:'Timing',exact:true}).click();await p.waitForTimeout(650);await p.screenshot({path:`${out}/${label}-timing.png`,fullPage:false});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const tinyTargets=await p.evaluate(()=>[...document.querySelectorAll('button,select,input[type=range],summary')].filter(e=>e.getBoundingClientRect().height&&getComputedStyle(e).visibility!=='hidden'&&e.getBoundingClientRect().height<43.8).map(e=>({id:e.id,tag:e.tagName,height:e.getBoundingClientRect().height})));
  assert.equal(tinyTargets.length,0,JSON.stringify(tinyTargets));
  const clipping=await p.evaluate(()=>[...document.querySelectorAll('h1,h2,.source-line,.driver-heading,.driver-selector,.section-heading')].filter(e=>e.getBoundingClientRect().width&&e.scrollWidth>e.clientWidth+1).map(e=>e.className||e.tagName));assert.deepEqual(clipping,[]);
  results.push({width,height,horizontalOverflow:false,targetMinimum44:true,transportHitTest:true,allTabs:true,sharedClock:true,headingClipping:false});await p.close();
 }
 const rp=await page({viewport:{width:390,height:844},reducedMotion:'reduce'});assert.equal(await rp.evaluate(()=>window.__replay.state.reduced),true);assert.equal(await rp.evaluate(()=>window.__replay.state.playing),false);await rp.close();
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 fs.writeFileSync(out+'/validation.json',JSON.stringify({passed:true,results,errors,failedRequests:requests,platform:'macOS Chrome headless; responsive emulation, not native iOS/Android performance'},null,2));console.log(JSON.stringify({passed:true,results,errors,failedRequests:requests},null,2));
}finally{await browser.close();}
