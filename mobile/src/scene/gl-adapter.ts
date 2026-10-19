import type { WebGLRendererParameters } from 'three';

/** Host metadata only: GPU operations always use the genuine EXGL GLES3 context. */
export function nativeRendererParameters(gl: WebGL2RenderingContext): WebGLRendererParameters {
  const canvas = {
    width: gl.drawingBufferWidth, height: gl.drawingBufferHeight,
    clientWidth: gl.drawingBufferWidth, clientHeight: gl.drawingBufferHeight, style: {},
    addEventListener() {}, removeEventListener() {}, setAttribute() {},
    getContext: (kind: string) => kind === 'webgl2' ? gl : null,
  };
  // EXGL58's WebGL2 extends WebGL1. Three r180 rejects that inheritance when
  // `context` is explicit; its normal canvas acquisition correctly requests webgl2.
  // No globals, extension results or GPU capability answers are altered.
  return { canvas: canvas as unknown as HTMLCanvasElement, antialias: false, alpha: false };
}
