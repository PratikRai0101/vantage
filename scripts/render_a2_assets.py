"""Blender 5.1: original A-world camera journey and miniature car detail.
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/render_a2_assets.py
Then python3 scripts/capture_a2_motion.py
"""
import bpy, os, sys, json, math
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets','a2');os.makedirs(OUT,exist_ok=True)
# Reuse exact source's geospatial spline and progress sampling, without running its renderer.
ns={'__file__':os.path.join(ROOT,'scripts','render_circuits.py')}
source=open(ns['__file__']).read().split("args=sys.argv[")[0]
exec(compile(source,ns['__file__'],'exec'),ns)
sample=ns['sample']; rgb=ns['rgb']
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'assets','circuit-a.blend'))
scene=bpy.context.scene;cam=scene.camera
# Refine the original miniature: no vegetation may intersect the road or any car.
# Each disconnected crown/trunk is one component in the original material batches.
import bmesh
road_points=ns['path']
for obj in list(scene.objects):
 if obj.type!='MESH' or obj.name not in ['Instances-tree','Instances-tree2','Instances-base']:continue
 bm=bmesh.new();bm.from_mesh(obj.data);seen=set();remove=[]
 for vert in list(bm.verts):
  if vert in seen:continue
  todo=[vert];component=[];seen.add(vert)
  while todo:
   v=todo.pop();component.append(v)
   for edge in v.link_edges:
    other=edge.other_vert(v)
    if other not in seen:seen.add(other);todo.append(other)
  x=sum(v.co.x for v in component)/len(component);y=sum(v.co.y for v in component)/len(component)
  if min((x-p.x)**2+(y-p.y)**2 for p in road_points)<2.2**2:remove.extend(component)
 if remove:bmesh.ops.delete(bm,geom=remove,context='VERTS')
 bm.to_mesh(obj.data);bm.free();obj.data.update()
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.use_persistent_data=True
try:
 p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='METAL';p.get_devices()
 gpu=False
 for d in p.devices:d.use=d.type!='CPU';gpu|=d.use
 if gpu:scene.cycles.device='GPU'
except Exception:pass
start_pos=cam.location.copy();start_rot=cam.rotation_euler.to_quaternion();start_scale=cam.data.ortho_scale
nor,heading=sample(.799)
tangent=Vector((math.cos(heading),math.sin(heading),0));side=Vector((-tangent.y,tangent.x,0))
# A trailing three-quarter aerial, never an onboard camera. The modest field retains kerbs,
# miniature trees, terrain stripes, and neighbouring cars as spatial anchors.
target=nor+tangent*1.2+Vector((0,0,.4))
end_pos=target-tangent*17-side*10+Vector((0,0,19))
end_rot=(target-end_pos).to_track_quat('-Z','Y');end_scale=22.0
cars=[('NOR',.799),('VER',.799-1.842/91),('PIA',.799-4.106/91),('LEC',.718),('RUS',.691),('HAM',.666),('ANT',.63),('ALO',.602),('SAI',.571),('ALB',.545),('GAS',.51),('HAD',.48),('LAW',.455),('BEA',.42),('OCO',.391),('HUL',.36),('BOR',.329),('STR',.289),('COL',.258),('BOT',.223),('PER',.19),('LIN',.147)]
def projections():
 bpy.context.view_layer.update();out={}
 for name,f in cars:
  p,_=sample(f);q=world_to_camera_view(scene,cam,p+Vector((0,0,.6)))
  out[name]={'x':round(q.x,6),'y':round(1-q.y,6),'visible':0<=q.x<=1 and 0<=q.y<=1}
 return out
def render(name,w,h,samples=12):
 scene.render.resolution_x=w;scene.render.resolution_y=h;scene.cycles.samples=samples
 scene.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)
render('overview',1500,1200,32)
frames=[];N=30
for i in range(N):
 u=i/(N-1);t=u*u*(3-2*u)
 cam.location=start_pos.lerp(end_pos,t)
 # Track a continuously travelling point of interest instead of slerping endpoint
 # orientations: this keeps the selected car in view through the whole dolly/orbit.
 aim=Vector((0,0,.2)).lerp(target,t)
 cam.rotation_euler=(aim-cam.location).to_track_quat('-Z','Y').to_euler()
 # Exponential focal travel avoids a last-frame lurch as the camera approaches the car.
 cam.data.ortho_scale=math.exp(math.log(start_scale)*(1-t)+math.log(end_scale)*t)
 scene.render.resolution_x=400;scene.render.resolution_y=300
 frames.append({'index':i,'cameraPosition':list(cam.location),'cameraQuaternion':list(cam.rotation_euler.to_quaternion()),'orthoScale':cam.data.ortho_scale,'drivers':projections()})
 render('frame-%02d'%i,400,300,10)
 print('A2_FRAME',i,flush=True)
