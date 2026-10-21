"""Map recorded approximate GPS onto the illustrative centreline, not a surveyed digital twin.
Uses NumPy available in this design workspace. Only needed when rebuilding the cached fixture.
"""
from pathlib import Path
import argparse,json,math,urllib.request,datetime
import numpy as np
PIPELINE=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--data-dir',type=Path,default=PIPELINE/'data',help='Raw cache and intermediate directory')
parser.add_argument('--replay-dir',type=Path,default=PIPELINE.parent/'assets/replay',help='Canonical track input and playback output directory')
parser.add_argument('--offline',action='store_true',help='Require cached ranking history; never access the network')
args=parser.parse_args()
D=args.data_dir.resolve();OUT=args.replay_dir.resolve()
OUT.mkdir(parents=True,exist_ok=True)
replay=json.loads((D/'replay.json').read_text());track=json.loads((OUT/'track.json').read_text())
origin=datetime.datetime.fromisoformat(replay['window']['start'].replace('Z','+00:00'))
# Rank updates are events, not periodic samples. Seed with the LAST event before the clip.
url='https://api.openf1.org/v1/position?session_key=9496'
if not (D/'position-history.json').exists():
 if args.offline:raise RuntimeError('Offline cache missing: position-history.json')
 with urllib.request.urlopen(url,timeout=45) as response:history=json.load(response)
 (D/'position-history.json').write_text(json.dumps(history,separators=(',',':')))
 (D/'position-history-provenance.json').write_text(json.dumps({'url':url,'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'reason':'As-of rank state needs events preceding the bounded clip'},indent=2))
else:history=json.loads((D/'position-history.json').read_text())
for driver in replay['drivers']:
 rows=[]
 for r in history:
  if r['driver_number']!=driver['number']:continue
  t=(datetime.datetime.fromisoformat(r['date'].replace('Z','+00:00'))-origin).total_seconds()
  if t<=120:rows.append([round(t,6),r.get('position')])
 rows.sort();seed=[r for r in rows if r[0]<=0]
 driver['positions']=([seed[-1]] if seed else [])+[r for r in rows if r[0]>0]
 events=driver['positions']
 driver['coverage']['positions']={'count':len(events),'inWindowCount':sum(0<=r[0]<=120 for r in events),'first':events[0][0] if events else None,'last':events[-1][0] if events else None,'historySeeded':bool(seed)}
replay['summary']['sampleCounts']['positions']=sum(len(d['positions']) for d in replay['drivers'])
replay['summary']['rawCounts']['positionHistory']=len(history)
replay['summary']['driversWithNoSamples']['positions']=[d['number'] for d in replay['drivers'] if not d['positions']]
replay['summary']['driversWithNoInWindowSamples']['positions']=[d['number'] for d in replay['drivers'] if not d['coverage']['positions']['inWindowCount']]
replay['window']['positionSeed']='Last full-session recorded rank event at or before t=0, followed only by events inside t=0..120.'

Q3=np.array(track['points']);Q=np.stack((Q3[:,0],-Q3[:,2]),axis=1)
P=np.array([r[1:3]for d in replay['drivers'] if d.get('available') for r in d['location'][::3]],dtype=float)
P=P[np.isfinite(P).all(axis=1)];P=P[::max(1,len(P)//850)]
pc=(P.min(axis=0)+P.max(axis=0))/2;qc=(Q.min(axis=0)+Q.max(axis=0))/2
scale=np.max(np.ptp(Q,axis=0))/np.max(np.ptp(P,axis=0));coarse=Q[::3]
def nearest(a,b):
 ds=((a[:,None,:]-b[None,:,:])**2).sum(axis=2);idx=ds.argmin(axis=1)
 return idx,ds[np.arange(len(a)),idx]
def solve(p,q):
 p0=p-p.mean(0);q0=q-q.mean(0);u,s,vt=np.linalg.svd(p0.T@q0)
 m=(u@vt)*(s.sum()/(p0*p0).sum());return m,q.mean(0)-p.mean(0)@m
best=None
for mirror in [-1,1]:
 for angle in np.linspace(0,math.tau,24,endpoint=False):
  r=np.array([[math.cos(angle),math.sin(angle)],[-math.sin(angle),math.cos(angle)]])@np.diag([1,mirror]);m=r*scale;b=qc-pc@m
  for _ in range(20):
   idx,err=nearest(P@m+b,coarse);keep=err<=np.quantile(err,.88)
   mm,bb=solve(P[keep],coarse[idx[keep]])
   singular=np.linalg.svd(mm,compute_uv=False)
   if singular.min()<scale*.75 or singular.max()>scale*1.25:break
   if np.max(abs(mm-m))<1e-8:m,b=mm,bb;break
   m,b=mm,bb
  _,err=nearest(P@m+b,Q);score=float(np.quantile(err,.8))
  if best is None or score<best[0]:best=(score,m,b)
_,M,B=best
# Refine the global transform, retaining outlier robustness (pit lane and imperfect survey match).
for _ in range(12):
 idx,err=nearest(P@M+B,Q);keep=err<np.quantile(err,.9);M,B=solve(P[keep],Q[idx[keep]])
_,errors=nearest(P@M+B,Q)
all_lengths=np.array(track['lengths']);lengths=all_lengths[:-1];total=track['length'];projection_errors=[]
for driver in replay['drivers']:
 if not driver.get('available'):
  driver['route']=[];continue
 rows=[];previous=None;last_time=None
 for sample in driver['location']:
  t=sample[0];point=np.array(sample[1:3])@M+B;dist=((Q-point)**2).sum(axis=1)
  candidates=np.argpartition(dist,16)[:16]
  # Resolve the figure-eight crossing by continuity; do not jump between bridge levels.
  if previous is None:index=int(dist.argmin())
  else:
   dt=max(.01,t-last_time);expected=dt*4.5;diff=(lengths[candidates]-previous+total/2)%total-total/2
   score=dist[candidates]+np.maximum(0,np.abs(diff)-expected-1.2)**2*3
   index=int(candidates[score.argmin()])
  # Continuous edge projection avoids quantizing movement to the 1,026 authored vertices.
  edge_candidates=[]
  for edge in [(index-1)%len(Q),index]:
   a=Q[edge];v=Q[(edge+1)%len(Q)]-a
   f=float(np.clip(np.dot(point-a,v)/max(1e-12,np.dot(v,v)),0,1))
   error=float(np.linalg.norm(point-(a+v*f)))
   progress=float(all_lengths[edge]+f*(all_lengths[edge+1]-all_lengths[edge]))
   edge_candidates.append((error,progress))
  error,previous=min(edge_candidates);last_time=t
  rows.append([t,round(previous/total,7),round(error,4)])
  projection_errors.append(error)
 driver['route']=rows
 driver['routeRepresentation']='Recorded approximate GPS, registered and projected onto illustrative track centreline; no lateral lane accuracy.'
calibration={'method':'Robust 2D similarity ICP; nearest centreline with temporal crossing continuity','matrix':M.tolist(),'translation':B.tolist(),'sampleCount':len(P),'fitMedianModelUnits':float(np.median(np.sqrt(errors))),'projectionMedianModelUnits':float(np.median(projection_errors)),'projectionP95ModelUnits':float(np.percentile(projection_errors,95)),'limitations':['Road and car scale enlarged for miniature legibility.','Illustrative road elevation is used instead of recorded altitude.','Lane placement, pit lane geometry and exact wheel-to-wheel moves are not represented.','Cars with stationary/zero-speed streams are not animated.']}
replay['calibration']=calibration
replay['provenance']['positionHistory']=json.loads((D/'position-history-provenance.json').read_text())
(OUT/'playback.json').write_text(json.dumps(replay,separators=(',',':'),ensure_ascii=False))
(D/'calibration.json').write_text(json.dumps(calibration,indent=2))
print(json.dumps(calibration,indent=2))
# An overlay for human inspection of registration rather than trusting a matrix alone.
from PIL import Image,ImageDraw
im=Image.new('RGB',(1000,650),'#111a1d');draw=ImageDraw.Draw(im)
def px(p):return (int(500+p[0]*8),int(325-p[1]*8))
for i,q in enumerate(Q):draw.line([px(q),px(Q[(i+1)%len(Q)])],fill='#c2d2d8',width=3)
for p in P@M+B:
 x,y=px(p);draw.ellipse((x-1,y-1,x+1,y+1),fill='#d88a44')
im.save(D/'registration.png')
print('Prepared playback.json with recorded rank seeds and',sum(bool(d.get('route'))for d in replay['drivers']),'projected moving drivers.')
