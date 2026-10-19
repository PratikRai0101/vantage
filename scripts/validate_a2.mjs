import {createRequire} from 'node:module';
import{pathToFileURL}from'node:url';import fs from'node:fs';
const{chromium}=createRequire('/Users/pratikrai/.pi/agent/skills/app-designer/package.json')('playwright-core');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results=[];const assert=(x,m)=>{if(!x)throw Error(m)};
const p=await browser.newPage({viewport:{width:1400,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(pathToFileURL(process.cwd()+'/mockup.html').href,{waitUntil:'networkidle'});
assert(await p.locator('.timing-row').count()===22,'Timing tower does not have22 drivers');
await p.locator('[data-gap-mode=interval]').click();assert((await p.locator('.race-gap[data-code=PIA]').textContent())==='+2.264','Interval is not gap to preceding car');
await p.locator('[data-gap-mode=gap]').click();assert((await p.locator('.race-gap[data-code=PIA]').textContent())==='+4.106','Gap restoration failed');
await p.locator('.telemetry-range').evaluate(e=>{e.value=600;e.dispatchEvent(new Event('input',{bubbles:true}))});
assert((await p.locator('.telemetry .delta-value').allTextContents()).every(s=>s==='-0.143s'),'Both delta labels must reach the same completed-lap delta');
assert((await p.locator('.distance-value').textContent())==='5.807','Distance scrub endpoint mismatch');
await p.locator('.telemetry-range').evaluate(e=>{e.value=442;e.dispatchEvent(new Event('input',{bubbles:true}))});
assert((await p.locator('[data-reading=speed-nor]').textContent())==='263','Initial telemetry sample does not agree with graph');
for(const loss of [14,22.4,30]){
 await p.locator('.pit-range').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))},loss);
 const rank=await p.locator('.rejoin-value').textContent();const expected=await p.evaluate(v=>'P'+(1+CONCEPT.drivers.slice(1).filter(d=>d.gap<v).length),loss);assert(rank===expected,'Incorrect fixed-gap pit scenario');
}
await p.locator('.pit-range').evaluate(e=>{e.value=22.4;e.dispatchEvent(new Event('input',{bubbles:true}))});
assert((await p.locator('.behind-value').textContent())==='4.171s'&&(await p.locator('.ahead-value').textContent())==='2.634s','Default pit neighbours inconsistent');
const disclosure=await p.locator('.screen:not(.story)').evaluateAll(ss=>ss.every(s=>s.querySelector('.demo')?.textContent.includes('demo')||s.querySelector('.demo')?.textContent.includes('Demo')));assert(disclosure,'A phone screen lacks Demo identification');
const nav=await p.locator('.screen:not(.story)').evaluateAll(ss=>ss.every(s=>[...s.querySelectorAll('.tabbar button')].map(b=>b.textContent).join('|')==='Race|Timing|Lab'));assert(nav,'Missing global navigation destination');
results.push({test:'mockup interactions',drivers:22,deltaEnd:-.143,pitRejoin:'P7',allDemo:true,allNavigation:true});await p.close();
const theme=':root{--background:#111815;--foreground:#f2f4f0;--muted-foreground:#a8b8bc;--border:#344247;--secondary:#24332d;--ring:#b9d4f5;--radius:12px;--chart-1:#a5c7eb;--font-sans:-apple-system,BlinkMacSystemFont,sans-serif;--font-mono:Menlo,monospace}html{background:#111815}';
for(const width of[728,390,320]){
 const page=await browser.newPage({viewport:{width,height:1100}});page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(process.cwd()+'/presentation-a2.html').href,{waitUntil:'networkidle'});await page.addStyleTag({content:theme});
 assert(await page.locator('.screen-grid img').evaluateAll(es=>es.every(i=>i.complete&&i.naturalWidth>0)),'Gallery image missing');
 await page.locator('[data-screen="3"]').click();assert((await page.locator('#focus-title').textContent())==='Telemetry lab','Gallery selection failed');await page.locator('.back-all').click();
 await page.locator('.modebar [data-mode=motion]').click();const before=await page.locator('canvas').screenshot();await page.locator('[data-motion-camera="1"]').click();await page.waitForTimeout(1100);const after=await page.locator('canvas').screenshot();assert(!before.equals(after),'Camera film did not change');assert((await page.locator('.camera-status').textContent()).includes('Follow locked'),'Camera did not settle');
 await page.locator('.timing-tick').click();assert((await page.locator('.tick-number').textContent())==='1.826','Timing tick failed');
 await page.locator('.study-pit').evaluate(e=>{e.value=22.4;e.dispatchEvent(new Event('input',{bubbles:true}))});assert((await page.locator('.study-rejoin').textContent())==='P7','Motion pit rejoin mismatch');
 await page.locator('.study-scrubber').evaluate(e=>{e.value=1000;e.dispatchEvent(new Event('input',{bubbles:true}))});assert((await page.locator('.study-delta').textContent())==='-0.143s','Motion delta endpoint mismatch');
 await page.locator('.reduce-motion').click();await page.locator('[data-motion-camera="0"]').click();assert((await page.locator('.camera-status').textContent()).includes('reduced motion'),'Reduced motion not applied');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow,'Horizontal gallery overflow at'+width);
 await page.screenshot({path:`shots/a2-motion-${width}.png`,fullPage:true});
 await page.locator('.modebar [data-mode=screens]').click();await page.screenshot({path:`shots/a2-gallery-${width}.png`,fullPage:true});
 results.push({width,camera:true,telemetry:true,timingTick:true,pitScenario:true,reducedMotion:true,overflow:false,contentHeight:await page.evaluate(()=>document.documentElement.scrollHeight)});await page.close();
}
const rp=await browser.newPage({reducedMotion:'reduce'});await rp.goto(pathToFileURL(process.cwd()+'/presentation-a2.html').href,{waitUntil:'networkidle'});assert(await rp.locator('.motion-studies').getAttribute('data-reduced')==='true','System reduced motion preference ignored');await rp.close();
assert(!errors.length,'JavaScript errors: '+errors.join(';'));
fs.writeFileSync('shots/a2-validation.json',JSON.stringify({results,errors,systemReducedMotion:true},null,2));console.log(JSON.stringify({checks:results.length,errors,systemReducedMotion:true,passed:true},null,2));await browser.close();
