"""Build the selected A visual concepts. Data and imagery are explicitly simulated."""
from pathlib import Path
import json,math,html
ROOT=Path(__file__).resolve().parents[1]
D=json.loads((ROOT/'assets/a2/concept-data.json').read_text())
CSS=(ROOT/'assets/a2/ui.css').read_text()
DEVICE='/Users/pratikrai/.pi/agent/skills/app-designer/assets'

def icon(name):return f'<svg class="icon" aria-hidden="true"><use href="#{name}"/></svg>'
SYMBOLS='''<svg class="symbols" aria-hidden="true"><defs>
<symbol id="back" viewBox="0 0 24 24"><path d="m14 5-7 7 7 7"/></symbol>
<symbol id="more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></symbol>
<symbol id="chevron" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></symbol>
<symbol id="orbit" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="4.5" transform="rotate(-25 12 12)"/><path d="m18 4 2 2-2 2"/><circle cx="12" cy="12" r="1.3"/></symbol>
<symbol id="sync" viewBox="0 0 24 24"><path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></symbol>
<symbol id="circuit" viewBox="0 0 24 24"><path d="m19 12 2.6 3.4q.7 1.6-.7 1.6-.7 0-1.2-1.1l-.7-1-1.1-.1q-1 0-1.1-1.2l-.2-1.2q-.1-.5-1-.2l-.8-1.4q-.1-.6-.7-.7l-1-.4q-.8-.2-1.6.7l-1.7 1.5-1.5.1-.5-3.1.4-1.2q.3-.9-.3-.3l-.8 1.2q-.8 1.2-2 1-2.6-.3-3.6-2.6Q2.4 5.5 2 7q0 .5 1.7 1.8l1.8.9 5.3 1.8q.5 0 1.2-.4l2.2-1.9q.2-.2.6.2l.8-.4q1.1-.5 2.3.6Z"/></symbol>
<symbol id="follow" viewBox="0 0 24 24"><path d="M9 6 12 3l3 3M9 18l3 3 3-3M7 10v6m10-6v6M9 9h6v7H9Z"/></symbol>
<symbol id="battle" viewBox="0 0 24 24"><path d="m5 9 3-3 3 3M8 6v13m5-4 3 3 3-3m-3 3V5"/></symbol>
<symbol id="timing" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 5v2m0 4v2m0 4v2"/></symbol>
<symbol id="lab" viewBox="0 0 24 24"><path d="M3 19h18M4 15l4-5 4 3 4-9 4 4"/></symbol>
<symbol id="pause" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 8v8m6-8v8"/></symbol>
<symbol id="clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></symbol>
</defs></svg>'''

def toolbar(demo='Live demo'):return f'<div class="toolbar"><button class="circle glass" aria-label="Back">{icon("back")}</button><span class="demo">{demo}</span><button class="circle glass" aria-label="More">{icon("more")}</button></div>'
def nav(selected):
 return '<nav class="tabbar glass" data-system aria-label="Destinations">'+''.join(f'<button class="{"selected" if k==selected else ""}" data-destination="{k}">{icon(g)}<span>{label}</span></button>'for k,g,label in [('race','circuit','Race'),('timing','timing','Timing'),('lab','lab','Lab')])+'</nav>'
def title(name,eyebrow='',subtitle='',lap=False):
 return f'<header class="heading"><div>{f"<div class=eyebrow>{eyebrow}</div>" if eyebrow else ""}<h1>{name}</h1>{f"<p class=subtitle>{subtitle}</p>" if subtitle else ""}</div>{"<div class=lap><span class=label>Lap</span><span class=value>31<span class=dim> / 53</span></span></div>" if lap else ""}</header>'
def camera(selected='Circuit'):
 return '<nav class="camera-picker" data-system aria-label="3D camera">'+''.join(f'<button class="{"selected" if x==selected else ""}" data-camera="{x.lower()}">{icon(g)}{x}</button>'for x,g in [('Circuit','circuit'),('Follow','follow'),('Battle','battle')])+'</nav>'
