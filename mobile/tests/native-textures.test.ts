import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Source, Vector3, DataTexture } from 'three';
// The installed r180 WebGPU size helper is the call site that failed on Hermes.
import Textures from 'three/src/renderers/common/Textures.js';

test('Three source dimensions do not require the browser-only VideoFrame global', () => {
  assert.equal(typeof VideoFrame, 'undefined');
  const size = new Source({ width: 32, height: 16 }).getSize(new Vector3());
  assert.deepEqual(size.toArray(), [32, 16, 0]);
});

test('WebGPU data-texture sizing works on a host without WebCodecs', () => {
  const texture = new DataTexture(new Uint8Array(32 * 16 * 4), 32, 16);
  type Args = ConstructorParameters<typeof Textures>;
  const textures = new Textures({} as Args[0], {} as Args[1], {} as Args[2]);
  const size = textures.getSize(texture);
  assert.equal(size.width, 32);
  assert.equal(size.height, 16);
});
