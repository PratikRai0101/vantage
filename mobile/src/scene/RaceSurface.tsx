import React, { useCallback } from 'react';
import type { ViewProps } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { createGlBackend } from './gl-backend';
import type { RaceRenderBackend } from './render-backend';

export type RaceSurfaceProps = ViewProps & {
  onCreate: (backend: RaceRenderBackend) => void;
  onError: (error: Error) => void;
};

/** Metro chooses RaceSurface.ios.tsx on iOS; Android never imports WebGPU. */
export function RaceSurface({ onCreate, onError, ...props }: RaceSurfaceProps) {
  const create = useCallback((gl: ExpoWebGLRenderingContext) => {
    try { onCreate(createGlBackend(gl)); }
    catch (error) { onError(error instanceof Error ? error : new Error(String(error))); }
  }, [onCreate, onError]);
  return <GLView {...props} msaaSamples={0} onContextCreate={create} />;
}
