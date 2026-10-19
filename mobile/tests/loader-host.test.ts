import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { prepareLoaderHost } from '../src/scene/loader-host';

const emptyGlbJson = JSON.stringify({ asset: { version: '2.0' }, scenes: [{ nodes: [] }], scene: 0 });
test('real GLTFLoader handles RN navigator without a browser userAgent', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const nativeHost = { product: 'ReactNative' };
  Object.defineProperty(globalThis, 'navigator', { value: nativeHost, configurable: true });
  try {
    await assert.rejects(new GLTFLoader().parseAsync(emptyGlbJson, ''), /match/);
    prepareLoaderHost(nativeHost);
    const parsed = await new GLTFLoader().parseAsync(emptyGlbJson, '');
    assert.equal(parsed.scene.type, 'Group');
    assert.equal((nativeHost as { userAgent?: string }).userAgent, 'ReactNative');
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});
test('loader host preparation preserves existing user agent', () => {
  const host = { userAgent: 'Real browser metadata' };
  prepareLoaderHost(host);
  assert.equal(host.userAgent, 'Real browser metadata');
});
