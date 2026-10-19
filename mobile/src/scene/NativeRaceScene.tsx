import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, PanResponder, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import type { ReplayEngine, TrackData } from '../replay';
import { RaceSceneRuntime, type SceneReadyInfo } from './runtime';

export type NativeRaceSceneProps = {
  engine: ReplayEngine;
  track: TrackData;
  active: boolean;
  backgroundColor: string;
  height?: number;
  resetKey?: number;
  onReady?: (info: SceneReadyInfo) => void;
  onError?: (error: Error) => void;
};
// Keep the native surface isolated from telemetry/status React updates. Only a
// deliberate generation/context change should update or remount its native host.
const NativeSurface = React.memo(GLView);
const pinchDistance = (event: GestureResponderEvent) => {
  const touches = event.nativeEvent.touches;
  return touches.length >= 2 ? Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY) : 0;
};

/** Native EXGL surface. The replay provider, never this view, advances the clock. */
export const NativeRaceScene = React.memo(function NativeRaceScene(props: NativeRaceSceneProps) {
  const latest = useRef(props);
  useLayoutEffect(() => { latest.current = props; });
  const runtime = useRef<RaceSceneRuntime | null>(null);
  const mounted = useRef(true);
  const size = useRef({ width: 1, height: 1 });
  const foreground = useRef(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const reduced = useRef(false);
  const [status, setStatus] = useState('Loading native circuit…');
  const [failed, setFailed] = useState(false);
  const [surfaceEpoch, setSurfaceEpoch] = useState(0);
  const generation = useRef(0);
  const needsFreshSurface = useRef(false);
  const gesture = useRef({ dx: 0, dy: 0, pinch: 0, moved: false });
  // PanResponder registers these callbacks; it does not invoke them during render.
  const [responder] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => { gesture.current = { dx: 0, dy: 0, pinch: pinchDistance(event), moved: false }; },
    onPanResponderMove: (event, state) => {
      const previous = gesture.current, pinch = pinchDistance(event);
      const dx = state.dx - previous.dx, dy = state.dy - previous.dy;
      if (Math.hypot(state.dx, state.dy) > 5 || pinch > 0) previous.moved = true;
      if (previous.moved) runtime.current?.orbit(dx, dy, pinch > 0 && previous.pinch > 0 ? pinch / previous.pinch : 1);
      previous.dx = state.dx; previous.dy = state.dy; previous.pinch = pinch;
    },
    onPanResponderRelease: event => {
      if (!gesture.current.moved) runtime.current?.selectAt(event.nativeEvent.locationX, event.nativeEvent.locationY);
    },
    onPanResponderTerminationRequest: () => true,
  }));

  useEffect(() => {
    mounted.current = true;
    foreground.current = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    // SDK58 Router hides tabs with React Activity: effects disconnect, but native
    // views/state survive. A disposed renderer must never leave a stale GL image.
    // GLView destroys its context on removeFromSuperview, so recreate the surface
    // rather than assuming an old native context is still valid on reactivation.
    if (needsFreshSurface.current) {
      needsFreshSurface.current = false;
      generation.current += 1;
      setSurfaceEpoch(generation.current);
    }
    const app = AppState.addEventListener('change', state => {
      foreground.current = state === 'active'; runtime.current?.setActive(foreground.current && latest.current.active);
    });
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (!cancelled) { reduced.current = value; runtime.current?.setReducedMotion(value); } });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reduced.current = value; runtime.current?.setReducedMotion(value); });
    return () => {
      cancelled = true; mounted.current = false; needsFreshSurface.current = true;
      app.remove(); motion.remove(); runtime.current?.dispose(); runtime.current = null;
    };
  }, [props.engine, props.track]);
  useEffect(() => { runtime.current?.setActive(props.active && foreground.current); }, [props.active]);
  useEffect(() => { runtime.current?.setBackground(props.backgroundColor); }, [props.backgroundColor]);
  useEffect(() => { runtime.current?.resetView(); }, [props.resetKey]);

  const create = useCallback((gl: ExpoWebGLRenderingContext) => {
    if (!mounted.current || surfaceEpoch !== generation.current) return;
    runtime.current?.dispose(); runtime.current = null;
    setStatus('Loading native circuit…'); setFailed(false);
    const reportError = (error: Error) => {
      if (!mounted.current) return;
      setFailed(true); setStatus(`Native 3D unavailable\n${error.message}`); latest.current.onError?.(error);
    };
    try {
      const value = new RaceSceneRuntime(gl, props.engine, props.track, {
        ready: info => { if (mounted.current) { setStatus(''); latest.current.onReady?.(info); } }, error: reportError,
      }, latest.current.backgroundColor);
      runtime.current = value; value.resize(size.current.width, size.current.height);
      value.setReducedMotion(reduced.current); value.setActive(latest.current.active && foreground.current);
      void value.initialize();
    } catch (error) { reportError(error instanceof Error ? error : new Error(String(error))); }
  }, [props.engine, props.track, surfaceEpoch]);

  return (
    <View collapsable={false} style={[styles.container, props.height === undefined ? styles.flex : { height: props.height }, { backgroundColor: props.backgroundColor }]}
      onLayout={event => { size.current = event.nativeEvent.layout; runtime.current?.resize(size.current.width, size.current.height); }}>
      <View collapsable={false} style={styles.fill} {...responder.panHandlers} accessible accessibilityRole="image"
        accessibilityLabel="Three-dimensional Suzuka replay. Select a driver and camera using the replay controls below. Drag to orbit, pinch to zoom.">
        <NativeSurface key={surfaceEpoch} collapsable={false} collapsableChildren={false} style={styles.flex} msaaSamples={0} onContextCreate={create} />
      </View>
      {/* Keep the native sibling hierarchy stable when first-frame status clears.
          Fabric reparenting would call GLView.removeFromSuperview(), which destroys
          EXGL's context/display link even though the React component survives. */}
      <View collapsable={false} pointerEvents="none"
        style={[styles.diagnostic, { opacity: status ? 1 : 0 }]}
        accessibilityElementsHidden={!status} importantForAccessibility={status ? 'auto' : 'no-hide-descendants'}
        accessibilityLiveRegion={failed ? 'assertive' : 'polite'}>
        <Text style={[styles.status, failed && styles.error]}>{status}</Text>
      </View>
    </View>
  );
});
const styles = StyleSheet.create({
  container: { overflow: 'hidden', minHeight: 1 }, flex: { flex: 1 }, fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  diagnostic: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: 24 },
  status: { color: '#c6d9df', backgroundColor: '#101719e8', padding: 12, fontSize: 13, textAlign: 'center' },
  error: { color: '#f4c5ad' },
});
