"""Shared authored Suzuka geometry; illustrative, not a surveyed digital twin.
Loaded by export_track.py and mobile/scripts/export_studio_world.py; see the
pipeline README. Literal source markers are retained for the native exporter.
All structures/materials are authored here. Plan geometry: bacinger/f1-circuits.
"""
import bpy, math, json, random, sys, os
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
random.seed(47)
raw = json.load(open(os.path.join(ROOT, 'geometry', 'suzuka.geojson')))['features'][0]['geometry']['coordinates']
x0=(min(p[0] for p in raw)+max(p[0] for p in raw))/2
y0=(min(p[1] for p in raw)+max(p[1] for p in raw))/2
sx=100/(max(p[0] for p in raw)-min(p[0] for p in raw))
sy=sx/math.cos(math.radians(y0))
pts=[Vector(((x-x0)*sx,(y-y0)*sy,0)) for x,y in raw]
if (pts[0]-pts[-1]).length < .01: pts.pop()
# Smooth the digitised line without replacing its recognisable outline.
path=[]; indices=[]
for i in range(len(pts)):
 a,b,c,d=[pts[k%len(pts)] for k in (i-1,i,i+1,i+2)]
 for j in range(6):
  t=j/6
  q=.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)
  # A visible grade-separated crossover. Elevation is art-directed, not measured.
  idx=i+t
  q.z=.35 + 3.2*math.exp(-((idx-137.4)/8.3)**2)
  path.append(q); indices.append(idx)
lengths=[0]
for i in range(1,len(path)+1): lengths.append(lengths[-1]+(path[i%len(path)]-path[i-1]).length)
total=lengths[-1]

def sample(f):
 dist=(f%1)*total
 import bisect
 i=min(len(path)-1,bisect.bisect_right(lengths,dist)-1)
 t=(dist-lengths[i])/(lengths[i+1]-lengths[i])
 p=path[i].lerp(path[(i+1)%len(path)],t)
 v=(path[(i+1)%len(path)]-path[i]).normalized()
 return p, math.atan2(v.y,v.x)

PALETTES={
 'a':dict(base='#202B2C',land='#48584A',patch='#4D5E4E',road='#31383D',curb='#DBDCD2',red='#BA6255',trim='#9AABB0',building='#B0BABB',window='#324D5C',tree='#314A3C',tree2='#58705A',seat='#6C8290',camera=(88,-125,102),width=136,world='#8195A5',energy=170000,light=(-45,-75,100),rough=.83),
 'b':dict(base='#DCE7E5',land='#B8CEAA',patch='#C0D3B2',road='#535E64',curb='#F5F7ED',red='#D67E60',trim='#E0E8E4',building='#F2F4EC',window='#7897A4',tree='#638F71',tree2='#8EB184',seat='#A1BDC9',camera=(36,-70,152),width=133,world='#CAD7E0',energy=210000,light=(-45,-70,110),rough=.92),
 'c':dict(base='#C3A86C',land='#277568',patch='#2B7B6C',road='#E9DAB3',curb='#F6E9C7',red='#B9A06B',trim='#DAC393',building='#F3E5BC',window='#6D9B88',tree='#18594D',tree2='#408D75',seat='#DDCAA2',camera=(-75,-125,115),width=135,world='#7CA993',energy=190000,light=(-65,-90,110),rough=.32)
}

def rgb(h):
 h=h.lstrip('#'); v=[int(h[i:i+2],16)/255 for i in (0,2,4)]
 return tuple(((a+.055)/1.055)**2.4 if a>.04045 else a/12.92 for a in v)+(1,)

