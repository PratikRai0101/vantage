import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { nativeRendererParameters } from './gl-adapter';
import { createSupersampledRenderer } from './supersample';
import type { RaceRenderBackend } from './render-backend';

/** Android's accepted EXGL + 2× SSAA path, unchanged by the iOS Metal backend. */
export function createGlBackend(gl: ExpoWebGLRenderingContext): RaceRenderBackend {
  if (typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext)) throw new Error('Native 3D requires a GLES3 / WebGL2 context on this device.');
  const renderer = new THREE.WebGLRenderer(nativeRendererParameters(gl));
  renderer.setPixelRatio(1); renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.debug.onShaderError = (context, program, vertex, fragment) => {
    throw new Error(`Native 3D shader failed: ${context.getProgramInfoLog(program) ?? ''} ${context.getShaderInfoLog(vertex) ?? ''} ${context.getShaderInfoLog(fragment) ?? ''}`);
  };
  const ssaa = createSupersampledRenderer(renderer, 2);
  let first = true, closed = false;
  return {
    kind: 'expo-gl',
    getSize: () => [gl.drawingBufferWidth, gl.drawingBufferHeight],
    setSize(width, height) { renderer.setSize(width, height, false); ssaa.setSize(width, height); },
    setBackground(color) { renderer.setClearColor(color, 1); },
    render(scene, camera) {
      const info = ssaa.render(scene, camera);
      if (first) {
        const error = gl.getError();
        if (error !== gl.NO_ERROR) throw new Error(`Native GLES rejected the initial scene (GL error 0x${error.toString(16)}).`);
        first = false;
      }
      gl.endFrameEXP();
      return info;
    },
    dispose() { if (closed) return; closed = true; ssaa.dispose(); renderer.dispose(); },
  };
}
