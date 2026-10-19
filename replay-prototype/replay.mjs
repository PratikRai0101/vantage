// One replay clock for every view. Data sampling is independent of rendering and cameras.
export function asOf(rows, time) {
  let lo=0,hi=rows.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(rows[mid][0]<=time)lo=mid+1;else hi=mid;}
  return lo?rows[lo-1]:null;
}
export function routeAt(rows,time,maxGap=3){
  const a=asOf(rows,time);if(!a)return null;
  const i=upperBound(rows,time),b=rows[i];
  if(time-a[0]>maxGap)return null;
  if(!b||b[0]-a[0]>maxGap)return {phase:a[1],sampleTime:a[0],held:true};
  const f=Math.max(0,Math.min(1,(time-a[0])/(b[0]-a[0])));
  let delta=b[1]-a[1];if(delta>.5)delta-=1;if(delta<-.5)delta+=1;
  return {phase:((a[1]+delta*f)%1+1)%1,sampleTime:a[0],held:false};
}
function upperBound(rows,time){let lo=0,hi=rows.length;while(lo<hi){const m=(lo+hi)>>>1;if(rows[m][0]<=time)lo=m+1;else hi=m;}return lo;}
export function lapAt(driver,time){
  return driver.laps.filter(l=>Number.isFinite(l.start)&&l.start<=time).sort((a,b)=>b.start-a.start)[0]||null;
}
export function lastCompletedLap(driver,time){
  return driver.laps.filter(l=>Number.isFinite(l.start)&&Number.isFinite(l.duration)&&l.start+l.duration<=time).sort((a,b)=>(b.start+b.duration)-(a.start+a.duration))[0]||null;
}
export function snapshot(driver,time){
  const sample=asOf(driver.telemetry,time),age=sample?time-sample[0]:null;
  const usable=driver.available&&sample&&age<=2;
  const valid=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max?v:null;
  const lap=lapAt(driver,time);
  const stint=lap?driver.stints.filter(s=>s.lapStart<=lap.number&&s.lapEnd>=lap.number).sort((a,b)=>b.number-a.number)[0]:null;
  return {driver,time,route:driver.available?routeAt(driver.route||[],time):null,
    sampleTime:sample?.[0]??null,age,usable,
    speed:usable?valid(sample[1],0,400):null,throttle:usable?valid(sample[2],0,100):null,
    brake:usable&&[0,1].includes(sample[3])?sample[3]:null,gear:usable?valid(sample[4],0,8):null,
    rpm:usable?valid(sample[5],0,20000):null,
    position:asOf(driver.positions,time)?.[1]??null,gap:asOf(driver.intervals,time),lap,stint};
}
export function standings(drivers,time){
  return drivers.map(d=>snapshot(d,time)).sort((a,b)=>(a.position??999)-(b.position??999)||a.driver.number-b.driver.number);
}
export function advance(time,delta,speed,duration){return Math.min(duration,Math.max(0,time+Math.min(.25,Math.max(0,delta))*speed));}
export function formatTime(t){const m=Math.floor(t/60);return `${String(m).padStart(2,'0')}:${(t%60).toFixed(1).padStart(4,'0')}`;}
export function formatGap(gap,position){
  if(position===1)return 'Leader';
  if(!gap)return '—';const v=gap[1];
  return typeof v==='number'?`+${v.toFixed(3)}s`:v===null||v===undefined?'—':String(v);
}
