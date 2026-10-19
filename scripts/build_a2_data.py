"""Deterministic concept data. Not fetched telemetry, race results or a live feed."""
import json,math,pathlib
ROOT=pathlib.Path(__file__).resolve().parent.parent
rows=[('NOR','Norris','McLaren',0,'H',12,92.184,18),('VER','Verstappen','Red Bull',1.842,'H',13,92.327,17),('PIA','Piastri','McLaren',4.106,'H',11,92.412,19),('LEC','Leclerc','Ferrari',9.684,'M',3,93.018,27),('RUS','Russell','Mercedes',12.318,'H',10,92.856,20),('HAM','Hamilton','Ferrari',14.725,'H',12,93.107,18),('ANT','Antonelli','Mercedes',18.229,'H',11,92.978,19),('ALO','Alonso','Aston Martin',25.034,'H',14,93.447,16),('SAI','Sainz','Williams',27.518,'H',13,93.338,17),('ALB','Albon','Williams',29.812,'H',12,93.521,18),('GAS','Gasly','Alpine',34.631,'H',14,93.718,16),('HAD','Hadjar','Red Bull',36.918,'H',12,93.615,18),('LAW','Lawson','Racing Bulls',40.227,'H',13,93.882,17),('BEA','Bearman','Haas',43.106,'H',11,93.979,19),('OCO','Ocon','Haas',45.899,'H',12,94.110,18),('HUL','Hülkenberg','Audi',49.522,'H',13,94.018,17),('BOR','Bortoleto','Audi',52.330,'H',14,94.227,16),('STR','Stroll','Aston Martin',56.041,'H',12,94.441,18),('COL','Colapinto','Alpine',58.888,'H',11,94.387,19),('BOT','Bottas','Cadillac',62.402,'H',12,94.712,18),('PER','Pérez','Cadillac',65.771,'H',13,94.621,17),('LIN','Lindblad','Racing Bulls',68.203,'H',10,94.895,20)]
def lap(t):return f'{int(t//60)}:{t%60:06.3f}'
drivers=[]
for i,(code,name,team,gap,tyre,age,last,pit) in enumerate(rows):
 drivers.append(dict(rank=i+1,code=code,name=name,team=team,gap=gap,interval=round(gap-(rows[i-1][3] if i else 0),3),tyre=tyre,age=age,last=lap(last),lapTime=last,pit=pit))
# Distance-aligned synthetic profiles; timings are derived from the displayed speed curves.
knots=[(0,310),(400,325),(500,260),(620,190),(850,200),(1050,215),(1180,175),(1300,200),(1450,155),(1600,210),(1800,240),(2100,270),(2250,180),(2350,155),(2450,250),(2700,275),(2850,85),(2970,115),(3200,220),(3500,280),(3700,290),(3900,180),(4060,155),(4250,245),(4500,310),(4750,325),(5000,280),(5200,310),(5350,120),(5490,105),(5640,230),(5807,310)]
def interp(x):
 for (xa,ya),(xb,yb) in zip(knots,knots[1:]):
  if x<=xb:
   t=(x-xa)/(xb-xa);t=t*t*(3-2*t)
   return ya+(yb-ya)*t
 return knots[-1][1]
N=601;xs=[5807*i/(N-1) for i in range(N)];dx=xs[1]-xs[0]
a=[interp(x) for x in xs];b=[v*(1-.012*math.sin(x/5807*math.pi*2)-.005*math.sin(x/5807*math.pi*6))for x,v in zip(xs,a)]
def duration(v):return sum(dx*3.6*2/(u+w) for u,w in zip(v,v[1:]))
a=[v*duration(a)/92.184 for v in a];b=[v*duration(b)/92.327 for v in b]
ta=[0];tb=[0]
for i in range(1,N):
 ta.append(ta[-1]+dx*3.6*2/(a[i-1]+a[i]));tb.append(tb[-1]+dx*3.6*2/(b[i-1]+b[i]))
def channels(v,i):
 slope=(v[min(N-1,i+1)]-v[max(0,i-1)])/(2*dx)
 brake=1 if slope<-.075 else 0
 throttle=0 if brake else max(18,min(100,round(96+math.sin(i*.09)*4-(max(0,-slope)*350))))
 gear=min(8,max(2,int(v[i]/43)+1));rpm=round(8500+v[i]*7.1+(gear-2)*140)
 return dict(speed=round(v[i]),throttle=throttle,brake=brake,gear=gear,rpm=rpm)
trace=[]
for i,x in enumerate(xs):trace.append(dict(d=round(x,2),nor=channels(a,i),ver=channels(b,i),delta=round(ta[i]-tb[i],4)))
# A single cursor is shared by all channels, keeping every graph and figure in agreement.
cursor=442;readout=trace[cursor]
data=dict(disclaimer='Simulated concept data — not a live feed',lap=31,totalLaps=53,completed=30,clock='14:37',drivers=drivers,trace=trace,cursor=cursor,readout=readout,pitLoss=22.4,rejoin=7,aheadOf='ALO',aheadGap=2.634,behind='ANT',behindGap=4.171,lapDelta=round(92.184-92.327,3))
(ROOT/'assets/a2').mkdir(parents=True,exist_ok=True)
(ROOT/'assets/a2/concept-data.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
(ROOT/'assets/a2/concept-data.js').write_text('window.CONCEPT='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';')
print(json.dumps(dict(cursor=readout,deltaEnd=trace[-1]['delta'],peak=max(a),min=min(a),lapA=ta[-1],lapB=tb[-1]),indent=2))
