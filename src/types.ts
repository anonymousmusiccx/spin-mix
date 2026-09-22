/**
 * Types and interfaces for Spin Mix Pro DJ
 */

export type FxType = 
  | 'echo'
  | 'reverb'
  | 'flanger'
  | 'phaser'
  | 'filter_sweep'
  | 'bitcrusher'
  | 'roll'
  | 'distortion'
  | 'tremolo'
  | 'pitch_shift'
  | 'backspin';

export interface FxConfig {
  type: FxType;
  name: string;
  category: string;
  param1Label: string;
  param2Label: string;
  defaultWet: number;
  defaultParam1: number;
  defaultParam2: number;
}

export interface FxState {
  type: FxType;
  wet: number;       // 0 to 1
  param1: number;    // 0 to 1
  param2: number;    // 0 to 1
  active: boolean;
  locked: boolean;   // Freeze / Lock effect state
}

export interface HotCue {
  id: number;
  time: number;
  color: string;
}

export interface WaveformBandData {
  low: Float32Array;   // 0 - 250Hz (Bass/Kick)
  mid: Float32Array;   // 250Hz - 3kHz (Mids/Vocals)
  high: Float32Array;  // 3kHz+ (Highs/Cymbals)
  overall: Float32Array;
  peaksCount: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  originalBpm: number;
  key: string;         // Camelot key e.g. "8A" or "4B"
  musicalKey: string;  // e.g. "Am" or "F#"
  duration: number;    // in seconds
  lufs?: number;       // Integrated Loudness (LUFS, ITU-R BS.1770)
  audioBuffer?: AudioBuffer | null;
  waveformData?: WaveformBandData;
  isDemo?: boolean;
  fileFormat?: string; // mp3, wav, m4a, ogg
  fileName?: string;
  uri?: string;
  isScanned?: boolean;
  file?: File;
}

export interface DeckState {
  id: 'A' | 'B';
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  pitch: number;       // -0.16 to +0.16 (e.g. +/- 16%)
  pitchRange: number;  // 8, 16, or 50%
  bpm: number;
  keyLock: boolean;    // Master tempo lock
  isSync: boolean;
  volume: number;      // 0 to 1
  gain: number;        // 0 to 2
  eqHigh: number;      // -26dB to +6dB
  eqMid: number;       // -26dB to +6dB
  eqLow: number;       // -26dB to +6dB
  filter: number;      // -1 (LPF) to +1 (HPF), 0 is bypass
  cuePfl: boolean;     // Headphone monitor
  cuePoints: HotCue[];
  activeLoop: {
    active: boolean;
    inTime: number;
    outTime: number;
    beats: number;
  } | null;
  fx1: FxState;
  fx2: FxState;
  jogAngle: number;
  isScratching: boolean;
  vinylMode: boolean;  // vinyl scratch vs CDJ pitch nudge
  crossfaderRouting: 'A' | 'THRU' | 'B'; // Crossfader assignment or THRU (bypass)
  meterLeft: number;   // 0 to 1
  meterRight: number;  // 0 to 1
}

export interface SamplerPad {
  id: number;
  name: string;
  color: string;
  buffer: AudioBuffer | null;
  volume: number;
  isLoop: boolean;
  isPlaying: boolean;
  sourceUrl?: string;
  fileName?: string;
}

export interface RecordingItem {
  id: string;
  name: string;
  timestamp: string;
  duration: number;
  sizeMb: number;
  blob: Blob;
  url: string;
}
