"""Native-only maquette refinement. Run with Blender --background --python ...
Reuses the approved authored plan/elevation. No replay registration changes.
Bakes ambient occlusion + soft studio contact shadows into vertex colour, so
phones need neither shadow maps nor screen-space postprocessing.
"""
from pathlib import Path
import math, re, json, random
import bpy
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[2]
source = (ROOT / 'scripts/render_circuits.py').read_text().split('args=sys.argv[')[0]
source = re.sub(r'^ cars=\[.*$', ' cars=[]', source, flags=re.M)
source = source.replace("for x in range(-47,50,8):box((x,0,.235),(4,58,.035),'patch')", "pass # no decorative mowing stripes")
# Small groves, not a random scatter across the entire island.
source = source.replace("for i in range(420 if style!='c' else 150):", "for i in range(300):")
source = source.replace("# Seating opposite the pit complex; horizontal slats catch the key light.", """# Small original roof louvres distinguish the pit structures at closer views.
  for k in [-1.5,-.75,0,.75,1.5]:
   box((q.x+k*math.cos(aa),q.y+k*math.sin(aa),1.39),(.40,1.20,.055),'window',aa)
 # Seating opposite the pit complex; horizontal slats catch the key light.""")
source = source.replace("tree(x,y,random.uniform(.7,1.35))", "\n  grove = math.sin(x*.19+y*.11) + math.cos(y*.23-x*.08)\n  if grove < -.2:continue\n  tree(x,y,random.uniform(.65,1.1))")
# Keep decorative landmark geometry clear of EVERY circuit branch, not only
# the sample from which its illustrative placement was originally offset.
source = source.replace("pal=PALETTES[style]; batches={}; materials={}", "pal=PALETTES[style]; batches={}; materials={}; landmark_obstacles=[]")
source = source.replace("  batch_geo(vs,[(0,3,2,1)", "  if m in ['building','window','seat']:landmark_obstacles.append((min(v[0] for v in vs),max(v[0] for v in vs),min(v[1] for v in vs),max(v[1] for v in vs)))\n  batch_geo(vs,[(0,3,2,1)")
source = source.replace(" if abs(q.x)<51 and abs(q.y)<28:", """ # This is a model landmark placement, never a surveyed location.
 occupied=list(landmark_obstacles)
 for f in [.42,.58,.64]:
  sp,sa=sample(f);sv=sp+Vector((-math.sin(sa),math.cos(sa),0))*4.1
  occupied.append((sv.x-2.2,sv.x+2.2,sv.y-2.2,sv.y+2.2))
 candidates=sorted([(float(x),float(y)) for x in range(-48,49) for y in range(-26,27)],key=lambda p:(p[0]-q.x)**2+(p[1]-q.y)**2)
 for x,y in candidates:
  if any(a-3.8<x<b+3.8 and c-1.6<y<d+1.6 for a,b,c,d in occupied):continue
  clearance=min(math.hypot(x-p.x,y-p.y) for p in path)
  if clearance>6:
   q=Vector((x,y,0));break
 else:raise RuntimeError('No safe landmark placement')
 print('WHEEL_CLEARANCE',tuple(q),clearance,flush=True)
 if abs(q.x)<51 and abs(q.y)<28:""")
cut = source.index(" out=os.path.join(ROOT,'assets','circuit-'+style+'.png')")
source = source[:cut] + "\n return\n"
ns = {'__file__': str(ROOT/'scripts/render_circuits.py')}
exec(compile(source, 'authored-maquette', 'exec'), ns)
ns['PALETTES']['a'].update(land='#536047', patch='#536047', base='#35453B', road='#303A3C', curb='#D6D7C6', red='#AA6152', tree='#394F3B', tree2='#526346', building='#B2B6AC', trim='#89978D', seat='#6D8285')
# Remove tiny Catmull backtracking loops from the VISUAL ribbon only. Keep its
# sample count / bridge indices, and never rewrite the recorded replay route.
original_path=list(ns['path']); radius=7
weights=[radius+1-abs(k) for k in range(-radius,radius+1)]
visual_path=[]
for i in range(len(original_path)):
 point=Vector((0,0,0))
 for k,weight in zip(range(-radius,radius+1),weights):point+=original_path[(i+k)%len(original_path)]*weight
 visual_path.append(point/sum(weights))
max_distance=0
for i,point in enumerate(original_path):
 best=1e9
 for k in range(i-20,i+21):
  a=visual_path[k%len(visual_path)];b=visual_path[(k+1)%len(visual_path)];delta=b-a
  t=max(0,min(1,(point-a).dot(delta)/max(delta.length_squared,1e-9)))
  best=min(best,(point-a-delta*t).length)
 max_distance=max(max_distance,best)