render('follow',1200,840,32)
follow_proj=projections()
metadata={'frameCount':N,'cols':6,'rows':5,'frameWidth':400,'frameHeight':300,'sheetWidth':2400,'sheetHeight':1500,'order':'row-major','background':'#111A1D','renderAspect':4/3,'followAspect':10/7,'followSize':[1200,840],'suggestedCrops':{'motion':{'x':0,'y':0,'width':400,'height':300},'follow':{'x':0,'y':0,'width':1200,'height':840},'followFromLastMotionFrame':{'x':0,'y':10,'width':400,'height':280}},'suggestedTimingMs':{'forward':480,'reverse':420},'projectionCoordinates':'normalised top-left origin; x/y may be outside [0,1] when out of frame','finalDriverPositions':frames[-1]['drivers'],'followDriverPositions':follow_proj,'cameraType':'ORTHO','geometry':'A source world, with intersecting vegetation removed; static simulated 22-car field','simulation':{'NOR':.799,'VER':.799-1.842/91,'live':False},'frames':frames}
json.dump(metadata,open(os.path.join(OUT,'motion.json'),'w'),indent=2)
# Isolated car: original authored physical geometry; no official mesh or logos.
for o in list(scene.objects):
 if o.type not in ['LIGHT','CAMERA']:o.hide_render=True
mats={}
for name,color,rough,metal in [('paint','#F18B28',.32,.16),('dark','#162127',.6,0),('tire','#10161B',.86,0),('rim','#96A8AF',.3,.68),('visor','#92C2D8',.23,.35),('accent','#C7D9DE',.32,.2)]:
 m=bpy.data.materials.new('A2-'+name);m.use_nodes=True;s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=rgb(color);s.inputs['Roughness'].default_value=rough;s.inputs['Metallic'].default_value=metal;mats[name]=m

def finish(o,name,mat,bevel=0):
 o.name=name;o.data.materials.append(mats[mat])
 if bevel:
  mod=o.modifiers.new('Soft machined edges','BEVEL');mod.width=bevel;mod.segments=3
  o.modifiers.new('Weighted face normals','WEIGHTED_NORMAL')
 return o

def box(name,loc,dims,mat,bevel=.035):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,mat,bevel)
def rod(name,a,b,r,mat):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return finish(o,name,mat,.012)
def hull(name,sections,mat):
 vs=[]
 for x,w,z,h in sections:vs.extend([(x,-w/2,z-h/2),(x,w/2,z-h/2),(x,w/2,z+h/2),(x,-w/2,z+h/2)])
 fs=[(3,2,1,0)]
 for j in range(len(sections)-1):
  k=j*4
  for a in range(4):fs.append((k+a,k+(a+1)%4,k+4+(a+1)%4,k+4+a))
 fs.append(tuple(range(len(vs)-4,len(vs))));me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);return finish(o,name,mat,.045)
box('Carbon floor',(0,0,.13),(2.15,.94,.10),'dark',.07)
hull('Sculpted monocoque',[(-.98,.3,.38,.27),(-.65,.52,.45,.46),(-.25,.57,.37,.31),(.37,.37,.31,.22),(1.18,.14,.23,.13)],'paint')
for y in [-.36,.36]:
 hull('Undercut sidepod',[(-.75,.35,.28,.24),(-.30,.40,.30,.29),(.24,.26,.27,.20)],'paint').location.y=y
 box('Pod cooling channel',(-.39,y,.454),(.37,.18,.025),'dark',.018)
box('Cockpit opening',(-.12,0,.506),(.49,.32,.10),'dark',.09)
bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=.105,location=(-.19,0,.568));finish(bpy.context.object,'Unbranded helmet','accent')
box('Helmet visor',(-.105,0,.58),(.025,.14,.045),'visor',.012)
for y in [-.16,.16]:rod('Halo',(-.43,y,.52),(.14,y,.65),.027,'dark')
rod('Halo bridge',(.14,-.16,.65),(.14,.16,.65),.028,'dark');rod('Halo stem',(.14,0,.65),(.34,0,.39),.025,'dark')
for x in [-.72,.72]:
 for sign in [-1,1]:
  y=sign*.59
  for x2 in [-.14,.14]:rod('Wishbone',(x+x2,sign*.22,.23),(x,y,.25),.025,'dark')
  bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.27,depth=.23,location=(x,y,.27),rotation=(math.pi/2,0,0));finish(bpy.context.object,'Satin rubber tire','tire',.035)
  for poly in bpy.context.object.data.polygons:poly.use_smooth=True
  bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.158,depth=.014,location=(x,y+sign*.122,.27),rotation=(math.pi/2,0,0));finish(bpy.context.object,'Recessed alloy hub','rim',.015)
  bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.111,depth=.018,location=(x,y+sign*.13,.27),rotation=(math.pi/2,0,0));finish(bpy.context.object,'Dark wheel centre','dark',.01)
for z in [.18,.225]:box('Front wing aerofoil',(1.02,0,z),(.35,1.45,.045),'paint',.02)
for y in [-.70,.70]:box('Front endplate',(1.03,y,.235),(.38,.055,.16),'dark',.02)
for z in [.52,.61]:box('Rear wing aerofoil',(-1.04,0,z),(.30,1.31,.06),'paint',.025)
for y in [-.64,.64]:box('Rear endplate',(-1.03,y,.51),(.39,.055,.36),'paint',.025)
for y in [-.20,.20]:box('Rear wing pylon',(-1.03,y,.35),(.07,.05,.36),'dark',.02)
cam.location=(3.4,-4.6,2.8);cam.rotation_euler=(Vector((0,0,.3))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=3.65
render('car',1200,600,48)
print('A2_COMPLETE',OUT,flush=True)
