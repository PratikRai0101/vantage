"""Scan a Note20 native screen recording for sustained lost/black miniature.
4fps sampling catches >=250ms outages, NOT every bad frame, GPU timing or ghosting.
Requires ffmpeg + numpy. Run only on the app-only sweep, not launcher/tab videos.
"""
import subprocess,sys,json
import numpy as np
path=sys.argv[1]
data=subprocess.check_output(['ffmpeg','-v','error','-i',path,'-vf','fps=4,crop=720:638:0:350,scale=128:113','-f','rawvideo','-pix_fmt','rgb24','-'])
frames=np.frombuffer(data,dtype=np.uint8).reshape(-1,113,128,3).astype(np.float32)
r,g,b=frames[:,:,:,0],frames[:,:,:,1],frames[:,:,:,2]
terrain=((g>55)&(g>r*1.07)&(g>b*1.04)).mean(axis=(1,2))
dark=(frames.max(axis=3)<55).mean(axis=(1,2))
bad=np.flatnonzero((terrain<.025)&(dark>.92))
result={'samples':len(frames),'samplingHz':4,'worstTerrain':float(terrain.min()),'worstDark':float(dark.max()),'suspectSeconds':(bad/4).tolist(),'gpuPerformanceMeasured':False}
print(json.dumps(result,indent=2))
if len(bad):raise SystemExit('FAIL: possible lost/black scene; inspect these video timestamps')
print('PASS: no sustained all-black scene in sampled recording; shorter faults/ghosting NOT excluded')
