import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nativeRendererParameters } from '../src/scene/gl-adapter';

test('EXGL WebGL2 is acquired through the WebGL2 canvas path, not Three’s WebGL1 instanceof guard', () => {
  // SDK58 EXGL makes WebGL2 inherit WebGL1; this is not a simulated GPU test.
  class WebGL1 {}
  class ExpoWebGL2 extends WebGL1 { drawingBufferWidth = 1206; drawingBufferHeight = 1020; }
  const native = new ExpoWebGL2();
  assert.ok(native instanceof WebGL1);
  const options = nativeRendererParameters(native as unknown as WebGL2RenderingContext);
  assert.equal(Object.hasOwn(options, 'context'), false, 'explicit context triggers Three r180’s WebGL1 rejection');
  const host = options.canvas as HTMLCanvasElement;
  assert.equal(host.getContext('webgl2'), native);
  assert.equal(host.getContext('webgl'), null, 'must never fall back to WebGL1');
});
