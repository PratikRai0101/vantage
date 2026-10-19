import { createContext, use, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { ReplayEngine } from '../replay';
import { replayData, replayTrack } from './fixture';
const Context = createContext<ReplayEngine | null>(null);

export function ReplayProvider({children}:{children:ReactNode}) {
  const [engine] = useState(() => new ReplayEngine(replayData));
  useEffect(() => {
    let frame:number|null=null,previous:number|null=null;
    let foreground = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    const cancel = () => {if(frame!==null)cancelAnimationFrame(frame);frame=null;previous=null;};
    const request = () => {
      if(!foreground || !engine.getSnapshot().playing) {cancel();return;}
      if(frame===null)frame=requestAnimationFrame(tick);
    };
    function tick(now:number) {
      frame=null;
      if(!foreground || !engine.getSnapshot().playing){previous=null;return;}
      const delta=previous===null?0:(now-previous)/1000;previous=now;
      engine.step(delta);request();
    }
    // There is exactly one playback clock, independent of which tab/scene is mounted.
    // Engine notifications are split; the native renderer reads the unthrottled getTime().
    const unsubscribe=engine.subscribe(request);
    const subscription=AppState.addEventListener('change',next=>{
      foreground=next==='active';
      if(!foreground){engine.pause();cancel();}else request();
    });
    request();
    return()=>{unsubscribe();subscription.remove();cancel();engine.pause();};
  },[engine]);
  return <Context value={engine}>{children}</Context>;
}
export function useReplay() {
  const engine=use(Context);
  if(!engine)throw new Error('useReplay requires ReplayProvider');
  // Structural only: playback ticks never re-render a screen through this hook.
  // `state.time` is the cursor as of the last structural change; live readouts
  // must subscribe to useReplayClock() instead of re-rendering the whole screen.
  const state=useSyncExternalStore(engine.subscribe,engine.getSnapshot,engine.getSnapshot);
  return {engine,data:engine.data,track:replayTrack,state};
}
/** The display cursor (1Hz). Use in small readouts only, never whole screens. */
export function useReplayClock() {
  const engine=use(Context);
  if(!engine)throw new Error('useReplayClock requires ReplayProvider');
  return useSyncExternalStore(engine.subscribeClock,engine.getClock,engine.getClock);
}