def render(style):
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
 pal=PALETTES[style]; batches={}; materials={}
 def mat(name,h,rough=None,metal=0):
  m=bpy.data.materials.new(name);m.diffuse_color=rgb(h);m.use_nodes=True
  s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=rgb(h);s.inputs['Roughness'].default_value=pal['rough'] if rough is None else rough;s.inputs['Metallic'].default_value=metal
  materials[name]=m;return m
 for k in ['base','land','patch','road','curb','red','trim','building','window','tree','tree2','seat']:mat(k,pal[k])
 mat('rubber','#151D22',.8);mat('cockpit','#12242D',.35);mat('white','#EEEFE6',.34);mat('orange','#F18B28',.3);mat('navy','#294F8A',.3);mat('ferrari','#C9423D',.3);mat('silver','#5EC9B4',.3);mat('blue','#6C99C9',.3);mat('black','#293A40',.3);mat('green','#518B67',.3);mat('pink','#DD8DB3',.3);mat('yellow','#D2C04F',.3);mat('wheel-red','#B55947',.4)
 def mesh(name,verts,faces,material):
  m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);o.data.materials.append(materials[material]);return o
 def batch_geo(verts,faces,m):
  vs,fs=batches.setdefault(m,([],[]));n=len(vs);vs.extend(verts);fs.extend([tuple(n+i for i in f) for f in faces])
 def box(c,d,m,angle=0):
  cx,cy,cz=c;dx,dy,dz=[v/2 for v in d];co=math.cos(angle);si=math.sin(angle)
  vs=[]
  for x,y,z in [(-dx,-dy,-dz),(dx,-dy,-dz),(dx,dy,-dz),(-dx,dy,-dz),(-dx,-dy,dz),(dx,-dy,dz),(dx,dy,dz),(-dx,dy,dz)]:vs.append((cx+x*co-y*si,cy+x*si+y*co,cz+z))
  batch_geo(vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],m)
 def cylinder(c,r,depth,m,n=12,axis=(0,0,1)):
  axis=Vector(axis).normalized();u=axis.cross(Vector((1,0,0)))
  if u.length<.01:u=axis.cross(Vector((0,1,0)))
  u.normalize();v=axis.cross(u).normalized();c=Vector(c);vs=[]
  for sign in [-1,1]:
   for i in range(n):vs.append(tuple(c+axis*depth*.5*sign+r*(u*math.cos(i*2*math.pi/n)+v*math.sin(i*2*math.pi/n))))
  faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)]
  batch_geo(vs,faces,m)
 def rod(a,b,r,m,n=8):
  a=Vector(a);b=Vector(b);cylinder((a+b)/2,r,(b-a).length,m,n,b-a)
 def ribbon(points,offset,width,m,zadd=0,closed=True):
  vs=[];count=len(points)
  for i,p in enumerate(points):
   prev=points[(i-1)%count] if closed or i>0 else p
   nex=points[(i+1)%count] if closed or i<count-1 else p
   tang=(nex-prev); tang.z=0;tang.normalize();nor=Vector((-tang.y,tang.x,0))
   for s in [-.5,.5]:vs.append(tuple(p+nor*(offset+width*s)+Vector((0,0,zadd))))
  fs=[(2*i,2*i+1,2*((i+1)%count)+1,2*((i+1)%count))for i in range(count if closed else count-1)]
  return mesh('strip-'+m,vs,fs,m)
 def bevel_cube(name,c,d,m,bevel):
  bpy.ops.mesh.primitive_cube_add(size=1,location=c);o=bpy.context.object;o.name=name;o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(materials[m]);mod=o.modifiers.new('Machined edges','BEVEL');mod.width=bevel;mod.segments=5;mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
 # The terrain is one physical island, with a layered edge rather than a flat map.
 bevel_cube('Solid terrain plinth',(0,0,-2.85),(114,68,5.1),'base',4.3)
 bevel_cube('Ground',(0,0,-.6),(112.8,66.8,1.65),'land',3.8)
 # Designed mowing stripes belong to the miniature, not to the interface.
 for x in range(-47,50,8):box((x,0,.235),(4,58,.035),'patch')
 road_width=2.05 if style!='c' else 2.45
 ribbon(path,0,road_width+.76,'curb',.025)
 # Alternating edge kerbs, continuous white road edges and dark racing surface.
 for edge in [-1,1]:
  vs=[];fs=[]
  for i in range(0,len(path)-4,8):
   group=path[i:i+4]
   for k,p in enumerate(group):
    t=path[min(i+k+1,len(path)-1)]-path[max(i+k-1,0)];t.z=0;t.normalize();nor=Vector((-t.y,t.x,0))
    for w in [road_width/2,road_width/2+.36]:vs.append(tuple(p+nor*edge*w+Vector((0,0,.06))))
   n=len(vs)-len(group)*2
   for k in range(len(group)-1):fs.append((n+k*2,n+k*2+1,n+k*2+3,n+k*2+2))
  mesh('Painted kerbs',vs,fs,'red')
 ribbon(path,0,road_width,'road',.075)
 for edge in [-1,1]:ribbon(path,edge*(road_width*.5-.08),.055,'curb',.09)
 # The crossover has a separate road deck and visible piers.
 bridge=path[133*6:142*6]
 ribbon(bridge,0,road_width+.3,'trim',-.27,False)
 for idx in [135.5,139.0]:
  p=path[int(idx*6)];box((p.x,p.y,p.z/2),(1.15,1.15,p.z),'trim')
 # Pit lane, garages, glass hospitality building, and a stepped grandstand.
 p,a=sample(.006)
 def local(x,y,z):return (p.x+x*math.cos(a)-y*math.sin(a),p.y+x*math.sin(a)+y*math.cos(a),z)
 # Main straight is art-directed for readability at phone scale.
 for j in range(3):
  pp,aa=sample(.985+j*.009)
  n=Vector((-math.sin(aa),math.cos(aa),0));q=pp+n*3.7
  box((q.x,q.y,.63),(4.7,1.9,1.1),'building',aa)
  box((q.x,q.y,1.27),(4.85,2.1,.18),'trim',aa)
  box((q.x,q.y,1.02),(4.1,1.96,.27),'window',aa)
  for k in [-1.6,-.8,0,.8,1.6]:box((q.x+k*math.cos(aa),q.y+k*math.sin(aa),.58),(.08,1.96,.65),'window',aa)
 # Seating opposite the pit complex; horizontal slats catch the key light.
 pp,aa=sample(.008);n=Vector((-math.sin(aa),math.cos(aa),0));q=pp-n*5.8
 for k in range(7):
  v=q+n*k*.32;box((v.x,v.y,.45+k*.14),(13,.45,.27),'seat',aa)
 for j in [-5.5,0,5.5]:
  v=q+Vector((math.cos(aa),math.sin(aa),0))*j;rod((v.x,v.y,.2),(v.x,v.y,2.4),.09,'trim')
 box((q.x,q.y,2.5),(14.2,3.3,.16),'building',aa)
 # Suzuka's wheel, modelled as spokes and gondolas, supplies a recognisable landmark.
 pp,aa=sample(.026);n=Vector((-math.sin(aa),math.cos(aa),0));q=pp-n*12
 if abs(q.x)<51 and abs(q.y)<28:
  centre=Vector((q.x,q.y,4.0));R=3.1
  for j in range(24):
   t=2*math.pi*j/24;u=2*math.pi*(j+1)/24
   a1=centre+Vector((R*math.cos(t),0,R*math.sin(t)));b1=centre+Vector((R*math.cos(u),0,R*math.sin(u)))
   rod(a1,b1,.07,'wheel-red');rod(centre,a1,.035,'trim')
   if j%2==0:box((a1.x,a1.y,a1.z-.14),(.45,.5,.48),'building')
  for dy in [-1.1,1.1]:
   for dx in [-1.4,1.4]:rod((q.x+dx,q.y+dy,.3),centre,.1,'trim')
 # A few service structures and spectator footbridges; no irrelevant city geometry.
 for f in [.42,.58,.64]:
  pp,aa=sample(f);n=Vector((-math.sin(aa),math.cos(aa),0));v=pp+n*4.1
  box((v.x,v.y,.73),(2.6,2,1.15),'building',aa);box((v.x,v.y,1.35),(2.8,2.2,.13),'trim',aa)
 # Trees, grown as compact, faceted crowns in a single art direction.
 def tree(x,y,scale=1):
  cylinder((x,y,.5),.13*scale,.9*scale,'base',7)
  rings=[(.42,0),(.65,.63),(.48,1.2),(.1,1.7)]
  vs=[]
  for r,z in rings:
   for k in range(7):
    t=k*math.tau/7;vs.append((x+math.cos(t)*r*scale,y+math.sin(t)*r*scale,.6+z*scale))
  fs=[]
  for j in range(3):
   for k in range(7):fs.append((j*7+k,j*7+(k+1)%7,(j+1)*7+(k+1)%7,(j+1)*7+k))
  fs.append(tuple(range(21,28)))
  batch_geo(vs,fs,'tree' if random.random()<.6 else 'tree2')
 random.seed(29)
 coarse=path[::6]
 for i in range(420 if style!='c' else 150):
  x=random.uniform(-50,50);y=random.uniform(-27,27)
  if min((x-v.x)**2+(y-v.y)**2 for v in coarse)<13:continue
  # Preserve a clear apron around the pit straight.
  if x>33 and y<5:continue
  tree(x,y,random.uniform(.7,1.35))
 # Tiny barrier posts and horizontal rail on selected outer arcs.
 for start,end in [(22,59),(74,96),(102,121),(149,165)]:
  pp=path[start*6:end*6:3]
  vs=[]
  for i,p0 in enumerate(pp):
   v=pp[min(i+1,len(pp)-1)]-pp[max(i-1,0)];v.z=0
   if v.length<.001:continue
   v.normalize();n=Vector((-v.y,v.x,0));q=p0+n*(road_width/2+1.1)
   if i%3==0:rod(q+Vector((0,0,-.15)),q+Vector((0,0,.52)),.035,'trim')
   vs.append(q+Vector((0,0,.35)))
  for i in range(len(vs)-1):rod(vs[i],vs[i+1],.045,'trim',6)
 # Race positions: a deliberately simulated field, never represented as a live feed.
 cars=[('NOR',.799,'orange'),('VER',.799-1.842/91,'navy'),('PIA',.799-4.106/91,'orange'),('LEC',.718,'ferrari'),('RUS',.691,'silver'),('HAM',.666,'ferrari'),('ANT',.63,'silver'),('ALO',.602,'green'),('SAI',.571,'blue'),('ALB',.545,'blue'),('GAS',.51,'pink'),('HAD',.48,'navy'),('LAW',.455,'white'),('BEA',.42,'white'),('OCO',.391,'white'),('HUL',.36,'yellow'),('BOR',.329,'yellow'),('STR',.289,'green'),('COL',.258,'pink'),('BOT',.223,'black'),('PER',.19,'black'),('LIN',.147,'white')]
 positions={}
 for name,f,m in cars:
  pp,aa=sample(f)
  def v(x,y,z):return (pp.x+x*math.cos(aa)-y*math.sin(aa),pp.y+x*math.sin(aa)+y*math.cos(aa),pp.z+z+.10)
  # Detailed open-wheel silhouettes, slightly exaggerated for a 402pt overview.
  box(v(-.1,0,.28),(1.45,.61,.24),m,aa)
  box(v(.73,0,.23),(1.0,.22,.15),m,aa)
  box(v(-.77,0,.41),(.57,.48,.27),m,aa)
  box(v(-1.05,0,.44),(.22,1.36,.13),m,aa)
  box(v(1.03,0,.17),(.22,1.3,.09),m,aa)
  box(v(-.15,0,.44),(.49,.31,.12),'cockpit',aa)
  for xx in [-.70,.70]:
   for yy in [-.53,.53]:
    cylinder(v(xx,yy,.24),.24,.22,'rubber',12,(-math.sin(aa),math.cos(aa),0))
    cylinder(v(xx,yy*1.22,.24),.115,.015,'trim',10,(-math.sin(aa),math.cos(aa),0))
  # Halo and rear endplates.
  for yy in [-.62,.62]:box(v(-1.05,yy,.44),(.4,.06,.25),m,aa)
  for yy in [-.15,.15]:rod(v(-.40,yy,.43),v(.12,yy,.57),.034,'cockpit')
  rod(v(.12,-.15,.57),v(.12,.15,.57),.034,'cockpit')
  positions[name]=pp+Vector((0,0,.6))
 # Chequered start line, small enough to read as a material detail.
 p,a=sample(0)
 for x in range(2):
  for y in range(8):
   yy=(y-3.5)*road_width/8;xx=x*.13-.13
   q=p+Vector((math.cos(a)*xx-math.sin(a)*yy,math.sin(a)*xx+math.cos(a)*yy,.11))
   box(q,(.14,road_width/8,.025),'curb' if (x+y)%2 else 'road',a)
 for m,(vs,fs) in batches.items():mesh('Instances-'+m,vs,fs,m)
 # Orthographic studio render: enough perspective to show thickness, no distortion.
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
 scene.cycles.max_bounces=5;scene.cycles.diffuse_bounces=3;scene.cycles.glossy_bounces=3
 scene.render.resolution_x=1500;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
 scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
 world=bpy.data.worlds.new('Studio');scene.world=world;world.use_nodes=True
 bg=world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=rgb(pal['world']);bg.inputs['Strength'].default_value=.65 if style!='a' else .48
 def area(name,loc,energy,size,color):
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
 area('Softbox',pal['light'],pal['energy'],75,(1.0,.96,.89))
 area('Fill',(65,65,80),pal['energy']*.6,65,(.80,.90,1))
 bpy.ops.object.camera_add(location=pal['camera']);cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.2))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=pal['width'];scene.camera=cam
 scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.25 if style=='a' else .1
 # Enable Apple GPU if available, otherwise leave a reliable CPU fallback.
 try:
  prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
  gpu=False
  for dev in prefs.devices:dev.use=(dev.type!='CPU');gpu|=dev.use
  if gpu:scene.cycles.device='GPU'
 except Exception:pass
 bpy.context.view_layer.update()
 projected={}
 for name,p in positions.items():
  q=world_to_camera_view(scene,cam,p);projected[name]=[round(q.x,5),round(1-q.y,5)]
 out=os.path.join(ROOT,'assets','circuit-'+style+'.png');scene.render.filepath=out
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets','circuit-'+style+'.blend'))
 json.dump(projected,open(os.path.join(ROOT,'assets','positions-'+style+'.json'),'w'),indent=2)
 bpy.ops.render.render(write_still=True)
 print('RENDER_COMPLETE',style,out,flush=True)

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['a','b','c']
for style in args:render(style)
