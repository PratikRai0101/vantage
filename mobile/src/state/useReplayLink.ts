import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useReplay } from './ReplayProvider';
import type { CameraMode, ReplayEngine } from '../replay';
const applied = new WeakMap<ReplayEngine,string>();
// Native replay links are also useful for repeatable simulator captures. They seed
// existing controls once; visiting another tab must never reset a running clock.
export function useReplayLink() {
  const {engine}=useReplay();
  const params=useLocalSearchParams<{time?:string;driver?:string;camera?:string;play?:string}>();
  const {time,driver,camera,play}=params;
  useEffect(()=>{
    if(time===undefined&&driver===undefined&&camera===undefined&&play===undefined)return;
    const key=JSON.stringify({time,driver,camera,play});if(applied.get(engine)===key)return;
    applied.set(engine,key);
    if(driver!==undefined)engine.selectDriver(Number(driver));
    if(time!==undefined)engine.seek(Number(time));
    if(camera&&['overview','follow','battle'].includes(camera))engine.setCamera(camera as CameraMode);
    if(play==='1'&&!engine.getSnapshot().playing)engine.playPause();
  },[engine,time,driver,camera,play]);
}
