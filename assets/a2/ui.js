// All displayed information is deterministic simulated concept data.
for(const box of document.querySelectorAll('[data-model]')){
 const m=window.MODELS.a,NS='http://www.w3.org/2000/svg';
 const labels={NOR:[.64,.20],VER:[.25,.50]};
 const svg=document.createElementNS(NS,'svg');svg.classList.add('leaders');svg.setAttribute('aria-hidden','true');box.prepend(svg);
 for(const pin of box.querySelectorAll('[data-car]')){const xy=labels[pin.dataset.car];pin.style.left=100*xy[0]+'%';pin.style.top=100*xy[1]+'%'}
 const draw=()=>{const r=box.getBoundingClientRect();if(!r.width||!r.height)return;svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);svg.replaceChildren();for(const pin of box.querySelectorAll('[data-car]')){const pr=pin.getBoundingClientRect(),p=m.positions[pin.dataset.car],x=p[0]*r.width,y=p[1]*r.height,cx=pr.left-r.left+pr.width/2,cy=pr.top-r.top+pr.height/2,dx=x-cx,dy=y-cy,t=Math.min((pr.width/2)/Math.abs(dx||.001),(pr.height/2)/Math.abs(dy||.001));const line=document.createElementNS(NS,'path');line.setAttribute('d',`M${x} ${y}L${cx+dx*t} ${cy+dy*t}`);const dot=document.createElementNS(NS,'circle');dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.setAttribute('r',1.8);dot.setAttribute('fill',pin.dataset.car==='NOR'?'#ED9B47':'#A5C7EB');svg.append(line,dot)}};
 new ResizeObserver(draw).observe(box);document.fonts.ready.then(()=>requestAnimationFrame(draw));
}
for(const fw of document.querySelectorAll('.follow-world')){
 const update=()=>{const image=fw.querySelector('img'),lock=fw.querySelector('.lock');if(!image.naturalWidth)return;const r=fw.getBoundingClientRect(),ratio=image.naturalWidth/image.naturalHeight,iw=Math.max(r.width,r.height*ratio),ih=iw/ratio,p=window.FOLLOW_PROJECTION;lock.style.left=((r.width-iw)/2+p.x*iw)+'px';lock.style.top=((r.height-ih)/2+p.y*ih)+'px'};
 fw.querySelector('img').addEventListener('load',update);new ResizeObserver(update).observe(fw);update();
}
for(const b of document.querySelectorAll('[data-gap-mode]'))b.addEventListener('click',()=>{
 const screen=b.closest('.screen'),mode=b.dataset.gapMode;screen.querySelectorAll('[data-gap-mode]').forEach(x=>x.classList.toggle('selected',x===b));screen.querySelector('.gap-heading').textContent=mode==='gap'?'Gap':'Interval';
 for(const cell of screen.querySelectorAll('.race-gap')){const d=CONCEPT.drivers.find(x=>x.code===cell.dataset.code);cell.textContent=d.rank===1?'Leader':'+'+(mode==='gap'?d.gap:d.interval).toFixed(3)}
});
for(const range of document.querySelectorAll('.telemetry-range')){
 const screen=range.closest('.screen');
 const update=()=>{const s=CONCEPT.trace[+range.value],x=29+s.d/5807*(356-29);for(const line of screen.querySelectorAll('.cursor-line')){line.setAttribute('x1',x);line.setAttribute('x2',x)}for(const kind of ['speed','throttle','brake'])for(const who of ['nor','ver']){let v=s[who][kind];if(kind==='brake')v=v?'On':'Off';else if(kind==='throttle')v+='%';screen.querySelector(`[data-reading="${kind}-${who}"]`).textContent=v}screen.querySelectorAll('.delta-value').forEach(e=>e.textContent=(s.delta>=0?'+':'')+s.delta.toFixed(3)+'s');screen.querySelector('.distance-value').textContent=(s.d/1000).toFixed(3);range.setAttribute('aria-valuetext',`${(s.d/1000).toFixed(3)} kilometres. Norris ${s.nor.speed}, Verstappen ${s.ver.speed} kilometres per hour. Delta ${s.delta.toFixed(3)} seconds.`)};
 range.addEventListener('input',update);update();
 // The whole stack is also a direct manipulation surface, not only a tiny slider thumb.
 const stack=screen.querySelector('.telemetry-stack');stack.style.touchAction='pan-y';let dragging=false;
 const at=e=>{const r=stack.getBoundingClientRect(),f=Math.max(0,Math.min(1,((e.clientX-r.left)/r.width*362-29)/327));range.value=Math.round(f*600);update()};
 stack.addEventListener('pointerdown',e=>{dragging=true;stack.setPointerCapture(e.pointerId);at(e)});stack.addEventListener('pointermove',e=>{if(dragging)at(e)});stack.addEventListener('pointerup',()=>dragging=false);stack.addEventListener('pointercancel',()=>dragging=false);
}
for(const range of document.querySelectorAll('.pit-range')){
 const screen=range.closest('.screen');const update=()=>{const loss=+range.value,others=CONCEPT.drivers.slice(1),behind=others.filter(d=>d.gap<loss).at(-1),ahead=others.find(d=>d.gap>=loss),rank=1+others.filter(d=>d.gap<loss).length;screen.querySelector('.rejoin-value').textContent='P'+rank;screen.querySelector('.pit-loss-value').textContent=loss.toFixed(1)+'s';screen.querySelector('.behind-label').textContent=behind?'Behind '+behind.code:'Race lead';screen.querySelector('.behind-value').textContent=behind?(loss-behind.gap).toFixed(3)+'s':'—';screen.querySelector('.ahead-label').textContent=ahead?'Ahead of '+ahead.code:'Last on lead lap';screen.querySelector('.ahead-value').textContent=ahead?(ahead.gap-loss).toFixed(3)+'s':'—';range.setAttribute('aria-valuetext',`${loss.toFixed(1)} second assumed pit loss. Estimated rejoin position ${rank}. Fixed-gap scenario only.`)};range.addEventListener('input',update);update();
}
for(const button of document.querySelectorAll('.retry-demo'))button.addEventListener('click',()=>{if(button.dataset.busy)return;button.dataset.busy='true';button.textContent='Retrying…';setTimeout(()=>{button.textContent='Retry';delete button.dataset.busy},900)});
console.log('Vantage A concepts ready: 22-car timing, shared telemetry scrubber and assumed pit-loss scenario. All data simulated.');
