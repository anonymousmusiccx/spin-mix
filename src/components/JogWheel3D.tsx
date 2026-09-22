/**
 * 3D Tactile Jog Wheel Component with Realistic Vinyl Grooves,
 * Stroboscopic Rim, Center OLED Telemetry Display, and Low-Latency Scratching.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DeckState } from '../types';
import { AudioEngine } from '../audio/audioEngine';
import { Disc3, Radio, RotateCcw } from 'lucide-react';

interface JogWheel3DProps {
  deck: DeckState;
  deckColor: 'cyan' | 'amber';
  onScratchStart: () => void;
  onScratchEnd: () => void;
  onNudge: (delta: number) => void;
}

export const JogWheel3D: React.FC<JogWheel3DProps> = ({
  deck,
  deckColor,
  onScratchStart,
  onScratchEnd,
  onNudge
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const lastAngleRef = useRef<number | null>(null);
  const audioEngine = AudioEngine.getInstance();

  // Color mappings
  const theme = deckColor === 'cyan' 
    ? {
        border: 'border-cyan-500/40',
        ringGlow: 'led-glow-cyan',
        led: 'bg-cyan-400',
        text: 'text-cyan-400',
        accent: '#06b6d4',
        strobe: 'rgba(6, 182, 212, 0.4)'
      }
    : {
        border: 'border-amber-500/40',
        ringGlow: 'led-glow-amber',
        led: 'bg-amber-400',
        text: 'text-amber-400',
        accent: '#f59e0b',
        strobe: 'rgba(245, 158, 11, 0.4)'
      };

  // Continuous rotation during playback (33 1/3 RPM = ~200 deg/sec at 1.0x)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (deck.isPlaying && !isPressed) {
        const degPerSec = 200 * deck.playbackRate;
        setRotation((prev) => (prev + degPerSec * dt) % 360);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [deck.isPlaying, deck.playbackRate, isPressed]);

  // Calculate pointer angle relative to jog center
  const getAngle = useCallback((clientX: number, clientY: number): number => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    let rad = Math.atan2(dy, dx);
    if (rad < 0) rad += 2 * Math.PI;
    return rad;
  }, []);

  // Pointer event handlers for touch/mouse scratching
  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsPressed(true);
    const angle = getAngle(e.clientX, e.clientY);
    lastAngleRef.current = angle;

    if (deck.vinylMode) {
      audioEngine.startScratch(deck.id);
      onScratchStart();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPressed || lastAngleRef.current === null) return;
    const currentAngle = getAngle(e.clientX, e.clientY);
    let delta = currentAngle - lastAngleRef.current;

    // Handle crossing 0 / 2*PI boundary
    if (delta > Math.PI) delta -= 2 * Math.PI;
    else if (delta < -Math.PI) delta += 2 * Math.PI;

    lastAngleRef.current = currentAngle;
    const deltaDeg = (delta * 180) / Math.PI;
    setRotation((prev) => (prev + deltaDeg) % 360);

    if (deck.vinylMode) {
      audioEngine.updateScratch(deck.id, delta);
    } else {
      // CDJ Pitch Bend Nudge mode
      const nudgeFactor = deltaDeg * 0.005;
      onNudge(nudgeFactor);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPressed) return;
    setIsPressed(false);
    lastAngleRef.current = null;

    if (deck.vinylMode) {
      audioEngine.endScratch(deck.id, deck.isPlaying);
      onScratchEnd();
    }
  };

  // Format track time
  const formatTime = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const remaining = Math.max(0, deck.duration - deck.currentTime);

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-1">
      {/* Outer 3D Brushed Metal Chassis Ring */}
      <div 
        ref={wheelRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-44 h-44 xs:w-52 xs:h-52 sm:w-60 sm:h-60 rounded-full cursor-grab active:cursor-grabbing p-2 sm:p-2.5 transition-shadow duration-300 touch-none select-none ${
          isPressed ? 'scale-[0.99] shadow-inner' : 'shadow-bevel-out'
        } bg-gradient-to-br from-[#2a3040] via-[#151922] to-[#0a0c10] border border-white/10`}
        style={{
          boxShadow: isPressed 
            ? `0 0 25px ${theme.accent}33, inset 0 4px 12px rgba(0,0,0,0.8)` 
            : '0 12px 28px rgba(0,0,0,0.7), inset 0 2px 2px rgba(255,255,255,0.1)'
        }}
      >
        {/* Stroboscopic Outer Ring Dots */}
        <div 
          className="absolute inset-2 rounded-full border border-dashed border-white/15 pointer-events-none"
          style={{
            transform: `rotate(${rotation}deg)`,
            borderColor: theme.strobe
          }}
        />

        {/* Vinyl Surface with Radial Micro-Grooves */}
        <div 
          className="relative w-full h-full rounded-full bg-vinyl-grooves overflow-hidden shadow-bevel-in border border-black/80 flex items-center justify-center"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Radial Light Reflection overlay */}
          <div className="absolute inset-0 vinyl-reflection rounded-full pointer-events-none opacity-40" />

          {/* Vinyl Run-Out Groove Marker */}
          <div className="absolute top-2 w-1.5 h-6 rounded-full bg-white/70 shadow-sm pointer-events-none" />
          <div 
            className="absolute top-1 w-2.5 h-2.5 rounded-full pointer-events-none" 
            style={{ backgroundColor: theme.accent, boxShadow: `0 0 8px ${theme.accent}` }}
          />
        </div>

        {/* Center Circular Display (Static HUD with illuminated markers) */}
        <div 
          className="absolute inset-[24%] rounded-full bg-gradient-to-b from-[#181c26] to-[#0a0c10] border-2 border-[#374151] flex flex-col items-center justify-center p-2 text-center pointer-events-none z-10 shadow-2xl"
          style={{
            boxShadow: `inset 0 2px 4px rgba(255,255,255,0.1), 0 0 16px rgba(0,0,0,0.9), 0 0 10px ${isPressed ? theme.accent + '44' : 'transparent'}`
          }}
        >
          {/* Deck Identifier & Vinyl/CDJ Mode Badge */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-xs font-black px-1.5 py-0.5 rounded font-['Chakra_Petch'] ${deckColor === 'cyan' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
              DECK {deck.id}
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {deck.vinylMode ? 'VINYL' : 'CDJ'}
            </span>
          </div>

          {/* Time Telemetry */}
          <div className="font-mono text-sm sm:text-base font-black tracking-tight text-white drop-shadow-md">
            {formatTime(deck.currentTime)}
          </div>
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <span>REM -{formatTime(remaining)}</span>
          </div>

          {/* Live BPM Readout */}
          <div className="mt-1 flex items-center gap-1 font-['Chakra_Petch']">
            <span className="text-[10px] text-slate-400">BPM</span>
            <span className={`text-xs font-bold ${theme.text}`}>
              {deck.bpm.toFixed(1)}
            </span>
            <span className="text-[9px] text-slate-500">
              ({deck.pitch >= 0 ? '+' : ''}{(deck.pitch * 100).toFixed(1)}%)
            </span>
          </div>

          {/* Rotating Platter Slip Indicator Needle */}
          <div 
            className="absolute inset-1 rounded-full pointer-events-none"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div 
              className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-3 rounded-full"
              style={{
                backgroundColor: theme.accent,
                boxShadow: `0 0 10px ${theme.accent}`
              }}
            />
          </div>
        </div>
      </div>

      {/* Jog Wheel Secondary Quick Nudge Buttons */}
      <div className="flex items-center gap-2 mt-2 w-full justify-center">
        <button
          onClick={() => onNudge(-0.02)}
          className="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-slate-300 border border-slate-700 shadow-tactile-btn flex items-center gap-1 transition-all"
          title="Pitch Nudge Slow"
        >
          <RotateCcw className="w-3 h-3" />
          - NUDGE
        </button>
        <div className="text-[10px] font-bold uppercase text-slate-500 px-1">
          {isPressed ? (deck.vinylMode ? 'SCRATCHING' : 'NUDGING') : 'READY'}
        </div>
        <button
          onClick={() => onNudge(0.02)}
          className="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-slate-300 border border-slate-700 shadow-tactile-btn flex items-center gap-1 transition-all"
          title="Pitch Nudge Fast"
        >
          + NUDGE
          <RotateCcw className="w-3 h-3 rotate-180" />
        </button>
      </div>
    </div>
  );
};
