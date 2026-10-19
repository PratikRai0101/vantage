import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import glyphAtlas from './label-glyphs.json';

/** Original open-wheel miniature, +X forward. Batched to five materials per car. */
export function carModel(color: string): THREE.Group {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: .38, metalness: .12 });
  const carbon = new THREE.MeshStandardMaterial({ color: '#172023', roughness: .68 });
  const tire = new THREE.MeshStandardMaterial({ color: '#101719', roughness: .98 });
  const silver = new THREE.MeshStandardMaterial({ color: '#819394', metalness: .5, roughness: .4 });
  const helmet = new THREE.MeshStandardMaterial({ color: '#d7dfcb', roughness: .42 });
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const add = (geo: THREE.BufferGeometry, pos: [number, number, number], material: THREE.Material) => {
    geo.translate(...pos);
    // Cars are untextured; lofted bodies and primitives must share attributes.
    geo.deleteAttribute('uv');
    const list = batches.get(material) ?? []; list.push(geo.index ? geo.toNonIndexed() : geo); batches.set(material, list);
    if (geo.index) geo.dispose();
  };
  const box = (size: [number, number, number], pos: [number, number, number], mat: THREE.Material) => add(new THREE.BoxGeometry(...size), pos, mat);
  // Cross-section loft: angled sidepods and a rising engine cover, not stacked cubes.
  const body = (sections: [number, number, number, number][], mat: THREE.Material) => {
    const positions: number[] = [], indices: number[] = [];
    sections.forEach(([x, width, bottom, top]) => positions.push(x,bottom,-width, x,bottom,width, x,top,width*.72, x,top,-width*.72));
    for (let s=0;s<sections.length-1;s++) for (let k=0;k<4;k++) {
      const a=s*4+k,b=s*4+(k+1)%4,c=b+4,d=a+4; indices.push(a,b,d,b,c,d);
    }
    indices.push(0,3,2,0,2,1);
    const last=(sections.length-1)*4; indices.push(last,last+1,last+2,last,last+2,last+3);
    // Cross-sections run clockwise when viewed from +X; reverse each triangle
    // so the painted shell faces out, rather than vanishing under backface culling.
    for(let i=0;i<indices.length;i+=3) [indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); geo.setIndex(indices); geo.computeVertexNormals(); add(geo,[0,0,0],mat);
  };
  box([1.7,.055,.73],[-.05,.16,0],carbon);
  body([[-.83,.12,.19,.27],[-.55,.32,.19,.35],[-.10,.32,.18,.39],[.30,.17,.17,.31],[.95,.065,.13,.20]],paint);
  body([[-.67,.13,.27,.35],[-.30,.15,.32,.56],[-.08,.10,.32,.50],[.18,.095,.29,.37]],paint);
  box([.35,.03,.22],[.18,.385,0],carbon);
  // Front wing, twin rear planes and end plates.
  for (const x of [.83,.98]) box([.12,.032,.99],[x,.14+(x-.83)*.14,0],carbon);
  for (const z of [-.49,.49]) box([.24,.10,.025],[.91,.17,z],paint);
  box([.23,.035,.88],[-.83,.49,0],paint);
  box([.18,.03,.81],[-.82,.41,0],carbon);
  for (const z of [-.43,.43]) box([.27,.16,.025],[-.83,.45,z],paint);
  box([.035,.23,.045],[-.80,.32,0],carbon);
  // Wheels and recessed hubs. A darker shoulder gives them a deliberate silhouette.
  for (const x of [-.56,.58]) for (const z of [-.42,.42]) {
    const wheel = new THREE.CylinderGeometry(.175,.175,.18,20); wheel.rotateX(Math.PI/2); add(wheel,[x,.175,z],tire);
    const hub = new THREE.CylinderGeometry(.073,.073,.184,14); hub.rotateX(Math.PI/2); add(hub,[x,.175,z],silver);
    const strut = new THREE.CylinderGeometry(.016,.016,.28,5); strut.rotateX(Math.PI/2); add(strut,[x,.22,z*.6],carbon);
  }
  const halo = new THREE.TorusGeometry(.14,.017,5,20,Math.PI*1.5); halo.rotateX(Math.PI/2); halo.rotateY(Math.PI/4); add(halo,[.15,.46,0],carbon);
  const head = new THREE.SphereGeometry(.069,10,7); add(head,[.08,.443,0],helmet);
  box([.025,.10,.02],[.29,.41,0],carbon);
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries, false);
    if (!merged) throw new Error('Miniature car geometry could not be batched');
    const mesh = new THREE.Mesh(merged,material); group.add(mesh); geometries.forEach(g=>g.dispose());
  }
  group.scale.setScalar(1.12);
  return group;
}

