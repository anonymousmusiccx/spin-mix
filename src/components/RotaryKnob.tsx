/**
 * Tactile 3D Rotary Knob Component with Knurled Aluminium Rim,
 * Center Detent, LED Ring, and Pointer Drag Interaction.
 */

import React, { useRef, useState } from 'react';

interface RotaryKnobProps {
  label: string;
  value: number;        // Current value (can be -26 to +6 for EQ, -1 to +1 for filter, 0 to 1 for wet)
  min: number;
  max: number;
  defaultValue?: number;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'cyan' | 'amber' | 'emerald' | 'rose' | 'slate';
  hasKill?: boolean;
  onKill?: () => void;
  isKilled?: boolean;
  onChange: (val: number) => void;
}

export const RotaryKnob: React.FC<RotaryKnobProps> = ({
  label,
  value,
  min,
  max,
  defaultValue = 0,
  unit = '',
  size = 'md',
  color = 'slate',
  hasKill = false,
  onKill,
  isKilled = false,
  onChange
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValRef = useRef<number>(0);

  // Map value to -135deg to +135deg angle
  const norm = (value - min) / (max - min);
  const angle = -135 + norm * 270;

  // Knob sizes
  const sizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-14 h-14'
  }[size];

  const dotColors = {
    cyan: 'bg-cyan-400 led-glow-cyan',
    amber: 'bg-amber-400 led-glow-amber',
    emerald: 'bg-emerald-400 led-glow-green',
    rose: 'bg-rose-400 led-glow-red',
    slate: 'bg-white shadow-sm'
  }[color];

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dy = startYRef.current - e.clientY;
    const range = max - min;
    // 150px drag for full range
    const delta = (dy / 150) * range;
    const newVal = Math.max(min, Math.min(max, startValRef.current + delta));
    onChange(Number(newVal.toFixed(2)));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    onChange(defaultValue);
  };

  return (
    <div className="flex flex-col items-center select-none group">
      {/* Knob Label & Kill Button */}
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-['Chakra_Petch']">
          {label}
        </span>
        {hasKill && onKill && (
          <button
            onClick={onKill}
            className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold transition-all ${
              isKilled 
                ? 'bg-rose-600 text-white led-glow-red' 
                : 'bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700'
            }`}
            title="Instant Frequency Kill"
          >
            KILL
          </button>
        )}
      </div>

      {/* 3D Tactile Rotary Cap */}
      <div className="relative flex items-center justify-center p-1">
        {/* Outer Circular Bevel & Shadow */}
        <div 
          ref={knobRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          className={`${sizeClasses} rounded-full bg-gradient-to-b from-[#2e3444] via-[#1c202a] to-[#0f1117] border border-[#475569]/40 shadow-bevel-out cursor-ns-resize active:cursor-ns-resize flex items-center justify-center relative transition-transform touch-none select-none ${
            isDragging ? 'scale-105' : ''
          }`}
          style={{
            boxShadow: isDragging 
              ? '0 0 12px rgba(255,255,255,0.2), inset 0 2px 3px rgba(255,255,255,0.2)' 
              : '0 4px 8px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.15)'
          }}
          title={`${label}: ${value}${unit} (Drag up/down, Double-click to reset)`}
        >
          {/* Knurled Ridges Ring */}
          <div className="absolute inset-1 rounded-full border border-dashed border-white/10 pointer-events-none" />

          {/* Rotating Marker Cap */}
          <div 
            className="w-full h-full rounded-full relative flex items-center justify-center"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            {/* Position Indicator Dot / Notch */}
            <div 
              className={`absolute top-1 w-1 h-2 rounded-full ${isKilled ? 'bg-rose-500' : dotColors}`}
            />
          </div>

          {/* Center Raised Cap Dome */}
          <div className="absolute inset-[30%] rounded-full bg-gradient-to-b from-[#252b3b] to-[#12151e] border border-white/10 shadow-inner pointer-events-none" />
        </div>
      </div>

      {/* Readout Value */}
      <div className="text-[10px] font-mono text-slate-400 mt-0.5 min-w-[36px] text-center">
        {isKilled ? (
          <span className="text-rose-400 font-bold">KILL</span>
        ) : (
          <span>{value > 0 && unit !== '' ? `+${value}` : value}{unit}</span>
        )}
      </div>
    </div>
  );
};