def labtabs(selected):return '<nav class="section-switch" aria-label="Lab mode">'+''.join(f'<button class="{"selected" if x==selected else ""}" data-lab="{x.lower()}">{x}</button>'for x in ['Telemetry','Strategy'])+'</nav>'
def world(paused=False):return '<div class="world"><div class="render-box" data-model="a"><img src="assets/a2/overview.webp" alt="Complete three-dimensional Suzuka miniature with 22 simulated cars"><div class="pin" data-car="NOR"><i></i>1 NOR</div><div class="pin ver" data-car="VER"><i></i>2 VER</div></div></div>'
def progress():return '<div class="progress" aria-label="Lap 31 of 53">'+''.join('<i class="'+('done'if i<31 else '')+'"></i>'for i in range(53))+'</div>'
def order():
 rows=''
 for d in D['drivers'][:3]:
  val='Leader'if d['rank']==1 else f'+{d["gap"]:.3f}s'
  rows+=f'<div class="compact-driver"><span class="rank">{d["rank"]}</span><i class="team-line {"ver" if d["code"]=="VER" else ""}"></i><span class="name">{d["name"]}<span class="code">{d["code"]}</span></span><span class="gap {"leader" if d["rank"]==1 else ""}">{val}</span></div>'
 return f'<section class="order"><div class="order-head"><h2>Race order</h2><button>All 22{icon("chevron")}</button></div>{rows}</section>'
def race_inner():return toolbar()+title('Suzuka','Japanese Grand Prix',lap=True)+progress()+world()+f'<div class="world-info"><span>{icon("orbit")}Drag to orbit · 22 cars</span><button>{icon("sync")}Sync</button></div>'+camera()+ '<div class="race-event"><span class="lap-tag">Lap 30</span><span>Norris gained <b>0.143s</b></span></div>'+order()

def frame(name,cls,inner,selected='race',light=False,dense=False):
 attrs=''if light else ' data-theme="dark"'
 if dense:attrs+=' data-dense'
 return f'<section class="screen {cls}" data-name="{name}" data-time="14:37"{attrs}><div class="app">{inner}</div>{nav(selected)}</section>'
frames=[]
frames.append(('01 / The whole race','Improved overview. The miniature keeps priority; timing and Lab are one tap away.',frame('01-race-overview','race',race_inner(),dense=True)))

# Live timing tower, with all 22 rows actually present and scrollable.
rows=''
for d in D['drivers']:
 gap='Leader'if d['rank']==1 else f'+{d["gap"]:.3f}'
 rows+=f'<li class="timing-grid timing-row {"selected"if d["rank"]==1 else ""}"><span class="rank">{d["rank"]}</span><span class="driver-id"><b>{d["code"]}</b><small>{d["name"]}</small></span><span class="cell-number race-gap" data-code="{d["code"]}">{gap}</span><span class="cell-number">{d["last"]}</span><span class="tyre-age"><i class="compound {"medium"if d["tyre"]=="M"else""}">{d["tyre"]}</i>{d["age"]}</span></li>'
timing=toolbar()+f'<header class="heading"><div><h1>Timing</h1><p class="subtitle">Suzuka · Lap 31 / 53</p></div><img class="car-stamp" src="assets/a2/car.webp" alt="Original orange miniature race car"></header><div class="timing-controls"><div class="toggle" data-system><button class="selected" data-gap-mode="gap">Gap</button><button data-gap-mode="interval">Interval</button></div><span class="unit">22 cars · seconds</span></div><div class="timing-grid timing-table-head"><span>Pos</span><span>Driver</span><span class="gap-heading">Gap</span><span>Last lap</span><span>Tyre</span></div><div class="scroll-body" data-scrolls><ol class="timing-list">{rows}</ol><p class="footer-note">Tyre age = completed laps. Simulated data.</p></div>'
frames.append(('02 / Live timing dashboard','A proper race timing tower: gap or interval, lap time, compound and completed tyre laps.',frame('02-live-timing','timing',timing,'timing',dense=True)))
follow=toolbar()+title('Norris','Lando Norris · McLaren')+'<div class="follow-world"><img src="assets/a2/follow.webp" alt="A trailing miniature view of Norris on the Suzuka crossover"><i class="lock"></i><span class="mode-label">P1 · Reconstructed 3D</span></div>'+camera('Follow')+f'<div class="speed-line"><div><span class="speed">286</span><span class="unit">km/h</span></div><div class="gear">Gear<strong>7</strong></div></div><div class="pedals"><div><div class="pedal-label"><span>Throttle</span><b>99%</b></div><div class="pedal-track"><i></i></div></div><div><div class="pedal-label"><span>Brake</span><b>Off</b></div><div class="pedal-track off"><i></i></div></div></div><div class="driver-facts"><span>11,284 RPM</span><span>VER +1.842s</span></div><div class="open-link"><span>Open telemetry</span>{icon("chevron")}</div>'
frames.append(('03 / Driver follow','A close camera inside the same miniature world, with an immediately readable car-state instrument.',frame('03-driver-follow','follow',follow,dense=True)))

