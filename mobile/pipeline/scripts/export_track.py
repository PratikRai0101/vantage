"""Export the original illustrative replay centreline, without a browser GLB.

Run with Blender --background --python mobile/pipeline/scripts/export_track.py.
The native model applies visual smoothing separately; replay registration must
continue to use these original authored points and lengths.
"""
from pathlib import Path
import argparse
import json
import sys

PIPELINE = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=PIPELINE.parent/'assets/replay/track.json')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
original = PIPELINE/'geometry/render_circuits.py'
# Only evaluate the original plan/elevation. No scene construction or export.
source = original.read_text().split('\ndef sample(f):')[0]
ns = {'__file__': str(original)}
exec(compile(source, str(original), 'exec'), ns)
path = ns['path']; lengths = ns['lengths']; total = ns['total']
data = {'model': 'Vantage A, illustrative elevation; enlarged road and miniature scale',
        'coordinates': 'Three.js x,y,z, where y is height',
        'points': [[round(p.x,5), round(p.z+.10,5), round(-p.y,5)] for p in path],
        'lengths': lengths, 'length': total,
        'source': 'MIT-licensed bacinger/f1-circuits Suzuka plan; original authored 3D world'}
out = args.output.resolve()
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(data, separators=(',', ':')))
print('EXPORTED_ORIGINAL_REPLAY_TRACK', out, len(path), flush=True)
