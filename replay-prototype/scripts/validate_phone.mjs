import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/Users/pratikrai/.pi/agent/skills/app-designer/package.json')('playwright-core');
const printed=process.env.PHONE_TEST_URL||fs.readFileSync('/tmp/vantage-phone-server.log','utf8').split('\n')[0].replace('Private test URL: ','');
const url=new URL(printed);if(url.hostname==='0.0.0.0')url.hostname='127.0.0.1';
const origin=url.origin;
assert.equal((await fetch(origin+'/replay-prototype/')).status,403,'Unauthenticated content must not be exposed');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const errors=[],failures=[];
try{
 const p=await browser.newPage({viewport:{width:402,height:874}});
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)failures.push({path:new URL(r.url()).pathname,status:r.status()});});
 await p.goto(url.href,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.__replay&&!document.getElementById('test-run').disabled);
 await p.locator('#test-environment').selectOption('desktop');await p.locator('#test-run').click();
 await p.waitForFunction(()=>document.getElementById('test-status').textContent.includes('Saved locally:'),{},{timeout:90000});
 const status=await p.locator('#test-status').textContent();const filename=status.match(/phone-test-[\w-]+\.json/)?.[0];assert.ok(filename);
 const report=JSON.parse(fs.readFileSync('shots/phone-tests/'+filename));assert.equal(report.completed,true,report.error);
 assert.equal(report.device.declaredEnvironment,'desktop');assert.equal(report.device.physicalDeviceVerified,false);assert.equal(report.samples.length,3);
 for(const s of report.samples){assert.ok(s.raf.samples>5);assert.ok(s.raf.observedRafHz>0);assert.ok(s.reportedDrawCalls.max>0);assert.ok(s.clockToWallRatio>0);}
 assert.deepEqual(report.errors,[]);assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 assert.equal(await p.evaluate(()=>window.__replay.state.playing),false);assert.equal(await p.evaluate(()=>window.__replay.state.time),0);
 await p.locator('#phone-test').screenshot({path:'shots/phone-tests/desktop-instrumentation.png'});
 // A background/foreground transition invalidates the sample even if rAF resumes later.
 await p.locator('#test-run').click();await p.waitForFunction(()=>document.getElementById('test-status').textContent.includes('Sampling overview'));
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
 await p.waitForFunction(()=>document.getElementById('test-status').textContent.includes('Sample invalid')&&document.getElementById('test-status').textContent.includes('Saved locally:'));
 const invalidStatus=await p.locator('#test-status').textContent(),invalidName=invalidStatus.match(/phone-test-[\w-]+\.json/)?.[0];assert.ok(invalidName);
 const invalid=JSON.parse(fs.readFileSync('shots/phone-tests/'+invalidName));assert.equal(invalid.completed,false);assert.ok(invalid.error.includes('backgrounded'));
 // The collector rejects wrong tokens and static files outside its explicit runtime allowlist.
 const rejects=await p.evaluate(async()=>{
  const report=await fetch('./__test-report',{method:'POST',headers:{'Content-Type':'application/json','X-Phone-Test-Token':'wrong'},body:'{"schemaVersion":1,"samples":[]}'});
  const privateFile=await fetch('/README.md');return [report.status,privateFile.status];
 });assert.deepEqual(rejects,[403,404]);
 const clean=await browser.newPage({viewport:{width:375,height:667}});await clean.goto('http://127.0.0.1:8765/replay-prototype/',{waitUntil:'networkidle'});await clean.waitForFunction(()=>window.__replay);assert.equal(await clean.locator('#phone-test').count(),0);await clean.close();
 fs.writeFileSync('shots/phone-tests/tooling-validation.json',JSON.stringify({passed:true,report:filename,environment:'desktop Chrome, not physical hardware',tests:['opt-in diagnostics only','three workloads complete','no page/resource failures','clock restored paused','backgrounded sample rejected','unauthenticated static access rejected','invalid report token rejected','outside-allowlist path rejected'],errors},null,2));
 console.log(JSON.stringify({passed:true,report:filename,samples:report.samples,physicalDeviceVerified:false},null,2));
}finally{await browser.close();}