TRACE=D['trace'];IDX=D['cursor'];R=D['readout'];PW=362;XL=29;XR=356
# SVGs carry exactly the same samples that drive the pointer/keyboard scrubber.
def chart(kind,height,lo,hi,ticks,xaxis=False):
 top=8;bottom=height-(21 if xaxis else 8);ph=bottom-top
 def y(v):return top+(hi-v)/(hi-lo)*ph
 def val(s,driver):return s['delta'] if kind=='delta' else s[driver][kind]
 ss=['<svg class="chart" data-channel="'+kind+'" viewBox="0 0 362 '+str(height)+'" style="height:'+str(height)+'px" aria-label="'+kind+' traces">']
 for v,label in ticks:
  yy=y(v);ss.append(f'<line class="grid" x1="{XL}" x2="{XR}" y1="{yy:.2f}" y2="{yy:.2f}"/><text x="22" y="{yy+4:.2f}" text-anchor="end">{label}</text>')
 for who in (['nor']if kind=='delta'else['nor','ver']):
  points=[]
  indices=list(range(0,len(TRACE),3))
  if IDX not in indices:indices.append(IDX);indices.sort()
  for i in indices:
   s=TRACE[i];xx=XL+s['d']/5807*(XR-XL);yy=y(val(s,who));points.append(f'{xx:.2f},{yy:.2f}')
  klass='delta'if kind=='delta'else 'trace '+who
  ss.append(f'<polyline class="{klass}" points="'+ ' '.join(points)+'"/>')
 cx=XL+R['d']/5807*(XR-XL)
 ss.append(f'<line class="cursor-line" x1="{cx:.2f}" x2="{cx:.2f}" y1="0" y2="{height-(15if xaxis else 0)}"/>')
 if xaxis:
  for x,label in [(0,'0'),(2000,'2.0'),(4000,'4.0'),(5807,'5.807')]:
   xx=XL+x/5807*(XR-XL);ss.append(f'<text x="{xx}" y="{height-2}" text-anchor="{"start"if x==0 else "end"if x==5807 else "middle"}">{label}</text>')
 ss.append('</svg>');return ''.join(ss)
def channel(kind,label,unit,height,lo,hi,ticks,xaxis=False):
 if kind=='delta':read=f'<span class="readings"><span class="delta-value">{R["delta"]:+.3f}s</span></span>'
 else:
  vv=lambda who:'On'if R[who][kind]else'Off'if kind=='brake'else str(R[who][kind])
  if kind=='brake':a='On'if R['nor']['brake']else'Off';b='On'if R['ver']['brake']else'Off'
  else:a=str(R['nor'][kind]);b=str(R['ver'][kind])
  suffix=''if kind=='brake'else unit
  read=f'<span class="readings"><span class="nor" data-reading="{kind}-nor">{a}{suffix}</span><span class="ver" data-reading="{kind}-ver">{b}{suffix}</span></span>'
 return f'<section class="channel"><div class="channel-head"><h2>{label}</h2>{read}</div>'+chart(kind,height,lo,hi,ticks,xaxis)+'</section>'
telemetry=toolbar('Demo')+title('Telemetry',subtitle='Completed lap 30 · Distance aligned')+labtabs('Telemetry')+'<div class="scroll-body" data-scrolls><div class="compare-laps"><span class="compare-lap"><i class="line-key"></i><b>NOR</b><span class="time">1:32.184</span></span><span class="compare-lap"><i class="line-key ver"></i><b>VER</b><span class="time">1:32.327</span></span></div><div class="telemetry-stack">'
telemetry+=channel('speed','Speed · km/h','',128,60,360,[(100,'100'),(200,'200'),(300,'300')])
telemetry+=channel('throttle','Throttle','%',46,0,100,[(100,'100'),(0,'0')])
telemetry+=channel('brake','Brake','',42,0,1,[(1,'On'),(0,'Off')])
telemetry+=channel('delta','Delta · NOR − VER','',66,-.5,.15,[(0,'0'),(-.4,'−.4')],True)
telemetry+='</div></div><div class="inspection-rail" data-float><div class="scrub-meta"><span>Distance <strong class="distance-value">4.278</strong> km</span><strong class="delta-value">−0.307s</strong><span>Δ NOR − VER</span></div><div class="scrub-control"><input type="range" min="0" max="600" step="1" value="442" class="telemetry-range" aria-label="Inspect distance-aligned telemetry"></div><p class="footer-note">Negative delta: Norris ahead. Simulated traces.</p></div>'
frames.append(('04 / Telemetry lab','Distance-aligned speed, throttle, brake state and delta. One cursor drives every chart and value.',frame('04-telemetry-lab','telemetry',telemetry,'lab',dense=True)))

