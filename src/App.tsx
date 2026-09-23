/**
 * Spin Mix — Professional Modern Android DJ Application
 * Tactile 3D Console, Dual Scratch Jogwheels, Low-Latency Web Audio Engine,
 * Double FX with Lock/Freeze, 6-Pad Sampler with Custom MP3 Loading,
 * Dual Multi-Band Scrolling Waveforms, Crossfader & Local Storage Library.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DeckState, Track, SamplerPad, RecordingItem, FxState } from './types';
import { AudioEngine } from './audio/audioEngine';
import { AudioScanner } from 'capacitor-audio-scanner';
import { WaveformDisplay } from './components/WaveformDisplay';
import { JogWheel3D } from './components/JogWheel3D';
import { MixerSection } from './components/MixerSection';
import { DeckControls } from './components/DeckControls';
import { DoubleFxUnit } from './components/DoubleFxUnit';
import { Sampler6Pad } from './components/Sampler6Pad';
import { TrackLibraryModal } from './components/TrackLibraryModal';
import { RecorderModal } from './components/RecorderModal';
import { PerformanceModal, PerformanceTab } from './components/PerformanceModal';
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
  const [meterLevels, setMeterLevels] = useState({ master: 0, deckA: 0, deckB: 0 });

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

  // UI Drawer / Modal Toggles (Cross DJ Launcher Engine)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [launchedModal, setLaunchedModal] = useState<PerformanceTab | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<'fx' | 'sampler' | 'both'>('both');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-Gain Normalization State (ITU-R BS.1770 LUFS)
  const [autoGainEnabled, setAutoGainEnabled] = useState(true);
  const [targetLufs, setTargetLufs] = useState(-14);

  // Mobile Orientation & Phone DJing Controls
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth;
    }
    return false;
  });
  const [forceLandscape, setForceLandscape] = useState(false);
  const [phoneDeckView, setPhoneDeckView] = useState<'dual' | 'deckA' | 'deckB'>('dual');

  // Sync fullscreen state with browser changes (F11, ESC key, or OS gestures)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

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

          const gainA = tA.lufs !== undefined ? audioEngine.calculateAutoGain(tA.lufs, -14) : 1.0;
          const gainB = tB.lufs !== undefined ? audioEngine.calculateAutoGain(tB.lufs, -14) : 1.0;

          audioEngine.loadTrackToDeck('A', tA);
          audioEngine.setDeckGain('A', gainA);
          setDeckA((prev) => ({
            ...prev,
            track: tA,
            gain: gainA,
            duration: tA.duration,
            bpm: tA.bpm
          }));

          audioEngine.loadTrackToDeck('B', tB);
          audioEngine.setDeckGain('B', gainB);
          setDeckB((prev) => ({
            ...prev,
            track: tB,
            gain: gainB,
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

        // Native Android Audio Library Scan via AudioScanner Plugin
        try {
          const perm = await AudioScanner.checkPermission();
          let granted = perm.audio === 'granted';
          if (!granted) {
            const req = await AudioScanner.requestPermission();
            granted = req.audio === 'granted';
          }

          if (granted) {
            const scanResult = await AudioScanner.listAudioFiles();
            if (scanResult && scanResult.files && scanResult.files.length > 0) {
              const scannedTracks: Track[] = scanResult.files.map((file, idx) => ({
                id: `scanned-${file.id || idx}`,
                title: file.title || 'Unknown Title',
                artist: file.artist || 'Unknown Artist',
                bpm: 120, // Fast metadata placeholder; analyzed on first deck load
                originalBpm: 120,
                key: '8A',
                musicalKey: 'Am',
                duration: file.duration || 0,
                uri: file.uri,
                fileFormat: file.mimeType ? file.mimeType.split('/')[1] || 'audio' : 'audio',
                fileName: file.title,
                isScanned: true,
                audioBuffer: null
              }));

              if (mounted) {
                setTracks((prev) => {
                  const existingIds = new Set(prev.map((t) => t.id));
                  const newUnique = scannedTracks.filter((t) => !existingIds.has(t.id));
                  return [...prev, ...newUnique];
                });
              }
            }
          }
        } catch (scanErr) {
          console.warn('AudioScanner MediaStore scan skipped/unavailable:', scanErr);
        }
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
      // Meters
      const levels = audioEngine.getMeterLevels();
      setMeterLevels(levels);

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
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const trackItem: Track = {
        id: `local-${Date.now()}-${i}`,
        title: cleanName,
        artist: 'Local File',
        bpm: 120,
        originalBpm: 120,
        key: '8A',
        musicalKey: 'Am',
        duration: 0,
        audioBuffer: null,
        fileFormat: file.type.split('/')[1] || file.name.split('.').pop() || 'audio',
        fileName: file.name,
        file: file
      };
      newTracks.push(trackItem);
    }

    setTracks((prev) => [...prev, ...newTracks]);
    setIsLoadingAudio(false);
  };

  // Load track from library to Deck A or Deck B (with Lazy Decoding & Analysis)
  const handleLoadTrackToDeck = async (deckId: 'A' | 'B', track: Track) => {
    let resolvedTrack: Track = track;

    // Perform lazy decoding if AudioBuffer has not yet been decoded and cached
    if (!resolvedTrack.audioBuffer) {
      setIsLoadingAudio(true);
      try {
        let audioBuffer: AudioBuffer | null = null;

        if (resolvedTrack.uri) {
          // Read base64 audio bytes via AudioScanner plugin
          const res = await AudioScanner.readAudioFile({ uri: resolvedTrack.uri });
          if (res && res.data) {
            const binaryString = atob(res.data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            audioBuffer = await audioEngine.decodeAudioArrayBuffer(bytes.buffer);
          }
        } else if (resolvedTrack.file) {
          audioBuffer = await audioEngine.decodeAudioFile(resolvedTrack.file);
        }

        if (audioBuffer) {
          const waveformData = audioEngine.extractWaveformData(audioBuffer);
          const { bpm, key, musicalKey, lufs } = audioEngine.analyzeBpmAndKey(audioBuffer);

          resolvedTrack = {
            ...resolvedTrack,
            audioBuffer,
            waveformData,
            bpm,
            originalBpm: bpm,
            key,
            musicalKey,
            lufs,
            duration: audioBuffer.duration
          };

          // Cache resolved track in library state
          setTracks((prev) =>
            prev.map((t) => (t.id === resolvedTrack.id ? resolvedTrack : t))
          );
        }
      } catch (err) {
        console.error('Failed to decode audio track on deck load:', err);
      } finally {
        setIsLoadingAudio(false);
      }
    }

    // Measure LUFS if missing and audio buffer is available
    if (resolvedTrack.audioBuffer && resolvedTrack.lufs === undefined) {
      resolvedTrack.lufs = audioEngine.calculateLufs(resolvedTrack.audioBuffer);
    }

    // Calculate auto-gain trim if enabled
    let targetGain = deckId === 'A' ? deckA.gain : deckB.gain;
    if (autoGainEnabled && resolvedTrack.lufs !== undefined) {
      targetGain = audioEngine.calculateAutoGain(resolvedTrack.lufs, targetLufs);
      audioEngine.setDeckGain(deckId, targetGain);
    }

    // Load into Web Audio Engine
    audioEngine.loadTrackToDeck(deckId, resolvedTrack);

    if (deckId === 'A') {
      setDeckA((d) => ({
        ...d,
        track: resolvedTrack,
        gain: targetGain,
        duration: resolvedTrack.duration,
        currentTime: 0,
        bpm: resolvedTrack.bpm,
        pitch: 0,
        playbackRate: 1.0,
        isPlaying: false,
        cuePoints: []
      }));
    } else {
      setDeckB((d) => ({
        ...d,
        track: resolvedTrack,
        gain: targetGain,
        duration: resolvedTrack.duration,
        currentTime: 0,
        bpm: resolvedTrack.bpm,
        pitch: 0,
        playbackRate: 1.0,
        isPlaying: false,
        cuePoints: []
      }));
    }
  };

  // Auto-Gain Normalization Handlers
  const handleToggleAutoGain = () => {
    const nextVal = !autoGainEnabled;
    setAutoGainEnabled(nextVal);
    if (nextVal) {
      if (deckA.track && deckA.track.lufs !== undefined) {
        const gainA = audioEngine.calculateAutoGain(deckA.track.lufs, targetLufs);
        setDeckA((d) => ({ ...d, gain: gainA }));
        audioEngine.setDeckGain('A', gainA);
      }
      if (deckB.track && deckB.track.lufs !== undefined) {
        const gainB = audioEngine.calculateAutoGain(deckB.track.lufs, targetLufs);
        setDeckB((d) => ({ ...d, gain: gainB }));
        audioEngine.setDeckGain('B', gainB);
      }
    }
  };

  const handleTargetLufsChange = (newTarget: number) => {
    setTargetLufs(newTarget);
    if (autoGainEnabled) {
      if (deckA.track && deckA.track.lufs !== undefined) {
        const gainA = audioEngine.calculateAutoGain(deckA.track.lufs, newTarget);
        setDeckA((d) => ({ ...d, gain: gainA }));
        audioEngine.setDeckGain('A', gainA);
      }
      if (deckB.track && deckB.track.lufs !== undefined) {
        const gainB = audioEngine.calculateAutoGain(deckB.track.lufs, newTarget);
        setDeckB((d) => ({ ...d, gain: gainB }));
        audioEngine.setDeckGain('B', gainB);
      }
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
    <div className={`min-h-screen bg-carbon text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black safe-area-landscape ${isFullscreen ? 'w-full h-full min-h-screen' : ''} ${forceLandscape ? 'forced-landscape' : ''}`}>
      {/* Top Professional DJ Header Console Bar */}
      <header className="bg-gradient-to-b from-[#141824] via-[#0f121a] to-[#0a0d13] border-b border-[#252c3e] px-2.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between shadow-2xl z-20">
        {/* Brand Logo & Telemetry */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 via-indigo-600 to-amber-500 p-0.5 shadow-bevel-out flex items-center justify-center">
              <Disc3 className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h1 className="font-['Chakra_Petch'] text-lg sm:text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-amber-400 drop-shadow">
                SPIN MIX
              </h1>
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 led-glow-green" />
                <span>3D PRO ANDROID DJ CONSOLE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Master Live Controls, Record Indicator & Drawers */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Mobile Screen Rotate Orientation Toggle Button */}
          <button
            onClick={handleToggleRotate}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-['Chakra_Petch'] font-black flex items-center gap-1.5 transition-all shadow-tactile-btn border ${
              forceLandscape
                ? 'bg-amber-500 text-black border-amber-300 led-glow-amber'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title={forceLandscape ? 'Reset to normal portrait view' : 'Rotate phone screen into horizontal landscape DJ console'}
          >
            <Smartphone className={`w-3.5 h-3.5 ${forceLandscape || !isPortrait ? 'rotate-90 text-black' : 'text-amber-400'}`} />
            <span className="hidden xs:inline">
              {forceLandscape ? 'PORTRAIT' : 'ROTATE'}
            </span>
          </button>

          {/* Live Recording Trigger Pill */}
          <button
            onClick={() => setIsRecorderOpen(true)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-['Chakra_Petch'] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 border transition-all shadow-tactile-btn ${
              isRecording
                ? 'bg-rose-600 text-white border-rose-400 led-glow-red animate-pulse'
                : 'bg-slate-900/90 text-slate-300 border-white/10 hover:border-rose-500/50 hover:text-white'
            }`}
          >
            <Circle className={`w-3.5 h-3.5 ${isRecording ? 'fill-white animate-ping' : 'fill-rose-500 text-rose-500'}`} />
            <span className="hidden sm:inline">{isRecording ? `REC LIVE [${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')}]` : 'RECORD SET'}</span>
            <span className="sm:hidden">{isRecording ? 'REC' : 'REC'}</span>
          </button>

          {/* Local Tracks Library Toggle */}
          <button
            onClick={() => setIsLibraryOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 shadow-tactile-btn text-xs font-['Chakra_Petch'] font-black flex items-center gap-1.5 transition-all"
          >
            <Folder className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">TRACK LIBRARY</span>
            <span className="bg-cyan-950 text-cyan-300 text-[10px] px-1.5 py-0.2 rounded border border-cyan-500/30">
              {tracks.length}
            </span>
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

      {/* Main DJ Console Stage */}
      <main className={`flex-1 flex flex-col gap-3 p-2 sm:p-4 w-full mx-auto transition-all ${isFullscreen ? 'max-w-none px-3 sm:px-6' : 'max-w-[1750px]'}`}>
        {/* Mobile Portrait Orientation Prompt */}
        {!isLandscapeMode && (
          <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-amber-950/80 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-bevel-out">
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

        {/* Dual Stacked Multi-Band Waveform Display */}
        <WaveformDisplay
          deckA={deckA}
          deckB={deckB}
          onSeekA={(t) => audioEngine.seekDeck('A', t)}
          onSeekB={(t) => audioEngine.seekDeck('B', t)}
        />

        {/* CROSS DJ PERFORMANCE LAUNCH BAR */}
        <div className="bg-gradient-to-r from-[#141825] via-[#10141d] to-[#141825] border border-white/10 rounded-xl p-1.5 sm:p-2 flex items-center justify-between gap-1.5 shadow-bevel-out">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto w-full py-0.5">
            {/* Launch MIXER */}
            <button
              id="btn-launch-mixer"
              onClick={() => setLaunchedModal('mixer')}
              className={`flex-1 min-w-[85px] py-2 px-2 rounded-lg text-xs font-['Chakra_Petch'] font-black flex items-center justify-center gap-1.5 border shadow-tactile-btn transition-all active:scale-95 ${
                launchedModal === 'mixer'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white border-cyan-400 led-glow-cyan'
                  : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:border-cyan-500/50 hover:text-white'
              }`}
              title="Launch 2-Channel Mixer (3-Band EQs, Filters, Gain Trim, Crossfader Curve, Routing)"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate">MIXER</span>
            </button>

            {/* Launch DOUBLE FX */}
            <button
              id="btn-launch-fx"
              onClick={() => setLaunchedModal('fx')}
              className={`flex-1 min-w-[95px] py-2 px-2 rounded-lg text-xs font-['Chakra_Petch'] font-black flex items-center justify-center gap-1.5 border shadow-tactile-btn transition-all active:scale-95 ${
                launchedModal === 'fx'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-400 led-glow-magenta'
                  : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:border-purple-500/50 hover:text-white'
              }`}
              title="Launch Double FX Rack (11 Studio FX, Kaoss Touchpads, FX Lock/Freeze, Backspin)"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span className="truncate">DOUBLE FX</span>
              {(deckA.fx1.active || deckA.fx2.active || deckB.fx1.active || deckB.fx2.active) && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 led-glow-green animate-ping" />
              )}
            </button>

            {/* Launch SAMPLER */}
            <button
              id="btn-launch-sampler"
              onClick={() => setLaunchedModal('sampler')}
              className={`flex-1 min-w-[90px] py-2 px-2 rounded-lg text-xs font-['Chakra_Petch'] font-black flex items-center justify-center gap-1.5 border shadow-tactile-btn transition-all active:scale-95 ${
                launchedModal === 'sampler'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-400 led-glow-amber'
                  : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:border-amber-500/50 hover:text-white'
              }`}
              title="Launch 6-Pad Performance Sampler with custom MP3 loading"
            >
              <Grid className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate">SAMPLER</span>
            </button>

            {/* Launch LIBRARY */}
            <button
              id="btn-launch-library"
              onClick={() => setIsLibraryOpen(true)}
              className="flex-1 min-w-[85px] py-2 px-2 rounded-lg text-xs font-['Chakra_Petch'] font-black flex items-center justify-center gap-1.5 border shadow-tactile-btn transition-all bg-slate-800/90 text-slate-200 border-slate-700 hover:border-cyan-500/50 hover:text-white active:scale-95"
              title="Browse and load local audio tracks"
            >
              <Folder className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate">LIBRARY</span>
              <span className="bg-cyan-950 text-cyan-300 text-[10px] px-1 rounded border border-cyan-500/30">
                {tracks.length}
              </span>
            </button>

            {/* Launch RECORDER */}
            <button
              id="btn-launch-recorder"
              onClick={() => setIsRecorderOpen(true)}
              className={`flex-1 min-w-[85px] py-2 px-2 rounded-lg text-xs font-['Chakra_Petch'] font-black flex items-center justify-center gap-1.5 border shadow-tactile-btn transition-all active:scale-95 ${
                isRecording
                  ? 'bg-rose-600 text-white border-rose-400 led-glow-red animate-pulse'
                  : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:border-rose-500/50 hover:text-white'
              }`}
              title="Record Master Mix Live to Device Storage"
            >
              <Circle className={`w-3.5 h-3.5 ${isRecording ? 'fill-white animate-ping' : 'fill-rose-500 text-rose-500'}`} />
              <span className="truncate">{isRecording ? 'REC LIVE' : 'RECORD'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Phone Deck Focus Switcher (When in Portrait Mode) */}
        {!isLandscapeMode && (
          <div className="flex items-center justify-between bg-[#11141e] p-1 rounded-xl border border-white/5 text-[11px] font-['Chakra_Petch'] font-bold gap-1">
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
                meterLevels={meterLevels}
                autoGainEnabled={autoGainEnabled}
                targetLufs={targetLufs}
                onToggleAutoGain={handleToggleAutoGain}
                onTargetLufsChange={handleTargetLufsChange}
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

        {/* MAIN SCREEN HARDWARE CROSSFADER DOCK (Accessible at all times) */}
        <div className="bg-[#10131d] border border-white/10 rounded-2xl p-3 shadow-bevel-out flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-['Chakra_Petch'] font-bold text-slate-400 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-black">DECK A</span>
              <span className="text-[10px] font-mono bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30 text-cyan-300">
                ROUTE: {deckA.crossfaderRouting}
              </span>
            </div>

            <button
              onClick={() => setLaunchedModal('mixer')}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-950/60 hover:bg-cyan-900/60 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition-all shadow-tactile-btn active:scale-95"
              title="Launch Full 2-Channel Mixer with 3-Band EQs, Filters & Gain Trim"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>LAUNCH FULL MIXER EQ</span>
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-300">
                ROUTE: {deckB.crossfaderRouting}
              </span>
              <span className="text-amber-400 font-black">DECK B</span>
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

        {/* Lower Performance Deck: Double FX Units & 6-Pad Sampler (Only inline when in Landscape mode) */}
        {isLandscapeMode && (
          <div className="flex flex-col gap-3 mt-1">
            {/* Section View Selector Bar */}
            <div className="flex items-center justify-between bg-[#11141e] px-4 py-2 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-['Chakra_Petch'] font-bold text-slate-400 uppercase">
                  PERFORMANCE UNITS:
                </span>
                <button
                  onClick={() => setActiveBottomTab('both')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    activeBottomTab === 'both'
                      ? 'bg-slate-700 text-white border border-white/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  DUAL VIEW (FX + SAMPLER)
                </button>
                <button
                  onClick={() => setActiveBottomTab('fx')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    activeBottomTab === 'fx'
                      ? 'bg-slate-700 text-white border border-white/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  DOUBLE FX ONLY
                </button>
                <button
                  onClick={() => setActiveBottomTab('sampler')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    activeBottomTab === 'sampler'
                      ? 'bg-slate-700 text-white border border-white/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  6-PAD SAMPLER ONLY
                </button>
              </div>

              <div className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                LOW-LATENCY DSP • REAL-TIME HARDWARE ACCELERATED
              </div>
            </div>

            {/* Double FX Units (Deck A & Deck B) */}
            {(activeBottomTab === 'both' || activeBottomTab === 'fx') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Deck A Double FX */}
                <DoubleFxUnit
                  deckId="A"
                  deckColor="cyan"
                  fx1={deckA.fx1}
                  fx2={deckA.fx2}
                  onUpdateFx1={(u) => handleUpdateFx('A', 1, u)}
                  onUpdateFx2={(u) => handleUpdateFx('A', 2, u)}
                />

                {/* Deck B Double FX */}
                <DoubleFxUnit
                  deckId="B"
                  deckColor="amber"
                  fx1={deckB.fx1}
                  fx2={deckB.fx2}
                  onUpdateFx1={(u) => handleUpdateFx('B', 1, u)}
                  onUpdateFx2={(u) => handleUpdateFx('B', 2, u)}
                />
              </div>
            )}

            {/* 6-Pad Performance Sampler */}
            {(activeBottomTab === 'both' || activeBottomTab === 'sampler') && (
              <Sampler6Pad
                pads={samplerPads}
                onTriggerPad={handleTriggerSamplerPad}
                onStopPad={handleStopSamplerPad}
                onUpdatePad={handleUpdateSamplerPad}
                onLoadCustomSample={handleLoadCustomSample}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="bg-[#0b0e14] border-t border-[#1d2331] px-4 py-2 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-['Chakra_Petch'] font-bold text-slate-400">SPIN MIX PRO</span>
          <span>•</span>
          <span>Dual Scratch Decks</span>
          <span>•</span>
          <span>11 DSP Effects</span>
          <span>•</span>
          <span>Custom MP3 Sampler</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span>AUDIO ENGINE: {audioEngine.ctx?.state?.toUpperCase() || 'STANDBY'}</span>
          <span>•</span>
          <span>LATENCY: &lt;5ms</span>
        </div>
      </footer>

      {/* Performance Modal (Cross DJ Interactive Launcher Overlay for Mixer, FX, and Sampler) */}
      <PerformanceModal
        isOpen={launchedModal !== null}
        activeTab={launchedModal || 'mixer'}
        onTabChange={(tab) => setLaunchedModal(tab)}
        onClose={() => setLaunchedModal(null)}
        deckA={deckA}
        deckB={deckB}
        crossfader={crossfader}
        crossfaderCurve={crossfaderCurve}
        masterVolume={masterVolume}
        meterLevels={meterLevels}
        autoGainEnabled={autoGainEnabled}
        targetLufs={targetLufs}
        onToggleAutoGain={handleToggleAutoGain}
        onTargetLufsChange={handleTargetLufsChange}
        onUpdateDeckA={updateDeckA}
        onUpdateDeckB={updateDeckB}
        onCrossfaderChange={handleCrossfader}
        onCrossfaderCurveToggle={handleCrossfaderCurveToggle}
        onMasterVolumeChange={handleMasterVolume}
        onUpdateFx={handleUpdateFx}
        samplerPads={samplerPads}
        onTriggerSamplerPad={handleTriggerSamplerPad}
        onStopSamplerPad={handleStopSamplerPad}
        onUpdateSamplerPad={handleUpdateSamplerPad}
        onLoadCustomSample={handleLoadCustomSample}
      />

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
};