assert max_distance<.30, f'Visual smoothing exceeds road registration tolerance: {max_distance}'
ns['path']=visual_path
print('VISUAL_ROAD_MAX_SOURCE_DISTANCE',max_distance,flush=True)
ns['render']('a')

# Replace the sparse top with a softly rounded, dense sampling surface. Colours
# can now carry spatially accurate baked light around every tree and structure.
ground = bpy.data.objects.get('Ground')
ground.hide_render = True
bpy.data.objects.remove(ground, do_unlink=True)
verts=[];faces=[];lookup={}
step=1.0
for iy in range(135):
 y=-33.4+iy*66.8/134
 half_width=52.6+math.sqrt(max(0,3.8**2-max(abs(y)-29.6,0)**2))
 for ix in range(227):
  x=-half_width+ix*2*half_width/226
  lookup[ix,iy]=len(verts);verts.append((x,y,.225))
for iy in range(134):
 for ix in range(226):
  keys=[(ix,iy),(ix+1,iy),(ix+1,iy+1),(ix,iy+1)]
  if all(k in lookup for k in keys):faces.append(tuple(lookup[k] for k in keys))
mesh=bpy.data.meshes.new('Light-sampled ground');mesh.from_pydata(verts,[],faces);mesh.update()
ground=bpy.data.objects.new('Ground - baked studio surface',mesh);bpy.context.collection.objects.link(ground)
ground.data.materials.append(bpy.data.materials['land'])

# Edge below the top hides the sampling silhouette and gives the plinth a lip.
# All geometry remains illustrative; no invented surveyed track structures.
# Evaluate bevels first, then bake against one immutable scene BVH snapshot.
for obj in list(bpy.context.scene.objects):
 if obj.type != 'MESH':continue
 bpy.context.view_layer.objects.active=obj
 if obj.name == 'Instances-building':
  bevel=obj.modifiers.new('Model roof and wall arris','BEVEL');bevel.width=.065;bevel.segments=2
 for mod in list(obj.modifiers):
  bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.context.view_layer.update()
deps=bpy.context.evaluated_depsgraph_get()
# Reuse BVHs via scene.ray_cast; origin offset prevents self intersection.
directions=[]
for i in range(12):
 z=(i+.5)/12;r=math.sqrt(1-z*z);a=i*2.3999632297
 directions.append(Vector((math.cos(a)*r,math.sin(a)*r,z)))
key=Vector((-45,-75,100)).normalized()
light_directions=[]
for i in range(5):
 a=i*2.3999632297
 light_directions.append((key+Vector((math.cos(a)*.18,math.sin(a)*.18,0))).normalized())
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
for obj in objects:
 mesh=obj.data
 colors=mesh.color_attributes.new(name='StudioLight',type='FLOAT_COLOR',domain='POINT')
 matrix=obj.matrix_world; normal_matrix=matrix.to_3x3().inverted().transposed()
 for vertex in mesh.vertices:
  point=matrix@vertex.co;normal=(normal_matrix@vertex.normal).normalized();origin=point+normal*.035
  # Hemisphere AO, concentrated at contact regions rather than dirty global wash.
  occluded=0;count=0
  for direction in directions:
   if direction.dot(normal)<.05:continue
   count+=1
   hit,loc,*_=bpy.context.scene.ray_cast(deps,origin,direction,distance=3.2)
   if hit:occluded+=1-min((loc-origin).length/3.2,1)
  is_ground=obj == ground
  ao=1-(.24 if is_ground else .48)*occluded/max(count,1)
  shadow=0
  if normal.z>.2:
   for direction in light_directions:
    hit,location,*_=bpy.context.scene.ray_cast(deps,origin,direction,distance=18)
    # Road contact gets AO only; don't turn its sampling into a dark skirt.
    shadow+=int(hit and (not is_ground or location.z-origin.z>.65))
  light=ao*(1-.24*shadow/len(light_directions))
  colors.data[vertex.index].color=(light,light,light,1)
 mesh.color_attributes.active_color=colors
 print('BAKED',obj.name,len(mesh.vertices),'range',min(c.color[0] for c in colors.data),max(c.color[0] for c in colors.data),flush=True)
 # Reference via nodes makes exporter choose the actual active colour channel.
 for mat in mesh.materials:
  if not mat:continue
  mat.use_nodes=True
  # Exporter includes active COLOR_0 even when the simple material has no image.

out=ROOT/'mobile/assets/models/suzuka-world.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_cameras=False,export_lights=False,export_extras=True,export_vertex_color='NAME',export_vertex_color_name='StudioLight',export_all_vertex_colors=False)
print('NATIVE_STUDIO_WORLD',out,flush=True)