def stints():
 left=38;right=354;ww=right-left;yy=27
 out=['<svg class="stint-chart" viewBox="0 0 362 164" style="height:164px" aria-label="Stint history to completed lap 30">']
 for n,label in [(1,'1'),(19,'19'),(31,'31'),(53,'53')]:
  x=left+(n-1)/53*ww;out.append(f'<text x="{x}" y="13" text-anchor="{"end"if n==53 else "start"}">{label}</text>')
 current=left+30/53*ww
 for k,d in enumerate(D['drivers'][:4]):
  y=yy+k*33;pit=d['pit'];first='H'if d['code']=='LEC'else'M';second=d['tyre'];w1=pit/53*ww;w2=(30-pit)/53*ww
  out.append(f'<text class="label" x="0" y="{y+14}">{d["code"]}</text><rect x="{left}" y="{y}" width="{ww}" height="20" rx="3" style="fill:var(--raised)"/><rect x="{left}" y="{y}" width="{w1}" height="20" rx="3" style="fill:#52636B"/><rect x="{left+w1+1}" y="{y}" width="{max(1,w2-1)}" height="20" rx="3" style="fill:#344B58"/><text x="{left+w1/2}" y="{y+14}" text-anchor="middle" style="color:#FFFFFF;fill:currentColor">{first}</text><text x="{left+w1+w2/2}" y="{y+14}" text-anchor="middle" style="color:#FFFFFF;fill:currentColor">{second}</text>')
 out.append(f'<line x1="{current}" x2="{current}" y1="18" y2="156" style="stroke:var(--ink);stroke-width:1;stroke-dasharray:2 3"/></svg>');return ''.join(out)
strategy=toolbar('Demo')+title('Strategy',subtitle='Norris pit scenario')+labtabs('Strategy')+'<div class="scroll-body" data-scrolls><div class="strategy-content"><div class="strategy-hero"><div class="result"><div class="label">If Norris pits now</div><strong class="rejoin-value">P7</strong><div class="label">Estimated rejoin</div></div><img src="assets/a2/car.webp" alt="Physical orange miniature race car"></div><p class="strategy-caption">Current position P1 · Lap 31</p><div class="assumption"><span>Pit loss <span class="assumption-label">(assumed)</span></span><strong class="pit-loss-value">22.4s</strong></div><input class="pit-range" type="range" min="14" max="30" step=".1" value="22.4" aria-label="Assumed pit loss in seconds"><p class="assumption-note">Fixed-gap scenario; excludes traffic and neutralisation.</p><div class="pit-neighbours"><div><span class="label behind-label">Behind ANT</span><span class="value behind-value">4.171s</span></div><div><span class="label ahead-label">Ahead of ALO</span><span class="value ahead-value">2.634s</span></div></div><div class="stint-heading"><h2>Stint history</h2><span>30 completed laps</span></div>'+stints()+'<p class="scenario-note">M medium · H hard. Counts exclude the current lap.</p></div></div>'
frames.append(('05 / Strategy workbench','A clearly labelled pit-loss scenario and stint history—not an invented AI prediction.',frame('05-strategy-workbench','strategy',strategy,'lab',dense=True)))
interrupted=toolbar('Demo')+title('Suzuka','Japanese Grand Prix',lap=True)+f'<div class="stale-flag">{icon("pause")}Positions paused</div>'+world(True)+'<div class="stale-message"><h2>Holding the<br>last frame.</h2><p>Positions are paused, not the race.<br>Timing is 8.4s old.</p><p class="age">Last update · 14:37:12</p></div><div class="stale-actions"><button class="primary retry-demo">Retry</button><button class="secondary">Keep last frame</button></div>'
frames.append(('06 / When a feed drops','Last-known positions freeze. Data age and recovery stay explicit; nothing keeps pretending to be live.',frame('06-feed-interrupted','interrupted',interrupted,dense=True)))
frames.append(('07 / Light studio','The same precision miniature and hierarchy, with a deliberately designed light counterpart.',frame('07-light-studio','race',race_inner(),light=True,dense=True)))

