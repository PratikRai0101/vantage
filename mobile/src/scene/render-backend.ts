import type * as THREE from 'three';
import type { SceneRenderInfo } from './supersample';

/** Owns GPU resources and native presentation, not replay or scene state. */
export interface RaceRenderBackend {
  readonly kind: 'expo-gl' | 'webgpu-metal';
  getSize(): readonly [number, number];
  setSize(width: number, height: number): void;
  setBackground(color: string): void;
  render(scene: THREE.Scene, camera: THREE.Camera): SceneRenderInfo;
  dispose(): void;
}
