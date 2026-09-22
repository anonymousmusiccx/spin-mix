/**
 * Spin Mix — Professional Modern Android DJ Application
 * Tactile 3D Console, Dual Scratch Jogwheels, Low-Latency Web Audio Engine,
 * Double FX with Lock/Freeze, 6-Pad Sampler with Custom MP3 Loading,
 * Dual Multi-Band Scrolling Waveforms, Crossfader & Local Storage Library.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DeckState, Track, SamplerPad, RecordingItem, FxState } from './types';
import { AudioEngine } from './audio/audioEngine';
import { WaveformDisplay } from './components/WaveformDisplay';
import { JogWheel3D } from './components/JogWheel3D';
import { MixerSection } from './components/MixerSection';
import { DeckControls } from './components/DeckControls';
import { DoubleFxUnit } from './components/DoubleFxUnit';
import { Sampler6Pad } from './components/Sampler6Pad';
import { TrackLibraryModal } from './components/TrackLibraryModal';
import { RecorderModal } from './components/RecorderModal';
import { 
  Disc3, 
  Folder, 
  Circle, 
  Maximize2, 
  Minimize2, 
  Sliders, 
  Mic, 
  Layers, 
  Info,
  Radio,
  Volume2,
  Smartphone,
  RotateCcw,
  Sparkles,
  Grid
} from 'lucide-react';

export default function App() {
  const audioEngine = AudioEngine.getInstance();

  // Track catalog
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Deck A State
  const [deckA, setDeckA] = useState<DeckState>({
    id: 'A',
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1.0,
    pitch: 0,
    pitchRange: 8,
    bpm: 126,
    keyLock: true,
    isSync: false,
    volume: 0.85,
    gain: 1.0,
    eqHigh: 0,
    eqMid: 0,
    eqLow: 0,
    filter: 0,
    cuePfl: false,
    cuePoints: [],
    activeLoop: null,
    fx1: { type: 'echo', wet: 0.4, param1: 0.35, param2: 0.5, active: false, locked: false },
    fx2: { type: 'filter_sweep', wet: 0.5, param1: 0.5, param2: 0.7, active: false, locked: false },
    jogAngle: 0,
    isScratching: false,
    vinylMode: true,
    crossfaderRouting: 'A',
    meterLeft: 0,
    meterRight: 0
  });

  // Deck B State
  const [deckB, setDeckB] = useState<DeckState>({
    id: 'B',
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1.0,
    pitch: 0,
    pitchRange: 8,
    bpm: 128,
    keyLock: true,
    isSync: false,
    volume: 0.85,
    gain: 1.0,
    eqHigh: 0,
    eqMid: 0,
    eqLow: 0,
    filter: 0,
    cuePfl: false,
    cuePoints: [],
    activeLoop: null,
    fx1: { type: 'flanger', wet: 0.5, param1: 0.6, param2: 0.3, active: false, locked: false },
    fx2: { type: 'reverb', wet: 0.45, param1: 0.6, param2: 0.4, active: false, locked: false },
    jogAngle: 0,
    isScratching: false,
    vinylMode: true,
    crossfaderRouting: 'B',
    meterLeft: 0,
    meterRight: 0
  });

  // Mixer State
  const [crossfader, setCrossfader] = useState(0); // -1 to +1
  const [crossfaderCurve, setCrossfaderCurve] = useState<'smooth' | 'sharp'>('smooth');
  const [masterVolume, setMasterVolume] = useState(1.0);
  // NOTE: VU meter levels are intentionally NOT React state. They update at 60fps,
  // and putting them in state forced the entire component tree to re-render every
  // single frame (even while idle/silent). MixerSection now polls the audio engine
  // itself and paints the meters directly via refs, bypassing React entirely.

  // 6 Sampler Pads
  const [samplerPads, setSamplerPads] = useState<SamplerPad[]>([
    { id: 1, name: 'Airhorn', color: '#f43f5e', buffer: null, volume: 0.9, isLoop: false, isPlaying: false },
    { id: 2, name: 'Rave Siren', color: '#f59e0b', buffer: null, volume: 0.85, isLoop: false, isPlaying: false },
    { id: 3, name: '808 Boom', color: '#10b981', buffer: null, volume: 0.9, isLoop: false, isPlaying: false },
    { id: 4, name: 'Laser Zap', color: '#06b6d4', buffer: null, volume: 0.8, isLoop: false, isPlaying: false },
    { id: 5, name: 'Club Snap', color: '#6366f1', buffer: null, volume: 0.85, isLoop: false, isPlaying: false },
    { id: 6, name: 'Vocal Drop', color: '#d946ef', buffer: null, volume: 0.9, isLoop: false, isPlaying: false }
  ]);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);

  // UI Navigation (Persistent App-Shell Bottom Tab Bar, like Cross DJ / djay)
  // Exactly one "screen" is visible at a time in the content area between the
  // header and the bottom tab bar - nothing here ever requires page scrolling
  // to reach FX, the sampler, or the mixer; they're a single tap away.
  const [activeScreen, setActiveScreen] = useState<'decks' | 'mixer' | 'fx' | 'sampler'>('decks');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mobile Orientation & Phone DJing Controls
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth;
    }
    return false;
  });
  const [forceLandscape, setForceLandscape] = useState(false);
  const [phoneDeckView, setPhoneDeckView] = useState<'dual' | 'deckA' | 'deckB'>('dual');

  // Detect physical orientation changes on mobile phones
  useEffect(() => {
    const handleOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
      if (!portrait) {
        // Physical rotation to landscape takes precedence
        setForceLandscape(false);
      }
    };

    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

  const handleToggleRotate = async () => {
    try {
      if (screen?.orientation && 'lock' in screen.orientation) {
        if (isPortrait && !forceLandscape) {
          await (screen.orientation as any).lock('landscape').catch(() => {});
        } else {
          await (screen.orientation as any).unlock?.().catch?.(() => {});
        }
      }
    } catch {
      // Browser iframe policy might not allow screen lock, fallback to CSS rotation
    }

    setForceLandscape((prev) => !prev);
  };

  // Initialize Audio & Demo Tracks on Mount
  useEffect(() => {
    let mounted = true;

    const setupApp = async () => {
      try {
        await audioEngine.init();
        const demoTracks = await audioEngine.generateDemoTracks();
        const samplerBuffers = await audioEngine.generateDefaultSamplerBuffers();

        if (!mounted) return;

        setTracks(demoTracks);

        // Preload Deck A and Deck B with the 2 starter demo tracks
        if (demoTracks.length >= 2) {
          const tA = demoTracks[0];
          const tB = demoTracks[1];

          audioEngine.loadTrackToDeck('A', tA);
          setDeckA((prev) => ({
            ...prev,
            track: tA,
            duration: tA.duration,
            bpm: tA.bpm
          }));

          audioEngine.loadTrackToDeck('B', tB);
          setDeckB((prev) => ({
            ...prev,
            track: tB,
            duration: tB.duration,
            bpm: tB.bpm
          }));
        }

        // Attach default buffers to sampler state
        setSamplerPads((prev) =>
          prev.map((pad, idx) => ({
            ...pad,
            buffer: samplerBuffers[idx] || null
          }))
        );
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };

    setupApp();

    return () => {
      mounted = false;
    };
  }, []);

  // Real-time synchronization loop (60fps) for VU meters and track progress
  useEffect(() => {
    let animId: number;

    const updateTelemetry = () => {
      // Deck A progress
      const curA = audioEngine.getDeckCurrentTime('A');
      setDeckA((prev) => {
        if (prev.isPlaying && Math.abs(prev.currentTime - curA) > 0.05) {
          return { ...prev, currentTime: curA };
        }
        return prev;
      });

      // Deck B progress
      const curB = audioEngine.getDeckCurrentTime('B');
      setDeckB((prev) => {
        if (prev.isPlaying && Math.abs(prev.currentTime - curB) > 0.05) {
          return { ...prev, currentTime: curB };
        }
        return prev;
      });

      animId = requestAnimationFrame(updateTelemetry);
    };

    animId = requestAnimationFrame(updateTelemetry);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Live recording timer ticker
  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Sync Master Volume
  const handleMasterVolume = (val: number) => {
    setMasterVolume(val);
    audioEngine.setMasterVolume(val);
  };

  // Crossfader Update
  const handleCrossfader = (val: number) => {
    setCrossfader(val);
    audioEngine.updateCrossfader(val, crossfaderCurve);
  };

  // Crossfader Curve Toggle
  const handleCrossfaderCurveToggle = () => {
    const next = crossfaderCurve === 'smooth' ? 'sharp' : 'smooth';
    setCrossfaderCurve(next);
    audioEngine.updateCrossfader(crossfader, next);
  };

  // Deck A Update
  const updateDeckA = (updates: Partial<DeckState>) => {
    setDeckA((prev) => {
      const next = { ...prev, ...updates };

      if (updates.volume !== undefined) audioEngine.setDeckFader('A', updates.volume);
      if (updates.gain !== undefined) audioEngine.setDeckTrim('A', updates.gain);
      if (updates.eqHigh !== undefined || updates.eqMid !== undefined || updates.eqLow !== undefined) {
        audioEngine.setDeckEq('A', next.eqHigh, next.eqMid, next.eqLow);
      }
      if (updates.filter !== undefined) audioEngine.setDeckFilter('A', updates.filter);
      if (updates.cuePfl !== undefined) audioEngine.setDeckCuePfl('A', updates.cuePfl);
      if (updates.crossfaderRouting !== undefined) audioEngine.setDeckRouting('A', updates.crossfaderRouting);

      return next;
    });
  };

  // Deck B Update
  const updateDeckB = (updates: Partial<DeckState>) => {
    setDeckB((prev) => {
      const next = { ...prev, ...updates };

      if (updates.volume !== undefined) audioEngine.setDeckFader('B', updates.volume);
      if (updates.gain !== undefined) audioEngine.setDeckTrim('B', updates.gain);
      if (updates.eqHigh !== undefined || updates.eqMid !== undefined || updates.eqLow !== undefined) {
        audioEngine.setDeckEq('B', next.eqHigh, next.eqMid, next.eqLow);
      }
      if (updates.filter !== undefined) audioEngine.setDeckFilter('B', updates.filter);
      if (updates.cuePfl !== undefined) audioEngine.setDeckCuePfl('B', updates.cuePfl);
      if (updates.crossfaderRouting !== undefined) audioEngine.setDeckRouting('B', updates.crossfaderRouting);

      return next;
    });
  };

  // Play / Pause Toggle
  const togglePlayDeck = (deckId: 'A' | 'B') => {
    const deck = deckId === 'A' ? deckA : deckB;
    if (deck.isPlaying) {
      audioEngine.pauseDeck(deckId);
      if (deckId === 'A') setDeckA((d) => ({ ...d, isPlaying: false }));
      else setDeckB((d) => ({ ...d, isPlaying: false }));
    } else {
      audioEngine.playDeck(deckId);
      if (deckId === 'A') setDeckA((d) => ({ ...d, isPlaying: true }));
      else setDeckB((d) => ({ ...d, isPlaying: true }));
    }
  };

  // Cue Button Return
  const handleCue = (deckId: 'A' | 'B') => {
    const deck = deckId === 'A' ? deckA : deckB;
    audioEngine.pauseDeck(deckId);
    audioEngine.seekDeck(deckId, 0);
    if (deckId === 'A') {
      setDeckA((d) => ({ ...d, isPlaying: false, currentTime: 0 }));
    } else {
      setDeckB((d) => ({ ...d, isPlaying: false, currentTime: 0 }));
    }
  };

  // Pitch / Tempo Slider Change
  const handlePitchChange = (deckId: 'A' | 'B', pitchVal: number) => {
    const deck = deckId === 'A' ? deckA : deckB;
    const baseBpm = deck.track?.originalBpm || (deckId === 'A' ? 126 : 128);
    const newRate = 1.0 + pitchVal;
    const calculatedBpm = baseBpm * newRate;

    audioEngine.setDeckPlaybackRate(deckId, newRate);

    if (deckId === 'A') {
      setDeckA((d) => ({ ...d, pitch: pitchVal, playbackRate: newRate, bpm: calculatedBpm, isSync: false }));
    } else {
      setDeckB((d) => ({ ...d, pitch: pitchVal, playbackRate: newRate, bpm: calculatedBpm, isSync: false }));
    }
  };

  // Beat Sync: Matches BPM and phase aligns to the opposite deck
  const handleSync = (deckId: 'A' | 'B') => {
    const targetDeck = deckId === 'A' ? deckB : deckA;
    if (!targetDeck.track || targetDeck.bpm <= 0) return;

    const sourceDeck = deckId === 'A' ? deckA : deckB;
    const originalBpm = sourceDeck.track?.originalBpm || 126;
    const targetBpm = targetDeck.bpm;
    const targetRate = targetBpm / originalBpm;
    const targetPitch = targetRate - 1.0;

    audioEngine.setDeckPlaybackRate(deckId, targetRate);

    if (deckId === 'A') {
      setDeckA((d) => ({
        ...d,
        pitch: targetPitch,
        playbackRate: targetRate,
        bpm: targetBpm,
        isSync: true
      }));
    } else {
      setDeckB((d) => ({
        ...d,
        pitch: targetPitch,
        playbackRate: targetRate,
        bpm: targetBpm,
        isSync: true
      }));
    }
  };

  // Tap BPM
  const tapTimesRef = useRef<number[]>([]);
  const handleTapBpm = (deckId: 'A' | 'B') => {
    const now = performance.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 5) tapTimesRef.current.shift();

    if (tapTimesRef.current.length >= 3) {
      let diffSum = 0;
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        diffSum += tapTimesRef.current[i] - tapTimesRef.current[i - 1];
      }
      const avgDiff = diffSum / (tapTimesRef.current.length - 1);
      const tappedBpm = Math.round(60000 / avgDiff);
      if (tappedBpm >= 70 && tappedBpm <= 180) {
        if (deckId === 'A') setDeckA((d) => ({ ...d, bpm: tappedBpm }));
        else setDeckB((d) => ({ ...d, bpm: tappedBpm }));
      }
    }
  };

  // Pitch Bend Nudge
  const handleNudge = (deckId: 'A' | 'B', delta: number) => {
    const deck = deckId === 'A' ? deckA : deckB;
    const tempRate = deck.playbackRate + delta;
    audioEngine.setDeckPlaybackRate(deckId, tempRate);
    setTimeout(() => {
      audioEngine.setDeckPlaybackRate(deckId, deck.playbackRate);
    }, 200);
  };

  // Hot Cues
  const handleSetHotCue = (deckId: 'A' | 'B', id: number) => {
    const deck = deckId === 'A' ? deckA : deckB;
    const curTime = deck.currentTime;
    const colors = ['#f43f5e', '#38bdf8', '#10b981', '#f59e0b'];
    const newCue = { id, time: curTime, color: colors[id - 1] };

    const updatedCues = [...deck.cuePoints.filter((c) => c.id !== id), newCue];
    if (deckId === 'A') setDeckA((d) => ({ ...d, cuePoints: updatedCues }));
    else setDeckB((d) => ({ ...d, cuePoints: updatedCues }));
  };

  const handleTriggerHotCue = (deckId: 'A' | 'B', id: number) => {
    const deck = deckId === 'A' ? deckA : deckB;
    const cue = deck.cuePoints.find((c) => c.id === id);
    if (cue) {
      audioEngine.seekDeck(deckId, cue.time);
      if (!deck.isPlaying) {
        audioEngine.playDeck(deckId, cue.time);
        if (deckId === 'A') setDeckA((d) => ({ ...d, isPlaying: true, currentTime: cue.time }));
        else setDeckB((d) => ({ ...d, isPlaying: true, currentTime: cue.time }));
      } else {
        if (deckId === 'A') setDeckA((d) => ({ ...d, currentTime: cue.time }));
        else setDeckB((d) => ({ ...d, currentTime: cue.time }));
      }
    }
  };

  const handleClearHotCue = (deckId: 'A' | 'B', id: number) => {
    const deck = deckId === 'A' ? deckA : deckB;
    const updated = deck.cuePoints.filter((c) => c.id !== id);
    if (deckId === 'A') setDeckA((d) => ({ ...d, cuePoints: updated }));
    else setDeckB((d) => ({ ...d, cuePoints: updated }));
  };

  // Beat Looper
  const handleSetBeatLoop = (deckId: 'A' | 'B', beats: number) => {
    const deck = deckId === 'A' ? deckA : deckB;
    const beatInterval = 60 / deck.bpm;
    const loopDuration = beats * beatInterval;
    const inTime = deck.currentTime;
    const outTime = inTime + loopDuration;

    const loopData = { active: true, inTime, outTime, beats };
    if (deckId === 'A') setDeckA((d) => ({ ...d, activeLoop: loopData }));
    else setDeckB((d) => ({ ...d, activeLoop: loopData }));
  };

  const handleExitLoop = (deckId: 'A' | 'B') => {
    if (deckId === 'A') setDeckA((d) => ({ ...d, activeLoop: null }));
    else setDeckB((d) => ({ ...d, activeLoop: null }));
  };

  // Double FX Updates
  const handleUpdateFx = (deckId: 'A' | 'B', slot: 1 | 2, updates: Partial<FxState>) => {
    if (deckId === 'A') {
      const nextFx = slot === 1 ? { ...deckA.fx1, ...updates } : { ...deckA.fx2, ...updates };
      audioEngine.updateDeckFx('A', slot, nextFx);
      setDeckA((d) => ({
        ...d,
        [slot === 1 ? 'fx1' : 'fx2']: nextFx
      }));
    } else {
      const nextFx = slot === 1 ? { ...deckB.fx1, ...updates } : { ...deckB.fx2, ...updates };
      audioEngine.updateDeckFx('B', slot, nextFx);
      setDeckB((d) => ({
        ...d,
        [slot === 1 ? 'fx1' : 'fx2']: nextFx
      }));
    }
  };

  // Sampler Pad Interactions
  const handleTriggerSamplerPad = (idx: number) => {
    const pad = samplerPads[idx];
    if (pad.buffer) {
      audioEngine.triggerSample(idx, pad.volume, pad.isLoop);
      setSamplerPads((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, isPlaying: true } : p))
      );
    }
  };

  const handleStopSamplerPad = (idx: number) => {
    audioEngine.stopSample(idx);
    setSamplerPads((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, isPlaying: false } : p))
    );
  };

  const handleUpdateSamplerPad = (idx: number, updates: Partial<SamplerPad>) => {
    setSamplerPads((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...updates } : p))
    );
  };

  // Load Custom MP3/WAV file onto a sampler pad
  const handleLoadCustomSample = async (idx: number, file: File) => {
    try {
      const buffer = await audioEngine.decodeAudioFile(file);
      audioEngine.setSampleBuffer(idx, buffer);
      setSamplerPads((prev) =>
        prev.map((p, i) =>
          i === idx
            ? { ...p, buffer, name: file.name.replace(/\.[^/.]+$/, '').slice(0, 14), fileName: file.name }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to load custom sample onto pad', err);
    }
  };

  // Local File Library Import (Multi-format: MP3, WAV, M4A, OGG)
  const handleImportFiles = async (files: FileList | File[]) => {
    setIsLoadingAudio(true);
    const newTracks: Track[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const audioBuffer = await audioEngine.decodeAudioFile(file);
        const waveforms = audioEngine.extractWaveformData(audioBuffer);
        const { bpm, key, musicalKey } = audioEngine.analyzeBpmAndKey(audioBuffer);

        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const trackItem: Track = {
          id: `local-${Date.now()}-${i}`,
          title: cleanName,
          artist: 'Local Library',
          bpm,
          originalBpm: bpm,
          key,
          musicalKey,
          duration: audioBuffer.duration,
          audioBuffer,
          waveformData: waveforms,
          fileFormat: file.type.split('/')[1] || 'audio',
          fileName: file.name
        };

        newTracks.push(trackItem);
      } catch (err) {
        console.error(`Failed to decode file: ${file.name}`, err);
      }
    }

    setTracks((prev) => [...prev, ...newTracks]);
    setIsLoadingAudio(false);
  };

  // Load track from library to Deck A or Deck B
  const handleLoadTrackToDeck = (deckId: 'A' | 'B', track: Track) => {
    audioEngine.loadTrackToDeck(deckId, track);

    if (deckId === 'A') {
      setDeckA((d) => ({
        ...d,
        track,
        duration: track.duration,
        currentTime: 0,
        bpm: track.bpm,
        pitch: 0,
        playbackRate: 1.0,
        isPlaying: false,
        cuePoints: []
      }));
    } else {
      setDeckB((d) => ({
        ...d,
        track,
        duration: track.duration,
        currentTime: 0,
        bpm: track.bpm,
        pitch: 0,
        playbackRate: 1.0,
        isPlaying: false,
        cuePoints: []
      }));
    }
  };

  // Live Set Recording
  const handleStartRecord = () => {
    const success = audioEngine.startRecording();
    if (success) {
      setIsRecording(true);
    }
  };

  const handleStopRecord = async () => {
    const result = await audioEngine.stopRecording();
    setIsRecording(false);

    if (result) {
      const url = URL.createObjectURL(result.blob);
      const now = new Date();
      const timestampStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const newRec: RecordingItem = {
        id: `rec-${Date.now()}`,
        name: `SpinMix_Set_${now.toISOString().slice(0, 10)}_${timestampStr}`,
        timestamp: `${now.toLocaleDateString()} ${timestampStr}`,
        duration: result.duration,
        sizeMb: result.blob.size / (1024 * 1024),
        blob: result.blob,
        url
      };

      setRecordings((prev) => [newRec, ...prev]);
    }
  };

  const handleDeleteRecording = (id: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  };

  // Fullscreen Toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Determine whether we are in widescreen horizontal DJ layout
  const isLandscapeMode = !isPortrait || forceLandscape;

  return (
    <div className={`h-[100dvh] w-full bg-carbon text-slate-100 flex flex-col overflow-hidden selection:bg-cyan-500 selection:text-black safe-area-landscape ${forceLandscape ? 'forced-landscape' : ''}`}>
      {/* Compact App Header - logo + cross-screen quick actions only.
          Everything else (Mixer/FX/Sampler/Library) lives behind the bottom
          tab bar below, never behind scrolling. */}
      <header className="shrink-0 safe-area-top bg-gradient-to-b from-[#141824] via-[#0f121a] to-[#0a0d13] border-b border-[#252c3e] px-2.5 sm:px-6 py-2 flex items-center justify-between shadow-2xl z-20">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-cyan-600 via-indigo-600 to-amber-500 p-0.5 shadow-bevel-out flex items-center justify-center flex-shrink-0">
            <Disc3 className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div className="min-w-0">
            <h1 className="font-['Chakra_Petch'] text-sm sm:text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-amber-400 drop-shadow truncate">
              SPIN MIX
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-mono text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 led-glow-green" />
              <span>3D PRO ANDROID DJ CONSOLE</span>
            </div>
          </div>
        </div>

        {/* Cross-Screen Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Mobile Screen Rotate Orientation Toggle */}
          <button
            onClick={handleToggleRotate}
            className={`p-2 rounded-lg transition-all shadow-tactile-btn border ${
              forceLandscape
                ? 'bg-amber-500 text-black border-amber-300 led-glow-amber'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title={forceLandscape ? 'Reset to normal portrait view' : 'Rotate phone screen into horizontal landscape DJ console'}
          >
            <Smartphone className={`w-4 h-4 ${forceLandscape || !isPortrait ? 'rotate-90' : 'text-amber-400'}`} />
          </button>

          {/* Live Recording Toggle */}
          <button
            onClick={() => setIsRecorderOpen(true)}
            className={`p-2 rounded-lg border transition-all shadow-tactile-btn relative ${
              isRecording
                ? 'bg-rose-600 text-white border-rose-400 led-glow-red animate-pulse'
                : 'bg-slate-900/90 text-slate-300 border-white/10 hover:border-rose-500/50 hover:text-white'
            }`}
            title={isRecording ? `Recording live - ${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')}` : 'Record set'}
          >
            <Circle className={`w-4 h-4 ${isRecording ? 'fill-white animate-ping' : 'fill-rose-500 text-rose-500'}`} />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 shadow-tactile-btn"
            title="Toggle Fullscreen Live Gig Mode"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Persistent Waveform Strip - visible on every screen (Decks, Mixer,
          FX, Sampler), matching the always-on-top waveform pattern in
          Cross DJ / djay. Never hidden behind a tab switch. */}
      <div className="shrink-0 px-2 sm:px-3 pt-2">
        <WaveformDisplay
          deckA={deckA}
          deckB={deckB}
          onSeekA={(t) => audioEngine.seekDeck('A', t)}
          onSeekB={(t) => audioEngine.seekDeck('B', t)}
        />
      </div>

      {/* Main Content Area - fills exactly the space between header and the
          bottom tab bar below. Only ONE screen renders at a time; switching
          screens is instant (no navigation stack, no page scroll to "find"
          FX/Sampler/Mixer - they're one tap away on the tab bar). */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        {activeScreen === 'decks' && (
          <div className="h-full w-full flex flex-col gap-2 p-2 sm:p-3 max-w-[1700px] mx-auto overflow-y-auto">
            {/* Mobile Portrait Orientation Prompt */}
            {!isLandscapeMode && (
              <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-amber-950/80 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-bevel-out flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Smartphone className="w-4 h-4 text-amber-400 rotate-90 animate-pulse flex-shrink-0" />
                  <span className="text-[11px] sm:text-xs text-slate-300 font-['Chakra_Petch'] font-bold truncate">
                    Rotate phone to Landscape for 2-deck full mixer view
                  </span>
                </div>
                <button
                  onClick={handleToggleRotate}
                  className="px-2.5 py-1 text-[11px] font-black font-['Chakra_Petch'] rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-tactile-btn uppercase tracking-wider flex-shrink-0 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3 text-black" />
                  ROTATE
                </button>
              </div>
            )}

            {/* Mobile Phone Deck Focus Switcher (Portrait Mode) */}
            {!isLandscapeMode && (
              <div className="flex items-center justify-between bg-[#11141e] p-1 rounded-xl border border-white/5 text-[11px] font-['Chakra_Petch'] font-bold gap-1 flex-shrink-0">
                <button
                  onClick={() => setPhoneDeckView('dual')}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                    phoneDeckView === 'dual' ? 'bg-slate-700 text-white border border-white/20' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  DUAL DECKS
                </button>
                <button
                  onClick={() => setPhoneDeckView('deckA')}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                    phoneDeckView === 'deckA' ? 'bg-cyan-600 text-black font-black led-glow-cyan' : 'text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  DECK A FOCUS
                </button>
                <button
                  onClick={() => setPhoneDeckView('deckB')}
                  className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                    phoneDeckView === 'deckB' ? 'bg-amber-600 text-black font-black led-glow-amber' : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  DECK B FOCUS
                </button>
              </div>
            )}

        {/* Center Performance Cockpit: Deck A | (Mixer) | Deck B */}
        <div className={`grid gap-3 items-start ${isLandscapeMode ? 'grid-cols-12' : 'grid-cols-1'}`}>
          {/* DECK A */}
          {(isLandscapeMode || phoneDeckView === 'dual' || phoneDeckView === 'deckA') && (
            <div className={`${isLandscapeMode ? 'col-span-4' : 'w-full'} bg-gradient-to-b from-[#131622] via-[#0d1017] to-[#08090d] rounded-2xl border-2 border-cyan-500/30 shadow-bevel-out p-3 sm:p-4 flex flex-col gap-3`}>
              {/* Deck A Title & Status */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-['Chakra_Petch'] text-sm font-black text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/40">
                    DECK A
                  </span>
                  <span className="text-xs font-bold text-white truncate max-w-[180px]">
                    {deckA.track ? deckA.track.title : 'Load a track'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-cyan-300 font-bold">{deckA.bpm.toFixed(1)} BPM</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{deckA.track?.key || '--'}</span>
                </div>
              </div>

              {/* 3D Tactile Jog Wheel with Vinyl Scratching */}
              <JogWheel3D
                deck={deckA}
                deckColor="cyan"
                onScratchStart={() => setDeckA((d) => ({ ...d, isScratching: true }))}
                onScratchEnd={() => setDeckA((d) => ({ ...d, isScratching: false }))}
                onNudge={(delta) => handleNudge('A', delta)}
              />

              {/* Deck A Transport & Performance Pad Controls */}
              <DeckControls
                deck={deckA}
                otherDeckBpm={deckB.bpm}
                deckColor="cyan"
                onPlayToggle={() => togglePlayDeck('A')}
                onCue={() => handleCue('A')}
                onSync={() => handleSync('A')}
                onTapBpm={() => handleTapBpm('A')}
                onPitchChange={(p) => handlePitchChange('A', p)}
                onPitchRangeChange={(r) => setDeckA((d) => ({ ...d, pitchRange: r }))}
                onKeyLockToggle={() => setDeckA((d) => ({ ...d, keyLock: !d.keyLock }))}
                onVinylModeToggle={() => setDeckA((d) => ({ ...d, vinylMode: !d.vinylMode }))}
                onSetHotCue={(id) => handleSetHotCue('A', id)}
                onTriggerHotCue={(id) => handleTriggerHotCue('A', id)}
                onClearHotCue={(id) => handleClearHotCue('A', id)}
                onSetBeatLoop={(b) => handleSetBeatLoop('A', b)}
                onExitLoop={() => handleExitLoop('A')}
              />
            </div>
          )}

          {/* CENTER 2-CHANNEL MIXER STRIP (Visible inline in Landscape mode) */}
          {isLandscapeMode && (
            <div className="col-span-4 flex flex-col gap-3">
              <MixerSection
                deckA={deckA}
                deckB={deckB}
                crossfader={crossfader}
                crossfaderCurve={crossfaderCurve}
                masterVolume={masterVolume}
                audioEngine={audioEngine}
                onUpdateDeckA={updateDeckA}
                onUpdateDeckB={updateDeckB}
                onCrossfaderChange={handleCrossfader}
                onCrossfaderCurveToggle={handleCrossfaderCurveToggle}
                onMasterVolumeChange={handleMasterVolume}
              />
            </div>
          )}

          {/* DECK B */}
          {(isLandscapeMode || phoneDeckView === 'dual' || phoneDeckView === 'deckB') && (
            <div className={`${isLandscapeMode ? 'col-span-4' : 'w-full'} bg-gradient-to-b from-[#131622] via-[#0d1017] to-[#08090d] rounded-2xl border-2 border-amber-500/30 shadow-bevel-out p-3 sm:p-4 flex flex-col gap-3`}>
              {/* Deck B Title & Status */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-['Chakra_Petch'] text-sm font-black text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/40">
                    DECK B
                  </span>
                  <span className="text-xs font-bold text-white truncate max-w-[180px]">
                    {deckB.track ? deckB.track.title : 'Load a track'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-amber-300 font-bold">{deckB.bpm.toFixed(1)} BPM</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{deckB.track?.key || '--'}</span>
                </div>
              </div>

              {/* 3D Tactile Jog Wheel with Vinyl Scratching */}
              <JogWheel3D
                deck={deckB}
                deckColor="amber"
                onScratchStart={() => setDeckB((d) => ({ ...d, isScratching: true }))}
                onScratchEnd={() => setDeckB((d) => ({ ...d, isScratching: false }))}
                onNudge={(delta) => handleNudge('B', delta)}
              />

              {/* Deck B Transport & Performance Pad Controls */}
              <DeckControls
                deck={deckB}
                otherDeckBpm={deckA.bpm}
                deckColor="amber"
                onPlayToggle={() => togglePlayDeck('B')}
                onCue={() => handleCue('B')}
                onSync={() => handleSync('B')}
                onTapBpm={() => handleTapBpm('B')}
                onPitchChange={(p) => handlePitchChange('B', p)}
                onPitchRangeChange={(r) => setDeckB((d) => ({ ...d, pitchRange: r }))}
                onKeyLockToggle={() => setDeckB((d) => ({ ...d, keyLock: !d.keyLock }))}
                onVinylModeToggle={() => setDeckB((d) => ({ ...d, vinylMode: !d.vinylMode }))}
                onSetHotCue={(id) => handleSetHotCue('B', id)}
                onTriggerHotCue={(id) => handleTriggerHotCue('B', id)}
                onClearHotCue={(id) => handleClearHotCue('B', id)}
                onSetBeatLoop={(b) => handleSetBeatLoop('B', b)}
                onExitLoop={() => handleExitLoop('B')}
              />
            </div>
          )}
        </div>
          </div>
        )}

        {/* MIXER SCREEN - full 2-channel strip, reached via the bottom tab bar */}
        {activeScreen === 'mixer' && (
          <div className="h-full w-full overflow-y-auto p-3 flex items-start justify-center">
            <MixerSection
              deckA={deckA}
              deckB={deckB}
              crossfader={crossfader}
              crossfaderCurve={crossfaderCurve}
              masterVolume={masterVolume}
              audioEngine={audioEngine}
              onUpdateDeckA={updateDeckA}
              onUpdateDeckB={updateDeckB}
              onCrossfaderChange={handleCrossfader}
              onCrossfaderCurveToggle={handleCrossfaderCurveToggle}
              onMasterVolumeChange={handleMasterVolume}
            />
          </div>
        )}

        {/* DOUBLE FX SCREEN - reached via the bottom tab bar */}
        {activeScreen === 'fx' && (
          <div className="h-full w-full overflow-y-auto p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto">
              <DoubleFxUnit
                deckId="A"
                deckColor="cyan"
                fx1={deckA.fx1}
                fx2={deckA.fx2}
                onUpdateFx1={(u) => handleUpdateFx('A', 1, u)}
                onUpdateFx2={(u) => handleUpdateFx('A', 2, u)}
              />
              <DoubleFxUnit
                deckId="B"
                deckColor="amber"
                fx1={deckB.fx1}
                fx2={deckB.fx2}
                onUpdateFx1={(u) => handleUpdateFx('B', 1, u)}
                onUpdateFx2={(u) => handleUpdateFx('B', 2, u)}
              />
            </div>
          </div>
        )}

        {/* SAMPLER SCREEN - reached via the bottom tab bar */}
        {activeScreen === 'sampler' && (
          <div className="h-full w-full overflow-y-auto p-3 flex items-start justify-center">
            <div className="w-full max-w-2xl">
              <Sampler6Pad
                pads={samplerPads}
                onTriggerPad={handleTriggerSamplerPad}
                onStopPad={handleStopSamplerPad}
                onUpdatePad={handleUpdateSamplerPad}
                onLoadCustomSample={handleLoadCustomSample}
              />
            </div>
          </div>
        )}
      </main>

      {/* Persistent Crossfader Dock - visible on every screen, just like the
          always-on-top CUE/PLAY/SYNC/crossfader transport strip in Cross DJ
          / djay. This is the one control you always need reachable, mid-mix,
          no matter which panel (FX/Sampler/Mixer) you're looking at. */}
      <div className="shrink-0 px-2 sm:px-3 pb-1.5">
        <div className="bg-[#10131d] border border-white/10 rounded-2xl p-2.5 shadow-bevel-out flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[10px] font-['Chakra_Petch'] font-bold text-slate-400 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-black">A</span>
              <span className="font-mono text-slate-500">{deckA.bpm.toFixed(1)} BPM</span>
            </div>
            <span className="text-slate-600">CROSSFADER</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-slate-500">{deckB.bpm.toFixed(1)} BPM</span>
              <span className="text-amber-400 font-black">B</span>
            </div>
          </div>

          {/* Crossfader with Quick Cut Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Cut Deck A Button */}
            <button
              id="btn-crossfader-cut-a"
              onClick={() => handleCrossfader(-1)}
              className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-300 active:text-black font-['Chakra_Petch'] text-xs font-black border border-slate-700 transition-all shadow-tactile-btn flex-shrink-0"
              title="Cut entirely to Deck A"
            >
              ◀ CUT A
            </button>

            {/* Tactile Crossfader Slider */}
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min="-1"
                max="1"
                step="0.01"
                value={crossfader}
                onChange={(e) => handleCrossfader(parseFloat(e.target.value))}
                className="w-full h-7 bg-[#0b0d13] rounded-lg border border-white/10 appearance-none cursor-pointer accent-cyan-400 touch-none shadow-bevel-in"
                title="Crossfader (Slide between Deck A & Deck B)"
              />
              {/* Center Detent LED */}
              <button
                onClick={() => handleCrossfader(0)}
                className={`absolute left-1/2 -translate-x-1/2 -top-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-all ${
                  Math.abs(crossfader) < 0.05
                    ? 'bg-emerald-500 text-black border-emerald-300 led-glow-green font-black'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="Snap Crossfader to Center (0.0)"
              >
                CENTER
              </button>
            </div>

            {/* Quick Cut Deck B Button */}
            <button
              id="btn-crossfader-cut-b"
              onClick={() => handleCrossfader(1)}
              className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-amber-600 text-slate-300 active:text-black font-['Chakra_Petch'] text-xs font-black border border-slate-700 transition-all shadow-tactile-btn flex-shrink-0"
              title="Cut entirely to Deck B"
            >
              CUT B ▶
            </button>

            {/* Curve switch */}
            <button
              onClick={handleCrossfaderCurveToggle}
              className={`px-2 py-2 rounded-lg text-[10px] font-['Chakra_Petch'] font-black border uppercase transition-all shadow-tactile-btn flex-shrink-0 ${
                crossfaderCurve === 'sharp'
                  ? 'bg-purple-950 text-purple-300 border-purple-500/50 led-glow-magenta'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle Crossfader Curve (Smooth Mix vs Sharp Scratch Cut)"
            >
              {crossfaderCurve === 'sharp' ? 'SCRATCH' : 'SMOOTH'}
            </button>
          </div>
        </div>
      </div>

      {/* PERSISTENT BOTTOM TAB BAR - the single, consistent way to reach every
          screen (Decks/Mixer/FX/Sampler/Library), Android Material style.
          Always visible, always in the same place, never behind a scroll. */}
      <nav className="shrink-0 bg-gradient-to-t from-[#0a0c12] via-[#0d0f17] to-[#10131d] border-t border-[#252c3e] px-1.5 py-1.5 flex items-stretch gap-1 shadow-2xl z-20 safe-area-bottom">
        <button
          onClick={() => setActiveScreen('decks')}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
            activeScreen === 'decks'
              ? 'bg-gradient-to-b from-cyan-600 to-indigo-600 text-white led-glow-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Disc3 className="w-5 h-5" />
          <span className="text-[9px] font-['Chakra_Petch'] font-black uppercase">Decks</span>
        </button>

        <button
          onClick={() => setActiveScreen('mixer')}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
            activeScreen === 'mixer'
              ? 'bg-gradient-to-b from-cyan-600 to-indigo-600 text-white led-glow-cyan'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-5 h-5" />
          <span className="text-[9px] font-['Chakra_Petch'] font-black uppercase">Mixer</span>
        </button>

        <button
          onClick={() => setActiveScreen('fx')}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all relative ${
            activeScreen === 'fx'
              ? 'bg-gradient-to-b from-purple-600 to-pink-600 text-white led-glow-magenta'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[9px] font-['Chakra_Petch'] font-black uppercase">FX</span>
          {(deckA.fx1.active || deckA.fx2.active || deckB.fx1.active || deckB.fx2.active) && (
            <span className="absolute top-1 right-1/4 w-1.5 h-1.5 rounded-full bg-emerald-400 led-glow-green animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveScreen('sampler')}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
            activeScreen === 'sampler'
              ? 'bg-gradient-to-b from-amber-600 to-orange-600 text-white led-glow-amber'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[9px] font-['Chakra_Petch'] font-black uppercase">Sampler</span>
        </button>

        <button
          onClick={() => setIsLibraryOpen(true)}
          className="flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-slate-400 hover:text-white relative"
        >
          <Folder className="w-5 h-5" />
          <span className="text-[9px] font-['Chakra_Petch'] font-black uppercase">Library</span>
          <span className="absolute -top-0.5 right-1/4 bg-cyan-950 text-cyan-300 text-[8px] px-1 rounded-full border border-cyan-500/30 leading-tight">
            {tracks.length}
          </span>
        </button>
      </nav>

      {/* Local Track Library Modal */}
      <TrackLibraryModal
        isOpen={isLibraryOpen}
        tracks={tracks}
        onClose={() => setIsLibraryOpen(false)}
        onLoadTrackToDeck={handleLoadTrackToDeck}
        onImportFiles={handleImportFiles}
        isLoadingAudio={isLoadingAudio}
      />

      {/* Live Set Recording Modal */}
      <RecorderModal
        isOpen={isRecorderOpen}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        recordings={recordings}
        onClose={() => setIsRecorderOpen(false)}
        onStartRecord={handleStartRecord}
        onStopRecord={handleStopRecord}
        onDeleteRecording={handleDeleteRecording}
      />
    </div>
  );
}