# Signature storyboard: actual geometric camera renders, with real device mini chrome.
mini=''
for f,label,speed in [('frame-00.png','Suzuka',''),('frame-15.png','Norris',''),('frame-29.png','Norris','286')]:
 mini+=f'<div class="mini"><div class="mini-screen" data-chrome="light" data-time="14:37"><div class="mini-ui"><div class="mini-event">Japanese Grand Prix</div><div class="mini-title">{label}</div><img src="assets/a2/{f}" alt="Camera journey frame"><div class="mini-readout">{speed}</div><div class="mini-nav">Circuit · Follow · Battle</div></div></div></div>'
story=f'<section class="screen story" data-name="08-camera-storyboard" data-chrome="none" data-theme="dark"><p class="overline">The signature interaction</p><h1>Hold the race.<br>Then dive in.</h1><p class="deck">The same car stays anchored as the camera moves through the miniature.</p><div class="mini-row">{mini}</div><div class="story-times"><span><b>Overview</b>0ms · All 22 cars</span><span><b>Select NOR</b>160ms · Target holds</span><span><b>Follow locked</b>480ms · One car</span></div><div class="story-step"><span class="number">01</span><span>Tap the car, not a separate video feed.</span></div><div class="story-step"><span class="number">02</span><span>Camera tracks the same point in 3D.</span></div><div class="story-step"><span class="number">03</span><span>Pinch out to fit the whole field again.</span></div><p class="motion-foot">480ms in · 420ms back · selection haptic<br>Reduced motion: 120ms crossfade.<br>Rendered camera demo; car positions are frozen.</p></section>'
frames.append(('08 / Camera choreography','A real 30-frame camera journey through the model, with an explicit reduced-motion alternative.',story))
iconhtml='''<section class="app-icon" data-name="09-vantage-icon"><svg viewBox="0 0 344 344" width="344" height="344" aria-label="Elevated circuit loop icon"><path d="M89 87C45 87 49 151 87 168L233 238C279 260 308 198 267 174L119 94C109 88 99 87 89 87Z" fill="none" stroke="#21333F" stroke-width="49" transform="translate(0 11)"/><path d="M89 87C45 87 49 151 87 168L233 238C279 260 308 198 267 174L119 94C109 88 99 87 89 87Z" fill="none" stroke="#BCD5EC" stroke-width="41"/><path d="M91 255C48 255 46 191 87 168L239 86C277 65 304 122 267 144L121 224C109 231 103 255 91 255Z" fill="none" stroke="#111A1D" stroke-width="63"/><path d="M91 255C48 255 46 191 87 168L239 86C277 65 304 122 267 144L121 224C109 231 103 255 91 255Z" fill="none" stroke="#BCD5EC" stroke-width="41"/><rect x="175" y="122" width="17" height="31" rx="5" fill="#ED9B47" transform="rotate(61 183 138)"/></svg></section>'''
body=SYMBOLS+''.join(f'<figure class="study">{screen}<figcaption><strong>{label}</strong>{desc}</figcaption></figure>'for label,desc,screen in frames)+f'<figure class="study">{iconhtml}<figcaption><strong>09 / The icon</strong>An elevated crossover, reduced to one recognisable physical idea.</figcaption></figure>'
script=(ROOT/'assets/a2/ui.js').read_text() if (ROOT/'assets/a2/ui.js').exists()else''
page=f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vantage A — spectator and enthusiast concepts</title><link rel="stylesheet" href="file://{DEVICE}/device.css"><link rel="stylesheet" href="assets/fonts.css"><style>{CSS}</style></head><body>{body}<script src="assets/positions.js"></script><script src="assets/a2/concept-data.js"></script><script>window.FOLLOW_PROJECTION={json.dumps(json.loads((ROOT/"assets/a2/motion.json").read_text())["followDriverPositions"]["NOR"])};{script}</script><script src="file://{DEVICE}/device.js"></script></body></html>'
(ROOT/'mockup.html').write_text(page)
print('Built',ROOT/'mockup.html','with',len(frames),'frames plus icon')
