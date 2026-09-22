/**
 * Dual Multi-Band Scrolling Waveform Visualization Component
 * Multi-frequency RGB coloring (Red: Bass/Kick, Green: Mids, Blue: Highs),
 * Dynamic 4/4 Beat Grid Overlay (Measure downbeats, numbered sub-beats),
 * Playhead, Phase Alignment Meter, Beatmatch Visual Guides, and Overview Scrubbing.
 */

import React, { useRef, useEffect, useState } from 'react';
import { DeckState } from '../types';
import { ZoomIn, ZoomOut, Zap, Grid, SlidersHorizontal, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

interface WaveformDisplayProps {
  deckA: DeckState;
  deckB: DeckState;
  onSeekA: (time: number) => void;
  onSeekB: (time: number) => void;
}

const WaveformDisplayComponent: React.FC<WaveformDisplayProps> = ({
  deckA,
  deckB,
  onSeekA,
  onSeekB
}) => {
  const canvasRefA = useRef<HTMLCanvasElement>(null);
  const canvasRefB = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(4); // seconds displayed on screen (2s, 4s, 8s)
  
  // Dynamic Beat Grid configuration
  const [showBeatGrid, setShowBeatGrid] = useState<boolean>(true);
  const [gridIntensity, setGridIntensity] = useState<'normal' | 'vivid'>('vivid');
  const [gridOffsetA, setGridOffsetA] = useState<number>(0);
  const [gridOffsetB, setGridOffsetB] = useState<number>(0);
  const [showGridNudge, setShowGridNudge] = useState<boolean>(false);

  // Helper for drawing safe rounded rectangles in canvas
  const drawRoundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
    }
  };

  // Real-time animation loop for high-precision 60fps scrolling
  useEffect(() => {
    let animId: number;

    const renderDeckWaveform = (
      canvas: HTMLCanvasElement | null,
      deck: DeckState,
      accentColor: string,
      deckId: 'A' | 'B'
    ) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dynamic resolution scaling for razor-sharp rendering on any screen & fullscreen
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.max(300, Math.floor(rect.width * dpr));
      const targetH = Math.max(60, Math.floor(rect.height * dpr));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const width = rect.width || canvas.width / dpr;
      const height = rect.height || canvas.height / dpr;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, width, height);

      // Subtle horizontal center zero-crossing line
      ctx.strokeStyle = '#181e2b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      const track = deck.track;
      if (!track || !track.waveformData || track.duration <= 0) {
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 11px "Chakra Petch", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`DECK ${deckId} STANDBY - LOAD TRACK FROM LIBRARY`, width / 2, centerY + 4);
        ctx.restore();
        return;
      }

      const { low, mid, high, peaksCount } = track.waveformData;
      const curTime = deck.currentTime;
      const timeWindow = zoom; // Total seconds visible
      const startTime = curTime - timeWindow / 2;
      const endTime = curTime + timeWindow / 2;

      const samplesPerSec = peaksCount / track.duration;

      // =========================================================================
      // 1. DRAW MULTI-BAND WAVEFORM BARS FIRST
      // =========================================================================
      const numBars = Math.min(Math.floor(width), 600);
      const barWidth = width / numBars;

      for (let i = 0; i < numBars; i++) {
        const t = startTime + (i / numBars) * timeWindow;
        if (t < 0 || t > track.duration) continue;

        const peakIdx = Math.floor(t * samplesPerSec);
        if (peakIdx < 0 || peakIdx >= peaksCount) continue;

        const lowVal = low[peakIdx] || 0;
        const midVal = mid[peakIdx] || 0;
        const highVal = high[peakIdx] || 0;

        const totalHeight = Math.min(centerY - 2, (lowVal * 0.55 + midVal * 0.35 + highVal * 0.25) * centerY);

        const x = i * barWidth;

        // Draw frequency bands from center outwards
        // High frequencies (outer tip - cyan/blue)
        const highH = totalHeight;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x, centerY - highH, barWidth - 0.5, highH * 2);

        // Mid frequencies (greenish cyan)
        const midH = totalHeight * 0.7;
        ctx.fillStyle = '#2dd4bf';
        ctx.fillRect(x, centerY - midH, barWidth - 0.5, midH * 2);

        // Low / Bass kick frequencies (inner core - bright red/coral)
        const lowH = totalHeight * 0.45;
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(x, centerY - lowH, barWidth - 0.5, lowH * 2);
      }

      // =========================================================================
      // 2. OVERLAY DYNAMIC 4/4 BEAT GRID (DRAWN ON TOP FOR RAZOR-SHARP VISIBILITY)
      // =========================================================================
      if (showBeatGrid && deck.bpm > 0) {
        const beatInterval = 60 / deck.bpm;
        const offset = deckId === 'A' ? gridOffsetA : gridOffsetB;

        // Find the index range of beats intersecting the visible screen window
        const startBeatIndex = Math.floor((startTime - offset) / beatInterval);
        const endBeatIndex = Math.ceil((endTime - offset) / beatInterval);

        for (let bIdx = startBeatIndex; bIdx <= endBeatIndex; bIdx++) {
          const beatTime = bIdx * beatInterval + offset;
          const x = ((beatTime - startTime) / timeWindow) * width;

          // Skip if outside viewport bounds
          if (x < -15 || x > width + 15) continue;

          // 4/4 Timing logic:
          // In standard 4/4 meter, every 4th beat is the Downbeat (Beat 1 / Bar boundary)
          const beatInBar = ((bIdx % 4) + 4) % 4 + 1; // 1, 2, 3, or 4
          const isDownbeat = beatInBar === 1;
          const barIndex = Math.floor(bIdx / 4) + 1;

          if (isDownbeat) {
            // --- DOWNBEAT (BEAT 1 / BAR MARKER) ---
            // Prominent full-height line with deck-specific accent glow
            ctx.save();
            ctx.shadowColor = accentColor;
            ctx.shadowBlur = gridIntensity === 'vivid' ? 8 : 4;
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = gridIntensity === 'vivid' ? 2 : 1.5;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            ctx.restore();

            // Downward triangle notch at the top edge
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.moveTo(x - 5, 0);
            ctx.lineTo(x + 5, 0);
            ctx.lineTo(x, 7);
            ctx.closePath();
            ctx.fill();

            // Upward triangle notch at the bottom edge
            ctx.beginPath();
            ctx.moveTo(x - 5, height);
            ctx.lineTo(x + 5, height);
            ctx.lineTo(x, height - 7);
            ctx.closePath();
            ctx.fill();

            // Bar Downbeat Badge with high-contrast background pill
            const badgeW = 16;
            const badgeH = 13;
            drawRoundRect(ctx, x - badgeW / 2, 7, badgeW, badgeH, 3);
            ctx.fillStyle = 'rgba(7, 10, 16, 0.92)';
            ctx.fill();
            ctx.strokeStyle = accentColor;
            ctx.lineWidth = 1;
            ctx.stroke();

            // "1" Downbeat text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px "Chakra Petch", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('1', x, 14);

          } else {
            // --- SUB-BEATS (BEATS 2, 3, AND 4 OF 4/4 TIMING) ---
            ctx.save();
            ctx.strokeStyle = gridIntensity === 'vivid' 
              ? 'rgba(255, 255, 255, 0.55)' 
              : 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 2]); // Dashed grid line cutting cleanly over the audio bars

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            ctx.restore();

            // Tick markers at top and bottom edges
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(x - 1, 0, 2, 5);
            ctx.fillRect(x - 1, height - 5, 2, 5);

            // Sub-beat number badge (2, 3, 4)
            if (zoom <= 6) {
              const label = `${beatInBar}`;
              const subW = 13;
              const subH = 11;
              drawRoundRect(ctx, x - subW / 2, 5, subW, subH, 2);
              ctx.fillStyle = 'rgba(10, 14, 22, 0.85)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.lineWidth = 0.8;
              ctx.stroke();

              ctx.fillStyle = 'rgba(226, 232, 240, 0.95)';
              ctx.font = 'bold 8px "Chakra Petch", monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, x, 11);
            }
          }
        }
      }

      // =========================================================================
      // 3. DRAW HOT CUES ON TOP OF WAVEFORM & GRID
      // =========================================================================
      deck.cuePoints.forEach((cue) => {
        if (cue.time >= startTime && cue.time <= endTime) {
          const cueX = ((cue.time - startTime) / timeWindow) * width;
          ctx.fillStyle = cue.color;
          ctx.beginPath();
          ctx.moveTo(cueX - 6, 0);
          ctx.lineTo(cueX + 6, 0);
          ctx.lineTo(cueX, 10);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = cue.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cueX, 0);
          ctx.lineTo(cueX, height);
          ctx.stroke();

          ctx.fillStyle = '#000';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(`${cue.id}`, cueX, 1);
        }
      });

      // =========================================================================
      // 4. PLAYHEAD CENTER NEEDLE (TACTILE RED LINE WITH GLOWING POINTERS)
      // =========================================================================
      const playheadX = width / 2;
      ctx.save();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      ctx.restore();

      // Top & bottom playhead arrow heads
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 9);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(playheadX - 6, height);
      ctx.lineTo(playheadX + 6, height);
      ctx.lineTo(playheadX, height - 9);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    const render = () => {
      renderDeckWaveform(canvasRefA.current, deckA, '#38bdf8', 'A');
      renderDeckWaveform(canvasRefB.current, deckB, '#fbbf24', 'B');
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [deckA, deckB, zoom, showBeatGrid, gridIntensity, gridOffsetA, gridOffsetB]);

  // Phase meter computation: compares the fractional beat alignment of Deck A and Deck B
  const calculatePhaseOffset = (): number => {
    if (!deckA.isPlaying || !deckB.isPlaying || deckA.bpm <= 0 || deckB.bpm <= 0) return 0;
    const beatIntervalA = 60 / deckA.bpm;
    const beatIntervalB = 60 / deckB.bpm;
    const offsetA = gridOffsetA;
    const offsetB = gridOffsetB;
    const phaseA = (((deckA.currentTime - offsetA) % beatIntervalA) + beatIntervalA) % beatIntervalA / beatIntervalA;
    const phaseB = (((deckB.currentTime - offsetB) % beatIntervalB) + beatIntervalB) % beatIntervalB / beatIntervalB;
    let diff = phaseA - phaseB;
    if (diff > 0.5) diff -= 1.0;
    if (diff < -0.5) diff += 1.0;
    return diff; // -0.5 to +0.5
  };

  const phaseOffset = calculatePhaseOffset();
  const isPhaseLocked = Math.abs(phaseOffset) < 0.05 && deckA.isPlaying && deckB.isPlaying;

  // Mini overview click-to-seek
  const handleOverviewClick = (e: React.MouseEvent<HTMLDivElement>, deckId: 'A' | 'B') => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const deck = deckId === 'A' ? deckA : deckB;
    if (deck.track && deck.track.duration > 0) {
      const targetTime = ratio * deck.track.duration;
      if (deckId === 'A') onSeekA(targetTime);
      else onSeekB(targetTime);
    }
  };

  return (
    <div className="w-full bg-[#0a0c10] border-y border-[#1f2637] shadow-bevel-in p-2.5 flex flex-col gap-2">
      {/* Top Header Bar: Beat Phase Sync Meter & Waveform Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        {/* Deck A Quick Telemetry */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-['Chakra_Petch'] font-black text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30 flex-shrink-0">
            DECK A
          </span>
          <span className="text-slate-300 font-semibold truncate max-w-[120px] sm:max-w-[170px]">
            {deckA.track ? deckA.track.title : 'No Track'}
          </span>
          {deckA.track && (
            <span className="font-mono text-[11px] text-cyan-300 bg-cyan-950/30 px-1.5 py-0.5 rounded flex-shrink-0">
              {deckA.bpm.toFixed(1)} BPM
            </span>
          )}
        </div>

        {/* Real-time Beat Phase Alignment Visualizer & Beatmatching Meter */}
        <div className="flex items-center gap-2 bg-[#121620] px-3 py-1 rounded-full border border-white/10 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Zap className={`w-3 h-3 ${isPhaseLocked ? 'text-emerald-400 fill-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            4/4 BEAT PHASE
          </span>
          <div className="relative w-24 sm:w-32 h-2.5 bg-black/80 rounded-full overflow-hidden border border-white/10 flex items-center justify-center">
            {/* Center Lock Goal Line */}
            <div className="absolute w-1 h-full bg-white/40 z-10" />
            {/* Moving Phase Indicator */}
            <div 
              className={`absolute w-3 h-3 rounded-full transition-all duration-75 ${
                isPhaseLocked 
                  ? 'bg-emerald-400 led-glow-green scale-110 shadow-sm' 
                  : 'bg-rose-500 shadow-sm'
              }`}
              style={{
                transform: `translateX(${phaseOffset * 80}px)`
              }}
            />
          </div>
          <span className={`text-[10px] font-mono font-bold ${isPhaseLocked ? 'text-emerald-400 led-glow-green' : 'text-slate-400'}`}>
            {isPhaseLocked ? 'IN SYNC' : `${(phaseOffset * 100).toFixed(0)}%`}
          </span>
        </div>

        {/* Waveform Beat Grid & Zoom Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* BEAT GRID TOGGLE BUTTON */}
          <button
            id="btn-toggle-beatgrid"
            onClick={() => setShowBeatGrid(!showBeatGrid)}
            className={`px-2 py-1 rounded text-[11px] font-['Chakra_Petch'] font-black flex items-center gap-1 border transition-all active:scale-95 shadow-tactile-btn ${
              showBeatGrid
                ? 'bg-gradient-to-r from-cyan-600/90 to-indigo-600/90 text-white border-cyan-400 led-glow-cyan'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle 4/4 Dynamic Beat Grid Overlay"
          >
            <Grid className="w-3 h-3" />
            <span>GRID: {showBeatGrid ? '4/4 ON' : 'OFF'}</span>
          </button>

          {/* Grid Fine-Nudge Settings Button */}
          <button
            onClick={() => setShowGridNudge(!showGridNudge)}
            className={`p-1 rounded text-xs border transition-all ${
              showGridNudge
                ? 'bg-slate-700 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="Fine-tune Beat Grid Alignment (Nudge Offset)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Deck B Telemetry */}
          <div className="flex items-center gap-2">
            {deckB.track && (
              <span className="font-mono text-[11px] text-amber-300 bg-amber-950/30 px-1.5 py-0.5 rounded flex-shrink-0">
                {deckB.bpm.toFixed(1)} BPM
              </span>
            )}
            <span className="text-slate-300 font-semibold truncate max-w-[120px] sm:max-w-[170px] text-right">
              {deckB.track ? deckB.track.title : 'No Track'}
            </span>
            <span className="font-['Chakra_Petch'] font-black text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 flex-shrink-0">
              DECK B
            </span>
          </div>

          {/* Zoom In / Out Buttons */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(2, z / 2))}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 active:scale-95"
              title="Zoom In Waveform (2s / 4s / 8s)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-1">{zoom}s</span>
            <button
              onClick={() => setZoom((z) => Math.min(8, z * 2))}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 active:scale-95"
              title="Zoom Out Waveform"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Offset Fine-Tune Nudge Drawer */}
      {showGridNudge && (
        <div className="bg-[#111420] border border-cyan-500/20 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-['Chakra_Petch'] font-bold text-slate-300">
              MANUAL GRID PHASE CALIBRATION:
            </span>
            <button
              onClick={() => setGridIntensity(gridIntensity === 'vivid' ? 'normal' : 'vivid')}
              className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 hover:text-white"
            >
              STYLE: {gridIntensity.toUpperCase()}
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Deck A Grid Nudge */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-cyan-400 font-['Chakra_Petch']">GRID A:</span>
              <button
                onClick={() => setGridOffsetA((o) => o - 0.01)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95"
                title="Nudge Grid A Backwards 10ms"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="font-mono text-[10px] text-cyan-300 w-12 text-center">
                {(gridOffsetA * 1000).toFixed(0)}ms
              </span>
              <button
                onClick={() => setGridOffsetA((o) => o + 0.01)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95"
                title="Nudge Grid A Forward 10ms"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => setGridOffsetA(0)}
                className="p-1 text-slate-500 hover:text-white"
                title="Reset Deck A Grid"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Deck B Grid Nudge */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-amber-400 font-['Chakra_Petch']">GRID B:</span>
              <button
                onClick={() => setGridOffsetB((o) => o - 0.01)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95"
                title="Nudge Grid B Backwards 10ms"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="font-mono text-[10px] text-amber-300 w-12 text-center">
                {(gridOffsetB * 1000).toFixed(0)}ms
              </span>
              <button
                onClick={() => setGridOffsetB((o) => o + 0.01)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95"
                title="Nudge Grid B Forward 10ms"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => setGridOffsetB(0)}
                className="p-1 text-slate-500 hover:text-white"
                title="Reset Deck B Grid"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dual Stacked Waveform Canvases with 4/4 Beat Grid Overlay */}
      <div className="relative flex flex-col gap-0 w-full bg-[#08090d] rounded-lg overflow-hidden border border-[#1a1f2c] shadow-inner">
        {/* Deck A Scrolling Waveform Canvas */}
        <div className="relative w-full h-16 sm:h-20">
          <canvas
            ref={canvasRefA}
            className="w-full h-full block"
          />
          <div className="absolute top-1 left-2 pointer-events-none flex items-center gap-1">
            <span className="text-[10px] font-black text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
              A
            </span>
            {showBeatGrid && deckA.bpm > 0 && (
              <span className="text-[9px] font-mono text-cyan-300/80 bg-black/60 px-1 rounded">
                4/4 • {(60 / deckA.bpm).toFixed(2)}s/beat
              </span>
            )}
          </div>
        </div>

        {/* Center Divider: Dual Beatmatch Alignment Lock Bar */}
        <div className="h-[4px] w-full bg-gradient-to-r from-cyan-500/40 via-slate-600/40 to-amber-500/40 relative flex items-center justify-center">
          {/* Dual Beat Alignment Center Jewel */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 transition-all z-20 flex items-center justify-center ${
              isPhaseLocked 
                ? 'bg-emerald-400 border-white led-glow-green scale-125' 
                : 'bg-red-500 border-black/80 shadow-md'
            }`}
            title={isPhaseLocked ? 'Decks are Phase & Beat Synchronized' : 'Center Playhead'}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${isPhaseLocked ? 'bg-white animate-ping' : 'bg-white'}`} />
          </div>
        </div>

        {/* Deck B Scrolling Waveform Canvas */}
        <div className="relative w-full h-16 sm:h-20">
          <canvas
            ref={canvasRefB}
            className="w-full h-full block"
          />
          <div className="absolute top-1 left-2 pointer-events-none flex items-center gap-1">
            <span className="text-[10px] font-black text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/30">
              B
            </span>
            {showBeatGrid && deckB.bpm > 0 && (
              <span className="text-[9px] font-mono text-amber-300/80 bg-black/60 px-1 rounded">
                4/4 • {(60 / deckB.bpm).toFixed(2)}s/beat
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mini Overview Scrub Bars (Full Track Navigation & Cue Point Flags) */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* Deck A Mini Overview */}
        <div 
          onClick={(e) => handleOverviewClick(e, 'A')}
          className="relative h-6 bg-[#11141c] hover:bg-[#151924] rounded cursor-pointer border border-[#252b3d] overflow-hidden group shadow-inner"
        >
          {/* Progress fill */}
          {deckA.track && deckA.track.duration > 0 && (
            <div 
              className="absolute left-0 top-0 bottom-0 bg-cyan-500/25 border-r-2 border-cyan-400"
              style={{ width: `${(deckA.currentTime / deckA.track.duration) * 100}%` }}
            />
          )}
          {/* Cue Markers */}
          {deckA.cuePoints.map((cue) => (
            <div
              key={cue.id}
              className="absolute top-0 bottom-0 w-1 shadow-sm"
              style={{
                left: `${(cue.time / (deckA.track?.duration || 1)) * 100}%`,
                backgroundColor: cue.color
              }}
              title={`Hot Cue ${cue.id}`}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none text-[10px] font-mono text-slate-400">
            <span>DECK A OVERVIEW</span>
            <span>{deckA.track ? `${Math.floor(deckA.track.duration / 60)}:${Math.floor(deckA.track.duration % 60).toString().padStart(2, '0')}` : '--:--'}</span>
          </div>
        </div>

        {/* Deck B Mini Overview */}
        <div 
          onClick={(e) => handleOverviewClick(e, 'B')}
          className="relative h-6 bg-[#11141c] hover:bg-[#151924] rounded cursor-pointer border border-[#252b3d] overflow-hidden group shadow-inner"
        >
          {/* Progress fill */}
          {deckB.track && deckB.track.duration > 0 && (
            <div 
              className="absolute left-0 top-0 bottom-0 bg-amber-500/25 border-r-2 border-amber-400"
              style={{ width: `${(deckB.currentTime / deckB.track.duration) * 100}%` }}
            />
          )}
          {/* Cue Markers */}
          {deckB.cuePoints.map((cue) => (
            <div
              key={cue.id}
              className="absolute top-0 bottom-0 w-1 shadow-sm"
              style={{
                left: `${(cue.time / (deckB.track?.duration || 1)) * 100}%`,
                backgroundColor: cue.color
              }}
              title={`Hot Cue ${cue.id}`}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none text-[10px] font-mono text-slate-400">
            <span>DECK B OVERVIEW</span>
            <span>{deckB.track ? `${Math.floor(deckB.track.duration / 60)}:${Math.floor(deckB.track.duration % 60).toString().padStart(2, '0')}` : '--:--'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WaveformDisplay = React.memo(WaveformDisplayComponent);
