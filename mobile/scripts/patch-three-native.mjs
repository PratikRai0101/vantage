// Three r180's WebGPU texture sizing assumes WebCodecs exists. Hermes does not
// implement VideoFrame. Guard the browser-only branch; do NOT fabricate a global
// class or advertise video support. Remove this pin when upgrading to a fixed Three.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const three = resolve(root, 'node_modules/three');
const { version } = JSON.parse(readFileSync(resolve(three, 'package.json'), 'utf8'));
if (version !== '0.180.0') throw new Error(`Review the native VideoFrame guard before upgrading Three ${version}`);
for (const [file, name] of [
  ['src/textures/Source.js', 'data'],
  ['src/renderers/common/Textures.js', 'image'],
  ['build/three.cjs', 'data'],
  ['build/three.core.js', 'data'],
  ['build/three.webgpu.js', 'image'],
  ['build/three.webgpu.nodes.js', 'image'],
]) {
  const path = resolve(three, file);
  const before = `} else if ( ${name} instanceof VideoFrame ) {`;
  const after = `} else if ( typeof VideoFrame !== 'undefined' && ${name} instanceof VideoFrame ) {`;
  const source = readFileSync(path, 'utf8');
  if (source.includes(after)) continue;
  if (source.split(before).length !== 2) throw new Error(`Unexpected Three source: ${file}`);
  writeFileSync(path, source.replace(before, after));
}
console.log('Three 0.180.0: guarded browser-only VideoFrame checks for native texture sizing.');
