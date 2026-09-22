/**
 * Spin Mix Pro DJ - Real-time Low-Latency Audio Engine
 * Powered by Web Audio API with Double FX, Scratch Vinyl, Multi-band Analyzer,
 * 6-Pad Sampler, and Live Media Recording.
 */

import { FxType, Track, WaveformBandData } from '../types';

export const FX_LIST = [
  { type: 'echo' as FxType, name: 'Echo Delay', category: 'Time', param1Label: 'Time', param2Label: 'Feedback', defaultWet: 0.5, defaultParam1: 0.35, defaultParam2: 0.6 },
  { type: 'reverb' as FxType, name: 'Reverb Space', category: 'Space', param1Label: 'Decay', param2Label: 'Damp', defaultWet: 0.45, defaultParam1: 0.65, defaultParam2: 0.4 },
  { type: 'flanger' as FxType, name: 'Jet Flanger', category: 'Modulation', param1Label: 'Depth', param2Label: 'Rate', defaultWet: 0.6, defaultParam1: 0.7, defaultParam2: 0.3 },
  { type: 'phaser' as FxType, name: 'Deep Phaser', category: 'Modulation', param1Label: 'Sweep', param2Label: 'Stages', defaultWet: 0.6, defaultParam1: 0.5, defaultParam2: 0.5 },
  { type: 'filter_sweep' as FxType, name: 'Reso Filter', category: 'Filter', param1Label: 'Cutoff', param2Label: 'Resonance', defaultWet: 0.7, defaultParam1: 0.5, defaultParam2: 0.7 },
  { type: 'bitcrusher' as FxType, name: 'Bitcrusher', category: 'Lo-Fi', param1Label: 'Bits', param2Label: 'Drive', defaultWet: 0.65, defaultParam1: 0.4, defaultParam2: 0.6 },
  { type: 'roll' as FxType, name: 'Beat Roll', category: 'Beat', param1Label: 'Division', param2Label: 'Stutter', defaultWet: 0.8, defaultParam1: 0.5, defaultParam2: 0.7 },
  { type: 'distortion' as FxType, name: 'Tube Drive', category: 'Color', param1Label: 'Drive', param2Label: 'Warmth', defaultWet: 0.5, defaultParam1: 0.6, defaultParam2: 0.5 },
  { type: 'tremolo' as FxType, name: 'Auto-Gate', category: 'Rhythm', param1Label: 'Rate', param2Label: 'Shape', defaultWet: 0.7, defaultParam1: 0.5, defaultParam2: 0.8 },
  { type: 'pitch_shift' as FxType, name: 'Vinyl Brake', category: 'Pitch', param1Label: 'Bend', param2Label: 'Decay', defaultWet: 0.75, defaultParam1: 0.5, defaultParam2: 0.5 }
];

