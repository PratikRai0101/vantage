import React, { useEffect, useRef } from 'react';
import { PixelRatio } from 'react-native';
import { Canvas, type CanvasRef, type NativeCanvas } from 'react-native-webgpu';
import * as THREE from 'three/webgpu';
import type { RaceRenderBackend } from './render-backend';
import type { RaceSurfaceProps } from './RaceSurface';

/** Native CAMetalLayer/Dawn surface. No WebView, GL readbacks or image fallback. */
export function RaceSurface({ onCreate, onError, ...props }: RaceSurfaceProps) {
  const ref = useRef<CanvasRef>(null);
  useEffect(() => {
    let cancelled = false, frame = 0;
    let backend: RaceRenderBackend | undefined;
    let device: GPUDevice | undefined;
    let renderer: THREE.WebGPURenderer | undefined;
    const start = async () => {
      const context = ref.current?.getContext('webgpu');
      const canvas = context?.canvas as unknown as NativeCanvas | undefined;
      if (!context || !canvas || !canvas.clientWidth || !canvas.clientHeight) {
        if (!cancelled) frame = requestAnimationFrame(() => { void start(); });
        return;
      }
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error('Metal WebGPU adapter unavailable.');
        device = await adapter.requestDevice();
        if (cancelled) { device.destroy(); return; }
        canvas.width = Math.round(canvas.clientWidth * PixelRatio.get());
        canvas.height = Math.round(canvas.clientHeight * PixelRatio.get());
        renderer = new THREE.WebGPURenderer({
          canvas: canvas as unknown as HTMLCanvasElement,
          context: context as unknown as GPUCanvasContext,
          device,
          antialias: true,
        });
        renderer.setPixelRatio(1);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        await renderer.init();
        if (cancelled) { renderer.dispose(); device.destroy(); return; }
        const gpuRenderer = renderer;
        const gpuDevice = device;
        let closed = false;
        backend = {
          kind: 'webgpu-metal',
          getSize: () => [canvas.width, canvas.height],
          setSize(width, height) { gpuRenderer.setSize(width, height, false); },
          setBackground(color) { gpuRenderer.setClearColor(color, 1); },
          render(scene, camera) {
            gpuRenderer.render(scene, camera);
            context.present();
            return { drawCalls: gpuRenderer.info.render.calls, triangles: gpuRenderer.info.render.triangles };
          },
          dispose() {
            if (closed) return;
            closed = true;
            gpuRenderer.setAnimationLoop(null);
            gpuRenderer.dispose();
            gpuDevice.destroy();
          },
        };
        device.addEventListener('uncapturederror', event => {
          if (!cancelled && !closed) onError(new Error(event.error.message));
        });
        void device.lost.then(info => {
          if (!cancelled && !closed) onError(new Error(`Metal device lost: ${info.message}`));
        });
        onCreate(backend);
      } catch (error) {
        backend?.dispose();
        if (!backend) { renderer?.dispose(); device?.destroy(); }
        if (!cancelled) onError(error instanceof Error ? error : new Error(String(error)));
      }
    };
    void start();
    return () => { cancelled = true; cancelAnimationFrame(frame); backend?.dispose(); };
  }, [onCreate, onError]);
  return <Canvas {...props} ref={ref} />;
}
