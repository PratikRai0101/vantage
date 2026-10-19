import rawReplay from '../../assets/replay/playback.json';
import rawTrack from '../../assets/replay/track.json';
import { parseReplayDataset, parseTrackData } from '../replay';
// One validated, bundled historical source. No accounts, network feed or synthetic fallback.
export const replayData = parseReplayDataset(rawReplay);
export const replayTrack = parseTrackData(rawTrack);
