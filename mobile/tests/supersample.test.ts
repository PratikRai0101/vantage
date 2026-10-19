import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSupersampledRenderer } from '../src/scene/supersample';

const COMPLETE = 0x8cd5;
const INCOMPLETE = 0x8cd6;

function harness(status: number | number[] = COMPLETE) {
  const events: string[] = [];
  const targets: [number, number][] = [];
  const statuses = Array.isArray(status) ? status : [status];
  let checks = 0;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  const renderer = {
    info: { render: { calls: 0, triangles: 0 } },
    setRenderTarget(target: THREE.WebGLRenderTarget | null) {
      events.push(target ? 'target' : 'screen');
      if (target) targets.push([target.width, target.height]);
    },
    render(drawn: THREE.Scene) {
      const scenePass = drawn === scene;
      events.push(scenePass ? 'scene' : 'resolve');
      renderer.info.render.calls = scenePass ? 9 : 1;
      renderer.info.render.triangles = scenePass ? 21 : 1;
    },
    getContext() {
      return {
        FRAMEBUFFER: 0x8d40,
        FRAMEBUFFER_COMPLETE: COMPLETE,
        checkFramebufferStatus: () => statuses[Math.min(checks++, statuses.length - 1)],
      };
    },
  } as unknown as THREE.WebGLRenderer;
  return { renderer, scene, camera, events, targets };
}

test('2x supersampling renders into a 2x target and resolves to the drawing buffer', () => {
  const h = harness();
  const ssaa = createSupersampledRenderer(h.renderer, 2);
  ssaa.setSize(100, 50);
  const info = ssaa.render(h.scene, h.camera);
  assert.deepEqual(h.events, ['target', 'scene', 'screen', 'resolve']);
  assert.deepEqual(h.targets, [[200, 100]]);
  assert.equal(info.drawCalls, 9);
  assert.equal(info.triangles, 21);
  ssaa.dispose();
});

test('an incomplete sRGB target is rebuilt as linear before drawing', () => {
  const h = harness([INCOMPLETE, COMPLETE]);
  const ssaa = createSupersampledRenderer(h.renderer, 2);
  ssaa.setSize(100, 50);
  const info = ssaa.render(h.scene, h.camera);
  assert.deepEqual(h.events, ['target', 'target', 'scene', 'screen', 'resolve']);
  assert.deepEqual(h.targets, [[200, 100], [200, 100]]);
  assert.equal(info.drawCalls, 9);
  ssaa.dispose();
});

test('two incomplete targets fall back to a direct draw and never resolve', () => {
  const h = harness(INCOMPLETE);
  const ssaa = createSupersampledRenderer(h.renderer, 2);
  ssaa.setSize(100, 50);
  const first = ssaa.render(h.scene, h.camera);
  assert.deepEqual(h.events, ['target', 'target', 'screen', 'scene']);
  assert.equal(first.drawCalls, 9);
  const second = ssaa.render(h.scene, h.camera);
  assert.deepEqual(h.events, ['target', 'target', 'screen', 'scene', 'scene']);
  assert.equal(second.drawCalls, 9);
  ssaa.dispose();
});
