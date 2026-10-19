import * as THREE from 'three';

export type SceneRenderInfo = { drawCalls: number; triangles: number };

export type SupersampledRenderer = {
  readonly factor: number;
  setSize(width: number, height: number): void;
  render(scene: THREE.Scene, camera: THREE.Camera): SceneRenderInfo;
  dispose(): void;
};

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // The fullscreen triangle bypasses the scene camera on purpose.
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D source;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(source, vUv);
    // Sampling an sRGB target decodes to linear; sampling a linear target is
    // already linear. Either way, convert once for the sRGB drawing buffer.
    #include <colorspace_fragment>
  }
`;

/**
 * Renders the scene into a 2x texture, then resolves it with a fullscreen
 * triangle. A 2x texture sampled with LINEAR at half scale gives each output
 * pixel the average of four scene samples: ordinary 4x SSAA.
 *
 * EXGL on Android exposes no multisampled renderbuffers (`msaaSamples` is
 * iOS-only and `renderbufferStorageMultisample` is UNIMPL), so this is the
 * supported antialiasing route. Framebuffer objects and texture targets are
 * implemented by EXGL.
 *
 * An sRGB target keeps 8-bit precision in the shadows. If the driver cannot
 * render to one, the target is rebuilt as linear; if that is also incomplete,
 * the renderer falls back to a direct draw rather than showing a black scene.
 */
export function createSupersampledRenderer(renderer: THREE.WebGLRenderer, factor = 2): SupersampledRenderer {
  const makeTarget = (colorSpace: THREE.ColorSpace) => {
    const created = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    created.texture.colorSpace = colorSpace;
    return created;
  };

  let target = makeTarget(THREE.SRGBColorSpace);
  let targetColorSpace: THREE.ColorSpace = THREE.SRGBColorSpace;

  const material = new THREE.ShaderMaterial({
    uniforms: { source: { value: target.texture } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  // Bottom-left UV (0,0) matches GL's render-target origin. PlaneGeometry's
  // default UVs are top-left, which would flip the resolve vertically.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
  const quad = new THREE.Mesh(geometry, material);
  quad.frustumCulled = false;
  const resolveScene = new THREE.Scene();
  resolveScene.add(quad);
  const resolveCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let width = 0, height = 0;
  let usable = true;
  let checked = false;

  const applySize = () => target.setSize(Math.max(1, Math.round(width * factor)), Math.max(1, Math.round(height * factor)));

  const setSize = (nextWidth: number, nextHeight: number) => {
    if (!usable || (nextWidth === width && nextHeight === height)) return;
    width = nextWidth; height = nextHeight;
    applySize();
  };

  const rebuild = (colorSpace: THREE.ColorSpace) => {
    const previous = target;
    target = makeTarget(colorSpace);
    targetColorSpace = colorSpace;
    applySize();
    material.uniforms.source.value = target.texture;
    previous.dispose();
    checked = false;
  };

  const render = (scene: THREE.Scene, camera: THREE.Camera): SceneRenderInfo => {
    if (!usable) {
      renderer.render(scene, camera);
      return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    }
    const gl = renderer.getContext();
    for (;;) {
      renderer.setRenderTarget(target);
      if (!checked) {
        checked = true;
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
          if (targetColorSpace === THREE.SRGBColorSpace) {
            rebuild(THREE.NoColorSpace);
            continue;
          }
          usable = false;
          renderer.setRenderTarget(null);
          renderer.render(scene, camera);
          return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
        }
      }
      break;
    }
    renderer.render(scene, camera);
    // Capture before the resolve pass resets renderer.info.
    const info = { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    renderer.setRenderTarget(null);
    renderer.render(resolveScene, resolveCamera);
    return info;
  };

  const dispose = () => {
    target.dispose();
    geometry.dispose();
    material.dispose();
  };

  return { factor, setSize, render, dispose };
}