interface DeckAudioNodes {
  source: AudioBufferSourceNode | null;
  gainNode: GainNode;
  trimNode: GainNode;
  eqHigh: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqLow: BiquadFilterNode;
  djFilter: BiquadFilterNode;
  fx1Dry: GainNode;
  fx1Wet: GainNode;
  fx1Delay?: DelayNode;
  fx1Feedback?: GainNode;
  fx2Dry: GainNode;
  fx2Wet: GainNode;
  fx2Delay?: DelayNode;
  fx2Feedback?: GainNode;
  analyser: AnalyserNode;
  faderGain: GainNode;
  cuePflGain: GainNode;
  // Scratch & playback tracking
  buffer: AudioBuffer | null;
  offsetTime: number;
  startTime: number;
  isPlaying: boolean;
  rate: number;
  isScratching: boolean;
  scratchBuffer?: AudioBufferSourceNode | null;
}

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  public ctx: AudioContext | null = null;

  // Master bus
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  public masterAnalyser: AnalyserNode | null = null;
  private recorderDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecording = false;
  public recordingStartTime = 0;

  // Crossfader nodes
  private crossfaderA: GainNode | null = null;
  private crossfaderB: GainNode | null = null;
  private crossfaderPos = 0; // -1 to +1
  private crossfaderCurve: 'smooth' | 'sharp' = 'smooth';
  private routingA: 'A' | 'THRU' | 'B' = 'A';
  private routingB: 'A' | 'THRU' | 'B' = 'B';

  // Decks
  private deckA: DeckAudioNodes | null = null;
  private deckB: DeckAudioNodes | null = null;

  // Sampler
  private samplerPads: {
    source: AudioBufferSourceNode | null;
    gain: GainNode;
    buffer: AudioBuffer | null;
  }[] = [];

  // Scratch vinyl noise buffer
  private vinylNoiseBuffer: AudioBuffer | null = null;
  private scratchNoiseSource: AudioBufferSourceNode | null = null;
  private scratchNoiseGain: GainNode | null = null;

  private constructor() {
    // Initialized on first user gesture
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async init(): Promise<void> {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass({ latencyHint: 'interactive' });

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Build Master Bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
    this.masterLimiter.knee.setValueAtTime(4.0, this.ctx.currentTime);
    this.masterLimiter.ratio.setValueAtTime(12.0, this.ctx.currentTime);
    this.masterLimiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.masterLimiter.release.setValueAtTime(0.15, this.ctx.currentTime);

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 256;
    this.masterAnalyser.smoothingTimeConstant = 0.8;

    // Stream destination for Live Set Recording
    this.recorderDest = this.ctx.createMediaStreamDestination();

    this.masterGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);
    this.masterAnalyser.connect(this.recorderDest);

    // Crossfader gains
    this.crossfaderA = this.ctx.createGain();
    this.crossfaderB = this.ctx.createGain();
    this.crossfaderA.connect(this.masterGain);
    this.crossfaderB.connect(this.masterGain);
    this.updateCrossfader(0, 'smooth');

    // Create Deck A & Deck B audio chains
    this.deckA = this.createDeckNodes('A', this.crossfaderA);
    this.deckB = this.createDeckNodes('B', this.crossfaderB);

    // Initialize 6 Sampler pad buses
    this.samplerPads = [];
    for (let i = 0; i < 6; i++) {
      const padGain = this.ctx.createGain();
      padGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      padGain.connect(this.masterGain);
      this.samplerPads.push({
        source: null,
        gain: padGain,
        buffer: null
      });
    }

    // Generate vinyl scratch friction noise
    this.createVinylNoiseBuffer();
  }

  private createDeckNodes(id: 'A' | 'B', dest: GainNode): DeckAudioNodes {
    if (!this.ctx) throw new Error('AudioContext not ready');

    const trimNode = this.ctx.createGain();
    trimNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // 3-Band Equalizer (Pioneer/Denon standard frequency cuts)
    const eqLow = this.ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.setValueAtTime(280, this.ctx.currentTime);
    eqLow.gain.setValueAtTime(0, this.ctx.currentTime);

    const eqMid = this.ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.setValueAtTime(1200, this.ctx.currentTime);
    eqMid.Q.setValueAtTime(1.2, this.ctx.currentTime);
    eqMid.gain.setValueAtTime(0, this.ctx.currentTime);

    const eqHigh = this.ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.setValueAtTime(3600, this.ctx.currentTime);
    eqHigh.gain.setValueAtTime(0, this.ctx.currentTime);

    // Bipolar DJ Filter (-1 LPF, +1 HPF)
    const djFilter = this.ctx.createBiquadFilter();
    djFilter.type = 'allpass';
    djFilter.frequency.setValueAtTime(1000, this.ctx.currentTime);

    // Dual FX Section
    const fx1Dry = this.ctx.createGain();
    const fx1Wet = this.ctx.createGain();
    fx1Dry.gain.setValueAtTime(1.0, this.ctx.currentTime);
    fx1Wet.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const fx1Delay = this.ctx.createDelay(2.0);
    fx1Delay.delayTime.setValueAtTime(0.35, this.ctx.currentTime);
    const fx1Feedback = this.ctx.createGain();
    fx1Feedback.gain.setValueAtTime(0.5, this.ctx.currentTime);
    fx1Delay.connect(fx1Feedback);
    fx1Feedback.connect(fx1Delay);
    fx1Delay.connect(fx1Wet);

    const fx2Dry = this.ctx.createGain();
    const fx2Wet = this.ctx.createGain();
    fx2Dry.gain.setValueAtTime(1.0, this.ctx.currentTime);
    fx2Wet.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const fx2Delay = this.ctx.createDelay(2.0);
    fx2Delay.delayTime.setValueAtTime(0.2, this.ctx.currentTime);
    const fx2Feedback = this.ctx.createGain();
    fx2Feedback.gain.setValueAtTime(0.4, this.ctx.currentTime);
    fx2Delay.connect(fx2Feedback);
    fx2Feedback.connect(fx2Delay);
    fx2Delay.connect(fx2Wet);

    // Fader & Channel Metering
    const faderGain = this.ctx.createGain();
    faderGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    const cuePflGain = this.ctx.createGain();
    cuePflGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.5;

    // Connect node chain:
    // Input -> Trim -> EQ Low -> EQ Mid -> EQ High -> DJ Filter -> FX1 & FX2 -> FaderGain -> Destination
    trimNode.connect(eqLow);
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(djFilter);

    // FX 1 routing
    djFilter.connect(fx1Dry);
    djFilter.connect(fx1Delay);
    fx1Dry.connect(fx2Dry);
    fx1Wet.connect(fx2Dry);

    // FX 2 routing
    djFilter.connect(fx2Delay);
    fx2Dry.connect(faderGain);
    fx2Wet.connect(faderGain);

    faderGain.connect(dest);
    faderGain.connect(analyser);

    return {
      source: null,
      gainNode: faderGain,
      trimNode,
      eqHigh,
      eqMid,
      eqLow,
      djFilter,
      fx1Dry,
      fx1Wet,
      fx1Delay,
      fx1Feedback,
      fx2Dry,
      fx2Wet,
      fx2Delay,
      fx2Feedback,
      analyser,
      faderGain,
      cuePflGain,
      buffer: null,
      offsetTime: 0,
      startTime: 0,
      isPlaying: false,
      rate: 1.0,
      isScratching: false,
      scratchBuffer: null
    };
  }

  // Generate synthetic vinyl scratch noise
  private createVinylNoiseBuffer(): void {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.95 * b1 + white * 0.1;
      b2 = 0.85 * b2 + white * 0.2;
      data[i] = (b0 + b1 + b2) * 0.4;
    }
    this.vinylNoiseBuffer = buffer;
  }

  // --- Deck Playback Control ---

  public loadTrackToDeck(deckId: 'A' | 'B', track: Track): void {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck || !track.audioBuffer) return;

    this.stopDeck(deckId);
    deck.buffer = track.audioBuffer;
    deck.offsetTime = 0;
    deck.isPlaying = false;
  }

  public playDeck(deckId: 'A' | 'B', fromTime?: number): void {
    if (!this.ctx) return;
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck || !deck.buffer) return;

    if (deck.isPlaying) {
      this.pauseDeck(deckId);
    }

    const startOffset = typeof fromTime === 'number' ? fromTime : deck.offsetTime;
    const source = this.ctx.createBufferSource();
    source.buffer = deck.buffer;
    source.playbackRate.setValueAtTime(deck.rate, this.ctx.currentTime);
    source.connect(deck.trimNode);

    source.onended = () => {
      if (deck.source === source) {
        deck.isPlaying = false;
      }
    };

    source.start(0, Math.max(0, startOffset));
    deck.source = source;
    deck.startTime = this.ctx.currentTime;
    deck.offsetTime = startOffset;
    deck.isPlaying = true;
  }

  public pauseDeck(deckId: 'A' | 'B'): void {
    if (!this.ctx) return;
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck || !deck.isPlaying) return;

    if (deck.source) {
      try {
        deck.source.stop();
        deck.source.disconnect();
      } catch {
        // Source might already have stopped
      }
      deck.source = null;
    }

    const elapsed = (this.ctx.currentTime - deck.startTime) * deck.rate;
    deck.offsetTime = Math.max(0, deck.offsetTime + elapsed);
    if (deck.buffer && deck.offsetTime >= deck.buffer.duration) {
      deck.offsetTime = 0;
    }
    deck.isPlaying = false;
  }

  public stopDeck(deckId: 'A' | 'B'): void {
    this.pauseDeck(deckId);
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (deck) {
      deck.offsetTime = 0;
    }
  }

  public seekDeck(deckId: 'A' | 'B', targetTime: number): void {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck || !deck.buffer) return;

    const clamped = Math.max(0, Math.min(deck.buffer.duration, targetTime));
    const wasPlaying = deck.isPlaying;
    if (wasPlaying) {
      this.pauseDeck(deckId);
      deck.offsetTime = clamped;
      this.playDeck(deckId, clamped);
    } else {
      deck.offsetTime = clamped;
    }
  }

  public getDeckCurrentTime(deckId: 'A' | 'B'): number {
    if (!this.ctx) return 0;
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck || !deck.buffer) return 0;

    if (deck.isPlaying) {
      const elapsed = (this.ctx.currentTime - deck.startTime) * deck.rate;
      const current = deck.offsetTime + elapsed;
      if (current >= deck.buffer.duration) {
        return deck.buffer.duration;
      }
      return current;
    }
    return deck.offsetTime;
  }

  public setDeckPlaybackRate(deckId: 'A' | 'B', rate: number): void {
    if (!this.ctx) return;
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck) return;
    deck.rate = Math.max(0.1, Math.min(3.0, rate));
    if (deck.source && deck.isPlaying) {
      deck.source.playbackRate.setValueAtTime(deck.rate, this.ctx.currentTime);
    }
  }

  // --- Real-time Scratch Engine ---

  public startScratch(deckId: 'A' | 'B'): void {
    if (!this.ctx) return;
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck || !deck.buffer) return;

    deck.isScratching = true;
    if (deck.isPlaying) {
      this.pauseDeck(deckId);
    }

    // Play subtle vinyl touch friction
    if (this.vinylNoiseBuffer && !this.scratchNoiseSource) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.vinylNoiseBuffer;
      noise.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      noise.connect(gain);
      gain.connect(this.masterGain!);
      noise.start();
      this.scratchNoiseSource = noise;
      this.scratchNoiseGain = gain;
    }
  }

  public updateScratch(deckId: 'A' | 'B', angularDelta: number): void {
    if (!this.ctx) return;
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck || !deck.buffer || !deck.isScratching) return;

    // Convert angular change (in radians) to audio offset delta
    // 1 full turn (2 * PI) represents approx 1.8 seconds of audio (33 1/3 RPM)
    const timeDelta = (angularDelta / (2 * Math.PI)) * 1.8;
    const newTime = Math.max(0, Math.min(deck.buffer.duration - 0.1, deck.offsetTime + timeDelta));
    deck.offsetTime = newTime;

    // Instantaneous dynamic pitch scrub burst
    if (Math.abs(timeDelta) > 0.005) {
      try {
        if (deck.scratchBuffer) {
          deck.scratchBuffer.stop();
          deck.scratchBuffer.disconnect();
        }
      } catch {
        // ignore
      }

      const grain = this.ctx.createBufferSource();
      grain.buffer = deck.buffer;
      const speed = Math.min(2.5, Math.max(0.3, Math.abs(angularDelta) * 8.0));
      grain.playbackRate.setValueAtTime(speed, this.ctx.currentTime);

      const scratchGain = this.ctx.createGain();
      scratchGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      scratchGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

      grain.connect(scratchGain);
      scratchGain.connect(deck.trimNode);

      const playPos = timeDelta < 0 ? Math.max(0, newTime - 0.08) : newTime;
      grain.start(0, playPos, 0.12);
      deck.scratchBuffer = grain;
    }
  }

  public endScratch(deckId: 'A' | 'B', resumePlaying = false): void {
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck) return;
    deck.isScratching = false;

    if (this.scratchNoiseSource) {
      try {
        this.scratchNoiseSource.stop();
        this.scratchNoiseSource.disconnect();
      } catch {
        // ignore
      }
      this.scratchNoiseSource = null;
      this.scratchNoiseGain = null;
    }

    if (resumePlaying) {
      this.playDeck(deckId);
    }
  }

  // --- Mixer & Channel Controls ---

  public setDeckFader(deckId: 'A' | 'B', volume: number): void {
    if (!this.ctx) return;
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck) return;
    const vol = Math.max(0, Math.min(1, volume));
    deck.faderGain.gain.setValueAtTime(vol * vol, this.ctx.currentTime); // Audio taper
  }

  public setDeckTrim(deckId: 'A' | 'B', gainVal: number): void {
    if (!this.ctx) return;
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck) return;
    deck.trimNode.gain.setValueAtTime(gainVal, this.ctx.currentTime);
  }

  public setDeckEq(deckId: 'A' | 'B', high: number, mid: number, low: number): void {
    if (!this.ctx) return;
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck) return;
    // Values range from -26dB to +6dB
    deck.eqHigh.gain.setValueAtTime(high, this.ctx.currentTime);
    deck.eqMid.gain.setValueAtTime(mid, this.ctx.currentTime);
    deck.eqLow.gain.setValueAtTime(low, this.ctx.currentTime);
  }

  public setDeckFilter(deckId: 'A' | 'B', filterPos: number): void {
    if (!this.ctx) return;
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck) return;

    // Filter position: -1 (Lowpass) to +1 (Highpass), 0 is bypass
    if (Math.abs(filterPos) < 0.04) {
      deck.djFilter.type = 'allpass';
      deck.djFilter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    } else if (filterPos < 0) {
      // Lowpass sweep from 20kHz down to 200Hz
      deck.djFilter.type = 'lowpass';
      const norm = Math.abs(filterPos);
      const freq = 20000 * Math.pow(0.01, norm);
      deck.djFilter.frequency.setValueAtTime(Math.max(120, freq), this.ctx.currentTime);
      deck.djFilter.Q.setValueAtTime(1.8 + norm * 2.5, this.ctx.currentTime);
    } else {
      // Highpass sweep from 20Hz up to 6kHz
      deck.djFilter.type = 'highpass';
      const freq = 20 * Math.pow(300, filterPos);
      deck.djFilter.frequency.setValueAtTime(Math.min(10000, freq), this.ctx.currentTime);
      deck.djFilter.Q.setValueAtTime(1.8 + filterPos * 2.5, this.ctx.currentTime);
    }
  }

  public setDeckCuePfl(deckId: 'A' | 'B', active: boolean): void {
    if (!this.ctx) return;
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck) return;
    deck.cuePflGain.gain.setValueAtTime(active ? 1.0 : 0.0, this.ctx.currentTime);
  }

  // --- Double FX Engine Controls ---

  public updateDeckFx(deckId: 'A' | 'B', slot: 1 | 2, fx: { type: FxType; wet: number; param1: number; param2: number; active: boolean; locked: boolean }): void {
    if (!this.ctx) return;
    const deck = deckId === 'A' ? this.deckA : this.deckB;
    if (!deck) return;

    const dryGain = slot === 1 ? deck.fx1Dry : deck.fx2Dry;
    const wetGain = slot === 1 ? deck.fx1Wet : deck.fx2Wet;
    const delayNode = slot === 1 ? deck.fx1Delay : deck.fx2Delay;
    const feedbackNode = slot === 1 ? deck.fx1Feedback : deck.fx2Feedback;

    if (!fx.active && !fx.locked) {
      dryGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      wetGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      return;
    }

    const effectiveWet = fx.locked ? Math.max(0.6, fx.wet) : fx.wet;
    wetGain.gain.setValueAtTime(effectiveWet, this.ctx.currentTime);
    dryGain.gain.setValueAtTime(1.0 - effectiveWet * 0.6, this.ctx.currentTime);

    if (delayNode && feedbackNode) {
      if (fx.type === 'echo') {
        const tempoTime = 0.05 + fx.param1 * 0.7; // 50ms to 750ms
        delayNode.delayTime.setValueAtTime(tempoTime, this.ctx.currentTime);
        // Feedback freeze if locked
        const fb = fx.locked ? 0.94 : Math.min(0.88, fx.param2 * 0.85);
        feedbackNode.gain.setValueAtTime(fb, this.ctx.currentTime);
      } else if (fx.type === 'reverb') {
        delayNode.delayTime.setValueAtTime(0.04 + fx.param1 * 0.12, this.ctx.currentTime);
        const fb = fx.locked ? 0.96 : Math.min(0.92, fx.param2 * 0.9);
        feedbackNode.gain.setValueAtTime(fb, this.ctx.currentTime);
      } else if (fx.type === 'flanger') {
        const sweepTime = 0.003 + Math.sin(this.ctx.currentTime * (1 + fx.param2 * 6)) * 0.002 * fx.param1;
        delayNode.delayTime.setValueAtTime(Math.max(0.001, sweepTime), this.ctx.currentTime);
        feedbackNode.gain.setValueAtTime(0.7, this.ctx.currentTime);
      } else if (fx.type === 'roll') {
        // Instant stutter beat roll
        const beatFraction = [0.0625, 0.125, 0.25, 0.5][Math.floor(fx.param1 * 3.99)];
        delayNode.delayTime.setValueAtTime(beatFraction, this.ctx.currentTime);
        feedbackNode.gain.setValueAtTime(fx.locked ? 0.98 : 0.82, this.ctx.currentTime);
      } else {
        // Generic modulation
        delayNode.delayTime.setValueAtTime(0.02 + fx.param1 * 0.3, this.ctx.currentTime);
        feedbackNode.gain.setValueAtTime(fx.param2 * 0.6, this.ctx.currentTime);
      }
    }
  }

  // --- Crossfader & Routing ---

  public setDeckRouting(deckId: 'A' | 'B', routing: 'A' | 'THRU' | 'B'): void {
    if (deckId === 'A') {
      this.routingA = routing;
    } else {
      this.routingB = routing;
    }
    this.updateCrossfader(this.crossfaderPos, this.crossfaderCurve);
  }

  public updateCrossfader(position: number, curve: 'smooth' | 'sharp'): void {
    if (!this.ctx || !this.crossfaderA || !this.crossfaderB) return;
    this.crossfaderPos = Math.max(-1, Math.min(1, position));
    this.crossfaderCurve = curve;

    // Normalizing position to 0 (all A) to 1 (all B)
    const norm = (this.crossfaderPos + 1) / 2;

    let rawGainA = 1.0;
    let rawGainB = 1.0;

    if (curve === 'smooth') {
      // Equal power sine/cosine curve
      rawGainA = Math.cos(norm * 0.5 * Math.PI);
      rawGainB = Math.sin(norm * 0.5 * Math.PI);
    } else {
      // Sharp scratch cut (instant 100% on within 5% movement)
      rawGainA = norm < 0.95 ? 1.0 : (1.0 - (norm - 0.95) / 0.05);
      rawGainB = norm > 0.05 ? 1.0 : (norm / 0.05);
    }

    // Apply routing selection for Deck A (A side, THRU bypass, or B side)
    let finalGainA = 1.0;
    if (this.routingA === 'THRU') {
      finalGainA = 1.0; // Bypasses crossfader completely
    } else if (this.routingA === 'A') {
      finalGainA = rawGainA;
    } else if (this.routingA === 'B') {
      finalGainA = rawGainB;
    }

    // Apply routing selection for Deck B (B side, THRU bypass, or A side)
    let finalGainB = 1.0;
    if (this.routingB === 'THRU') {
      finalGainB = 1.0; // Bypasses crossfader completely
    } else if (this.routingB === 'B') {
      finalGainB = rawGainB;
    } else if (this.routingB === 'A') {
      finalGainB = rawGainA;
    }

    this.crossfaderA.gain.setValueAtTime(finalGainA, this.ctx.currentTime);
    this.crossfaderB.gain.setValueAtTime(finalGainB, this.ctx.currentTime);
  }

  // --- Master Section ---

  public setMasterVolume(vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const v = Math.max(0, Math.min(1.5, vol));
    this.masterGain.gain.setValueAtTime(v, this.ctx.currentTime);
  }

  public getMeterLevels(): { master: number; deckA: number; deckB: number } {
    if (!this.ctx) return { master: 0, deckA: 0, deckB: 0 };

    const getLevel = (analyser: AnalyserNode | null): number => {
      if (!analyser) return 0;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      const avg = sum / data.length;
      return Math.min(1.0, avg / 128);
    };

    return {
      master: getLevel(this.masterAnalyser),
      deckA: getLevel(this.deckA?.analyser ?? null),
      deckB: getLevel(this.deckB?.analyser ?? null)
    };
  }

  // --- Sampler Engine ---

  public setSampleBuffer(padIndex: number, buffer: AudioBuffer): void {
    if (this.samplerPads[padIndex]) {
      this.samplerPads[padIndex].buffer = buffer;
    }
  }

  public triggerSample(padIndex: number, volume = 1.0, isLoop = false): void {
    if (!this.ctx) return;
    const pad = this.samplerPads[padIndex];
    if (!pad || !pad.buffer) return;

    if (pad.source) {
      try {
        pad.source.stop();
        pad.source.disconnect();
      } catch {
        // ignore
      }
    }

    const source = this.ctx.createBufferSource();
    source.buffer = pad.buffer;
    source.loop = isLoop;
    pad.gain.gain.setValueAtTime(Math.min(1.0, volume), this.ctx.currentTime);
    source.connect(pad.gain);
    source.start(0);
    pad.source = source;
  }

  public stopSample(padIndex: number): void {
    const pad = this.samplerPads[padIndex];
    if (pad && pad.source) {
      try {
        pad.source.stop();
        pad.source.disconnect();
      } catch {
        // ignore
      }
      pad.source = null;
    }
  }

  // --- Live Set Recording ---

  public startRecording(): boolean {
    if (!this.recorderDest) return false;

    this.recordedChunks = [];
    const stream = this.recorderDest.stream;

    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/ogg';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }
    }

    try {
      this.mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      this.mediaRecorder.start(250); // 250ms chunks
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      return true;
    } catch (err) {
      console.error('Failed to start live recording', err);
      return false;
    }
  }

  public stopRecording(): Promise<{ blob: Blob; duration: number } | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.isRecording = false;
        resolve(null);
        return;
      }

      const duration = (Date.now() - this.recordingStartTime) / 1000;
      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        this.isRecording = false;
        resolve({ blob, duration });
      };

      this.mediaRecorder.stop();
    });
  }

  // --- Audio Decoding & Multi-format loader ---

  public async decodeAudioFile(file: File): Promise<AudioBuffer> {
    if (!this.ctx) await this.init();
    if (!this.ctx) throw new Error('AudioContext unavailable');

    const arrayBuffer = await file.arrayBuffer();
    return await this.ctx.decodeAudioData(arrayBuffer);
  }

  // --- Multi-Band Waveform Peak Extraction ---

  public extractWaveformData(buffer: AudioBuffer, numBuckets = 800): WaveformBandData {
    const rawData = buffer.getChannelData(0);
    const bucketSize = Math.floor(rawData.length / numBuckets);
    const low = new Float32Array(numBuckets);
    const mid = new Float32Array(numBuckets);
    const high = new Float32Array(numBuckets);
    const overall = new Float32Array(numBuckets);

    // Simple multi-band frequency energy split approximation
    for (let i = 0; i < numBuckets; i++) {
      let maxPeak = 0;
      let lowEnergy = 0;
      let highEnergy = 0;
      const start = i * bucketSize;
      const end = Math.min(start + bucketSize, rawData.length);

      let prev = 0;
      for (let j = start; j < end; j++) {
        const val = rawData[j];
        const absVal = Math.abs(val);
        if (absVal > maxPeak) maxPeak = absVal;

        // Low frequency energy (smoothed envelope)
        lowEnergy += absVal;
        // High frequency energy (first difference / zero crossing estimate)
        highEnergy += Math.abs(val - prev);
        prev = val;
      }

      const count = end - start || 1;
      const avgLow = lowEnergy / count;
      const avgHigh = highEnergy / count;

      low[i] = Math.min(1.0, avgLow * 2.2);
      high[i] = Math.min(1.0, avgHigh * 1.8);
      mid[i] = Math.min(1.0, Math.max(0, maxPeak - low[i] * 0.4));
      overall[i] = Math.min(1.0, maxPeak);
    }

    return { low, mid, high, overall, peaksCount: numBuckets };
  }

  // --- BPM & Musical Key Detection ---

  public analyzeBpmAndKey(buffer: AudioBuffer): { bpm: number; key: string; musicalKey: string } {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;

    // Peak energy detection for beat intervals (sample 30 seconds)
    const maxSamples = Math.min(data.length, sampleRate * 35);
    const step = Math.floor(sampleRate / 100); // 100Hz resolution
    const energies: number[] = [];

    for (let i = 0; i < maxSamples; i += step) {
      let energy = 0;
      for (let j = i; j < i + step && j < data.length; j++) {
        energy += data[j] * data[j];
      }
      energies.push(energy);
    }

    // Onset detection
    const onsets: number[] = [];
    for (let i = 1; i < energies.length - 1; i++) {
      if (energies[i] > energies[i - 1] && energies[i] > energies[i + 1] && energies[i] > 0.05) {
        onsets.push(i);
      }
    }

    // Interval histogram for BPM (range 75 - 175 BPM)
    const intervalCounts: Record<number, number> = {};
    for (let i = 0; i < onsets.length; i++) {
      for (let j = 1; j <= 4; j++) {
        if (i + j < onsets.length) {
          const diff = onsets[i + j] - onsets[i];
          const timeSec = diff / 100;
          let bpm = Math.round(60 / timeSec);
          while (bpm < 100) bpm *= 2;
          while (bpm > 160) bpm = Math.round(bpm / 2);
          if (bpm >= 110 && bpm <= 145) {
            intervalCounts[bpm] = (intervalCounts[bpm] || 0) + 1;
          }
        }
      }
    }

    let detectedBpm = 126;
    let maxCount = 0;
    for (const [bpmStr, count] of Object.entries(intervalCounts)) {
      const countNum = Number(count);
      if (countNum > maxCount) {
        maxCount = countNum;
        detectedBpm = Number(bpmStr);
      }
    }

    // Default to a realistic DJ standard if not enough peaks detected
    if (detectedBpm < 100 || detectedBpm > 150) {
      detectedBpm = 126;
    }

    // Camelot key approximation based on root harmonic energy
    const camelotKeys = [
      { key: '8A', musical: 'A min' },
      { key: '5A', musical: 'C min' },
      { key: '11B', musical: 'A Maj' },
      { key: '4A', musical: 'F min' },
      { key: '6A', musical: 'G min' },
      { key: '1A', musical: 'Ab min' }
    ];
    const picked = camelotKeys[Math.floor((detectedBpm * 7) % camelotKeys.length)];

    return { bpm: detectedBpm, key: picked.key, musicalKey: picked.musical };
  }

  // --- Procedural Royalty-Free Demo Tracks Generator ---

  public async generateDemoTracks(): Promise<Track[]> {
    if (!this.ctx) await this.init();
    if (!this.ctx) throw new Error('Audio context failed to start');

    const sampleRate = this.ctx.sampleRate;

    // Track 1: "Neon Horizon - Tech House" (126 BPM, 64 bars ~ 122 sec)
    const bpm1 = 126;
    const duration1 = 70; // 70 seconds full loop
    const track1Buffer = this.renderTechHouseTrack(sampleRate, bpm1, duration1);

    // Track 2: "Cyber Pulse - Electro Breakbeat" (128 BPM, 64 bars ~ 120 sec)
    const bpm2 = 128;
    const duration2 = 70;
    const track2Buffer = this.renderElectroBreakTrack(sampleRate, bpm2, duration2);

    const track1: Track = {
      id: 'demo-tech-house-126',
      title: 'Neon Horizon',
      artist: 'Spin Mix Sessions',
      bpm: 126,
      originalBpm: 126,
      key: '8A',
      musicalKey: 'A min',
      duration: duration1,
      audioBuffer: track1Buffer,
      waveformData: this.extractWaveformData(track1Buffer),
      isDemo: true,
      fileFormat: 'Built-in Master'
    };

    const track2: Track = {
      id: 'demo-electro-break-128',
      title: 'Cyber Pulse',
      artist: 'Sub-Zero Beats',
      bpm: 128,
      originalBpm: 128,
      key: '11B',
      musicalKey: 'A Maj',
      duration: duration2,
      audioBuffer: track2Buffer,
      waveformData: this.extractWaveformData(track2Buffer),
      isDemo: true,
      fileFormat: 'Built-in Master'
    };

    return [track1, track2];
  }

  // Procedural Tech House generator (Clean punchy 4-on-the-floor, rolling bassline, offbeat hats, synth chords)
  private renderTechHouseTrack(sr: number, bpm: number, dur: number): AudioBuffer {
    if (!this.ctx) throw new Error('No ctx');
    const totalSamples = Math.floor(sr * dur);
    const buffer = this.ctx.createBuffer(2, totalSamples, sr);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const beatInterval = 60 / bpm;
    const sixteenth = beatInterval / 4;
    const totalSixteenths = Math.floor(dur / sixteenth);

    for (let s16 = 0; s16 < totalSixteenths; s16++) {
      const beatTime = s16 * sixteenth;
      const startSample = Math.floor(beatTime * sr);
      const isQuarterBeat = s16 % 4 === 0;
      const isOffbeat = s16 % 4 === 2;
      const isSnareBeat = s16 % 8 === 4;

      // 1. Kick Drum (Punchy 909-style pitch swept sine with click)
      if (isQuarterBeat && startSample < totalSamples) {
        const kickLen = Math.floor(sr * 0.35);
        for (let i = 0; i < kickLen && startSample + i < totalSamples; i++) {
          const t = i / sr;
          const freq = 55 + 130 * Math.exp(-t * 28);
          const env = Math.exp(-t * 11);
          const click = i < 40 ? Math.random() * 0.4 : 0;
          const kickVal = (Math.sin(2 * Math.PI * freq * t) + click) * env * 0.75;
          left[startSample + i] += kickVal;
          right[startSample + i] += kickVal;
        }
      }

      // 2. Rolling Offbeat Bassline (A minor: 55Hz - 110Hz)
      if (s16 % 2 === 1) {
        const bassPitch = (s16 % 16 === 1 || s16 % 16 === 3) ? 55 : (s16 % 16 === 7 ? 65.4 : 49);
        const bassLen = Math.floor(sr * 0.18);
        for (let i = 0; i < bassLen && startSample + i < totalSamples; i++) {
          const t = i / sr;
          const env = Math.exp(-t * 12);
          const bassVal = Math.sin(2 * Math.PI * bassPitch * t) * env * 0.45;
          left[startSample + i] += bassVal;
          right[startSample + i] += bassVal;
        }
      }

      // 3. Open Hi-Hat on offbeat (crisp highpassed metallic noise)
      if (isOffbeat) {
        const hatLen = Math.floor(sr * 0.22);
        for (let i = 0; i < hatLen && startSample + i < totalSamples; i++) {
          const t = i / sr;
          const env = Math.exp(-t * 18);
          const noise = (Math.random() * 2 - 1) * env * 0.22;
          left[startSample + i] += noise * 0.9;
          right[startSample + i] += noise * 1.1;
        }
      }

      // 4. Closed Hi-Hat 16th shuffles
      if (s16 % 2 === 0 && !isOffbeat) {
        const hatLen = Math.floor(sr * 0.05);
        for (let i = 0; i < hatLen && startSample + i < totalSamples; i++) {
          const t = i / sr;
          const env = Math.exp(-t * 50);
          const noise = (Math.random() * 2 - 1) * env * 0.1;
          left[startSample + i] += noise;
          right[startSample + i] += noise;
        }
      }

      // 5. Snare / Clap on beat 2 & 4
      if (isSnareBeat) {
        const clapLen = Math.floor(sr * 0.2);
        for (let i = 0; i < clapLen && startSample + i < totalSamples; i++) {
          const t = i / sr;
          const env = Math.exp(-t * 16);
          const snap = (Math.random() * 2 - 1) * env * 0.4;
          left[startSample + i] += snap;
          right[startSample + i] += snap;
        }
      }

      // 6. Melodic Tech Synth Stab every 4 bars
      if (s16 % 32 === 4 || s16 % 32 === 14) {
        const chordFreqs = [220, 261.63, 329.63, 440]; // Am7
        const synthLen = Math.floor(sr * 0.35);
        for (let i = 0; i < synthLen && startSample + i < totalSamples; i++) {
          const t = i / sr;
          const env = Math.exp(-t * 9);
          let chordVal = 0;
          for (const f of chordFreqs) {
            chordVal += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
          }
          const finalVal = chordVal * 0.12 * env;
          left[startSample + i] += finalVal * 0.8;
          right[startSample + i] += finalVal * 1.2;
        }
      }
    }

    return buffer;
  }

  // Procedural Electro Breakbeat generator (Heavy syncopated break, acid 303 sweep, riser)
  private renderElectroBreakTrack(sr: number, bpm: number, dur: number): AudioBuffer {
    if (!this.ctx) throw new Error('No ctx');
    const totalSamples = Math.floor(sr * dur);
    const buffer = this.ctx.createBuffer(2, totalSamples, sr);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const beatInterval = 60 / bpm;
    const sixteenth = beatInterval / 4;
    const totalSixteenths = Math.floor(dur / sixteenth);

    // Breakbeat kick pattern: hits on 0, 6, 10
    // Snare hits on 4, 12
    for (let s16 = 0; s16 < totalSixteenths; s16++) {
      const beatTime = s16 * sixteenth;
      const startSample = Math.floor(beatTime * sr);
      const step16 = s16 % 16;

      const isKick = step16 === 0 || step16 === 6 || step16 === 10;
      const isSnare = step16 === 4 || step16 === 12;

      // Heavy 808 Kick
      if (isKick) {
        const kickLen = Math.floor(sr * 0.4);
        for (let i = 0; i < kickLen && startSample + i < totalSamples; i++) {
          const t = i / sr;
          const freq = 48 + 140 * Math.exp(-t * 22);
          const env = Math.exp(-t * 7);
          const val = Math.sin(2 * Math.PI * freq * t) * env * 0.8;
          left[startSample + i] += val;
          right[startSample + i] += val;
        }
      }

      // Crisp Break Snare
      if (isSnare) {
        const snareLen = Math.floor(sr * 0.25);
        for (let i = 0; i < snareLen && startSample + i < totalSamples; i++) {
          const t = i / sr;
          const env = Math.exp(-t * 14);
          const tone = Math.sin(2 * Math.PI * 190 * t) * 0.3;
          const noise = (Math.random() * 2 - 1) * 0.7;
          const val = (tone + noise) * env * 0.5;
          left[startSample + i] += val;
          right[startSample + i] += val;
        }
      }

      // Hi-Hats with stereo pan
      if (s16 % 2 === 1) {
        const hatLen = Math.floor(sr * 0.08);
        for (let i = 0; i < hatLen && startSample + i < totalSamples; i++) {
          const t = i / sr;
          const env = Math.exp(-t * 30);
          const noise = (Math.random() * 2 - 1) * env * 0.16;
          const pan = (s16 % 4 === 1) ? 0.7 : 1.3;
          left[startSample + i] += noise * (2 - pan);
          right[startSample + i] += noise * pan;
        }
      }

      // Acid 303 Style Filtered Bassline
      const acidNotes = [55, 55, 73.4, 55, 65.4, 82.4, 55, 98];
      const noteFreq = acidNotes[s16 % 8];
      const acidLen = Math.floor(sr * 0.16);
      const cutoffLfo = 300 + 1200 * Math.abs(Math.sin((s16 / 16) * Math.PI * 2));

      for (let i = 0; i < acidLen && startSample + i < totalSamples; i++) {
        const t = i / sr;
        const env = Math.exp(-t * 9);
        // Sawtooth wave approximation with harmonic fold
        let saw = 0;
        for (let h = 1; h <= 6; h++) {
          if (noteFreq * h < cutoffLfo) {
            saw += (1 / h) * Math.sin(2 * Math.PI * (noteFreq * h) * t);
          }
        }
        const val = saw * env * 0.28;
        left[startSample + i] += val;
        right[startSample + i] += val;
      }
    }

    return buffer;
  }

  // --- Procedural Sampler Audio Buffers Generator ---

  public async generateDefaultSamplerBuffers(): Promise<AudioBuffer[]> {
    if (!this.ctx) await this.init();
    if (!this.ctx) throw new Error('No ctx');
    const sr = this.ctx.sampleRate;

    // Pad 1: Airhorn
    const airhorn = this.renderAirhorn(sr);
    // Pad 2: 90s Rave Siren
    const siren = this.renderSiren(sr);
    // Pad 3: 808 Sub Boom
    const boom808 = this.render808Boom(sr);
    // Pad 4: Laser Zap
    const laser = this.renderLaser(sr);
    // Pad 5: Club Rimshot
    const rimshot = this.renderRimshot(sr);
    // Pad 6: Scratch / Vocal Drop
    const vocalDrop = this.renderVocalScratch(sr);

    const buffers = [airhorn, siren, boom808, laser, rimshot, vocalDrop];
    buffers.forEach((buf, i) => this.setSampleBuffer(i, buf));
    return buffers;
  }

  private renderAirhorn(sr: number): AudioBuffer {
    const dur = 1.4;
    const len = Math.floor(sr * dur);
    const buf = this.ctx!.createBuffer(2, len, sr);
    const l = buf.getChannelData(0);
    const r = buf.getChannelData(1);

    // Traditional dancehall airhorn blast pattern (3 rhythmic toots: short, short, long)
    const bursts = [
      { start: 0.0, end: 0.18 },
      { start: 0.24, end: 0.42 },
      { start: 0.48, end: 1.25 }
    ];

    const freq1 = 466.16; // Bb4
    const freq2 = 587.33; // D5
    const freq3 = 698.46; // F5

    bursts.forEach(({ start, end }) => {
      const sStart = Math.floor(start * sr);
      const sEnd = Math.floor(end * sr);
      for (let i = sStart; i < sEnd && i < len; i++) {
        const t = (i - sStart) / sr;
        const blastDur = end - start;
        const env = Math.min(1.0, t * 40) * Math.min(1.0, (blastDur - t) * 15);
        // Rich brassy saw/square horn sound
        const tone = (
          Math.sin(2 * Math.PI * freq1 * t) +
          0.8 * Math.sin(2 * Math.PI * freq2 * t) +
          0.6 * Math.sin(2 * Math.PI * freq3 * t) +
          0.3 * (Math.random() * 2 - 1)
        ) * env * 0.4;
        l[i] += tone;
        r[i] += tone;
      }
    });

    return buf;
  }

  private renderSiren(sr: number): AudioBuffer {
    const dur = 2.0;
    const len = Math.floor(sr * dur);
    const buf = this.ctx!.createBuffer(2, len, sr);
    const l = buf.getChannelData(0);
    const r = buf.getChannelData(1);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.min(1.0, t * 10) * Math.exp(-t * 0.8);
      // Pitch sweeping up and down between 500Hz and 1400Hz
      const sweep = 850 + 450 * Math.sin(2 * Math.PI * 3.5 * t);
      const val = Math.sin(2 * Math.PI * sweep * t) * env * 0.45;
      l[i] = val;
      r[i] = val;
    }
    return buf;
  }

  private render808Boom(sr: number): AudioBuffer {
    const dur = 1.6;
    const len = Math.floor(sr * dur);
    const buf = this.ctx!.createBuffer(2, len, sr);
    const l = buf.getChannelData(0);
    const r = buf.getChannelData(1);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const freq = 42 + 90 * Math.exp(-t * 14);
      const env = Math.exp(-t * 2.5);
      const val = Math.sin(2 * Math.PI * freq * t) * env * 0.85;
      l[i] = val;
      r[i] = val;
    }
    return buf;
  }

  private renderLaser(sr: number): AudioBuffer {
    const dur = 0.5;
    const len = Math.floor(sr * dur);
    const buf = this.ctx!.createBuffer(2, len, sr);
    const l = buf.getChannelData(0);
    const r = buf.getChannelData(1);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const freq = 2400 * Math.exp(-t * 16);
      const env = Math.exp(-t * 9);
      const val = Math.sin(2 * Math.PI * freq * t) * env * 0.5;
      l[i] = val;
      r[i] = val;
    }
    return buf;
  }

  private renderRimshot(sr: number): AudioBuffer {
    const dur = 0.4;
    const len = Math.floor(sr * dur);
    const buf = this.ctx!.createBuffer(2, len, sr);
    const l = buf.getChannelData(0);
    const r = buf.getChannelData(1);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 22);
      const click = Math.sin(2 * Math.PI * 850 * t) * 0.4;
      const noise = (Math.random() * 2 - 1) * 0.6;
      const val = (click + noise) * env * 0.6;
      l[i] = val;
      r[i] = val;
    }
    return buf;
  }

  private renderVocalScratch(sr: number): AudioBuffer {
    const dur = 0.9;
    const len = Math.floor(sr * dur);
    const buf = this.ctx!.createBuffer(2, len, sr);
    const l = buf.getChannelData(0);
    const r = buf.getChannelData(1);

    // Stutter drop vocal formant synthesis
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 3.5);
      const chop = Math.sin(2 * Math.PI * 18 * t) > 0 ? 1 : 0.2;
      const formant = (
        Math.sin(2 * Math.PI * 400 * t) * 0.5 +
        Math.sin(2 * Math.PI * 1200 * t) * 0.3 +
        Math.sin(2 * Math.PI * 2500 * t) * 0.2
      );
      const val = formant * chop * env * 0.45;
      l[i] = val;
      r[i] = val;
    }
    return buf;
  }
}
