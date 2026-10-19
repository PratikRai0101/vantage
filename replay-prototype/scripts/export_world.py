"""Export the approved A miniature WITHOUT static demo cars. No original assets changed.
Run with Blender --background --python replay-prototype/scripts/export_world.py
"""
from pathlib import Path
import re,json,math
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'replay-prototype/data';OUT.mkdir(exist_ok=True)
original=ROOT/'scripts/render_circuits.py'
source=original.read_text().split('args=sys.argv[')[0]
source=re.sub(r'^ cars=\[.*$', ' cars=[]',source,flags=re.M)
cut=source.index(" out=os.path.join(ROOT,'assets','circuit-'+style+'.png')")
source=source[:cut]+''' bpy.ops.export_scene.gltf(filepath=OUTPUT,export_format='GLB',export_cameras=False,export_lights=False,export_extras=True)
 print('EXPORTED_CAR_FREE_WORLD',OUTPUT,flush=True)
'''
ns={'__file__':str(original),'OUTPUT':str(OUT/'suzuka-world.glb')}
exec(compile(source,str(original),'exec'),ns)
ns['render']('a')
# Store centreline in both authoring XY/Z-up and Three.js XZ/Y-up conventions.
path=ns['path'];lengths=ns['lengths'];total=ns['total']
data={'model':'Vantage A, illustrative elevation; enlarged road and miniature scale','coordinates':'Three.js x,y,z, where y is height','points':[[round(p.x,5),round(p.z+.10,5),round(-p.y,5)]for p in path],'lengths':lengths,'length':total,'source':'MIT-licensed bacinger/f1-circuits Suzuka plan; original authored 3D world'}
(OUT/'track.json').write_text(json.dumps(data,separators=(',',':')))