export function fieldMarker(color: string) {
  const size=32, pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const i=(y*size+x)*4; pixels[i]=pixels[i+1]=pixels[i+2]=255;
    pixels[i+3]=Math.round(255*THREE.MathUtils.clamp(14-Math.hypot(x-15.5,y-15.5),0,1));
  }
  const map=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat); map.magFilter=THREE.LinearFilter; map.needsUpdate=true;
  const marker=new THREE.Sprite(new THREE.SpriteMaterial({map,color,depthTest:false,depthWrite:false,transparent:true,toneMapped:false})); marker.renderOrder=5; return marker;
}

export function selectionRing(color: string, outer=1.23) {
  const ring=new THREE.Mesh(new THREE.RingGeometry(outer-.075,outer,64),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,depthWrite:false,transparent:true,opacity:.75}));
  ring.rotation.x=-Math.PI/2; ring.renderOrder=3; return ring;
}

/** Rasterised from the bundled OFL IBM Plex Mono, with real antialiased glyphs.
 * No browser canvas, image decoder or per-frame React work. */
export function driverLabel(text: string) {
  const chars=text.toUpperCase().slice(0,3), width=chars.length*20+24, height=48;
  const pixels=new Uint8Array(width*height*4);
  const glyphs=glyphAtlas.glyphs as Record<string,number[]>;
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const i=(y*width+x)*4;
    const distance=Math.hypot(Math.max(Math.abs(x-width/2)-(width/2-8),0),Math.max(Math.abs(y-height/2)-(height/2-8),0))-8;
    // Powder-blue rim, charcoal interior; the car retains its team colour.
    const rim = distance > -1.8;
    pixels[i]=rim?188:24; pixels[i+1]=rim?213:34; pixels[i+2]=rim?236:36;
    pixels[i+3]=Math.round(245*THREE.MathUtils.clamp(.5-distance,0,1));
  }
  for(let c=0;c<chars.length;c++) {
    const glyph=glyphs[chars[c]]??glyphs['0'];
    for(let y=0;y<38;y++) for(let x=0;x<20;x++) {
      const i=((height-6-y)*width+12+c*20+x)*4, a=glyph[y*20+x]/255;
      for(let k=0;k<3;k++) pixels[i+k]=Math.round(pixels[i+k]*(1-a)+[230,239,232][k]*a);
    }
  }
  const texture=new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=THREE.LinearFilter; texture.minFilter=THREE.LinearFilter; texture.needsUpdate=true;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,transparent:true,toneMapped:false}));
  sprite.renderOrder=10; sprite.userData.labelAspect=width/height; return sprite;
}

export function driverTether() {
  const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
  const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#BCD5EC',transparent:true,opacity:.55,depthTest:false,depthWrite:false,toneMapped:false}));
  line.renderOrder=9; return line;
}

/** Soft physical contact beneath cars, not an emissive halo or a fake shadow map. */
export function carContactShadow() {
  const size=32, pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const d=Math.hypot((x-15.5)/15,(y-15.5)/15),i=(y*size+x)*4;
    pixels[i+3]=Math.round(90*Math.max(0,1-d)**1.8);
  }
  const map=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat); map.needsUpdate=true;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.6),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  mesh.rotation.x=-Math.PI/2; return mesh;
}

export function disposeTree(root: THREE.Object3D) {
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  root.traverse(object=>{
    // Instance attributes belong to the mesh, not its shared geometry.
    if(object instanceof THREE.InstancedMesh)object.dispose();
    const mesh=object as THREE.Mesh;
    if(mesh.geometry) geometries.add(mesh.geometry);
    if(mesh.material) for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]) {
      materials.add(material); for(const value of Object.values(material)) if(value instanceof THREE.Texture) textures.add(value);
    }
  });
  textures.forEach(t=>t.dispose()); materials.forEach(m=>m.dispose()); geometries.forEach(g=>g.dispose()); root.clear();
}
