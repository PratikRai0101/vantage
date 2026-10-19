// rAF scheduling observations, NOT measured GPU presentation or native frame times.
export function summarizeFrames(intervals) {
 const valid=intervals.filter(n=>Number.isFinite(n)&&n>0).sort((a,b)=>a-b);
 if(!valid.length)return null;
 const percentile=p=>valid[Math.max(0,Math.ceil(valid.length*p)-1)];
 const sum=valid.reduce((a,b)=>a+b,0),round=n=>Math.round(n*100)/100;
 return {samples:valid.length,excluded:intervals.length-valid.length,
  observedRafHz:round(1000*valid.length/sum),medianIntervalMs:round((valid[Math.floor((valid.length-1)/2)]+valid[Math.floor(valid.length/2)])/2),
  p95IntervalMs:round(percentile(.95)),worstIntervalMs:round(valid.at(-1)),
  over34ms:valid.filter(n=>n>34).length,over50ms:valid.filter(n=>n>50).length};
}
