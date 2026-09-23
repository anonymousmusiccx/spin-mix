/**
 * 6-Pad Performance Sampler Component with 3D Tactile Rubber Pads,
 * Pre-loaded High-Energy DJ Drops, Custom MP3/WAV Sample Loader per Pad,
 * Loop/One-Shot Modes, and Velocity LED Visual Feedback.
 */

import React, { useRef, useState } from 'react';
import { SamplerPad } from '../types';
import { AudioEngine } from '../audio/audioEngine';
import { Upload, Volume2, Repeat, Play, Square, Mic } from 'lucide-react';

interface Sampler6PadProps {
  pads: SamplerPad[];
  onTriggerPad: (index: number) => void;
  onStopPad: (index: number) => void;
  onUpdatePad: (index: number, updates: Partial<SamplerPad>) => void;
  onLoadCustomSample: (index: number, file: File) => void;
}

const Sampler6PadComponent: React.FC<Sampler6PadProps> = ({
  pads,
  onTriggerPad,
  onStopPad,
  onUpdatePad,
  onLoadCustomSample
}) => {
  const [activePadIndex, setActivePadIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePadPress = (index: number) => {
    const pad = pads[index];
    if (pad.isLoop && pad.isPlaying) {
      onStopPad(index);
    } else {
      setActivePadIndex(index);
      setTimeout(() => setActivePadIndex(null), 180);
      onTriggerPad(index);
    }
  };

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadCustomSample(index, file);
    }
  };

  const colors = [
    { border: 'border-rose-500/40', bg: 'hover:bg-rose-500/20', active: 'bg-rose-500 led-glow-red text-white' },
    { border: 'border-amber-500/40', bg: 'hover:bg-amber-500/20', active: 'bg-amber-500 led-glow-amber text-black font-black' },
    { border: 'border-emerald-500/40', bg: 'hover:bg-emerald-500/20', active: 'bg-emerald-500 led-glow-green text-black font-black' },
    { border: 'border-cyan-500/40', bg: 'hover:bg-cyan-500/20', active: 'bg-cyan-500 led-glow-cyan text-black font-black' },
    { border: 'border-indigo-500/40', bg: 'hover:bg-indigo-500/20', active: 'bg-indigo-500 led-glow-cyan text-white' },
    { border: 'border-fuchsia-500/40', bg: 'hover:bg-fuchsia-500/20', active: 'bg-fuchsia-500 led-glow-magenta text-white' }
  ];

  return (
    <div className="w-full bg-[#0d0f16] rounded-xl border border-[#232938] shadow-bevel-out p-3 flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-emerald-400" />
          <span className="font-['Chakra_Petch'] font-black text-xs text-white">
            CUSTOM SAMPLER (6 PADS)
          </span>
          <span className="text-[10px] text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
            LOAD MP3 / WAV
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
          TAP PAD TO FIRE • ONE-SHOT & LOOP MODES
        </span>
      </div>

      {/* 6 Tactile Drum Pads Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {pads.map((pad, idx) => {
          const color = colors[idx % colors.length];
          const isFired = activePadIndex === idx || pad.isPlaying;

          return (
            <div
              key={pad.id}
              className={`relative rounded-xl border ${color.border} bg-gradient-to-b from-[#181c26] to-[#0e1118] p-2.5 flex flex-col justify-between shadow-bevel-out group transition-all`}
            >
              {/* Pad Top: Pad Number & Mode Indicator */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                <span className="font-bold text-white font-['Chakra_Petch']">PAD {idx + 1}</span>
                <button
                  onClick={() => onUpdatePad(idx, { isLoop: !pad.isLoop })}
                  className={`p-1 rounded transition-colors ${
                    pad.isLoop ? 'text-cyan-400 bg-cyan-950/60' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={pad.isLoop ? 'Loop Mode Active (Click to switch to One-shot)' : 'One-shot Mode (Click to switch to Loop)'}
                >
                  <Repeat className="w-3 h-3" />
                </button>
              </div>

              {/* Main Rubber Hit Pad (3D Tactile Button) */}
              <button
                onClick={() => handlePadPress(idx)}
                className={`w-full h-20 sm:h-24 rounded-lg flex flex-col items-center justify-center p-2 text-center transition-all duration-75 shadow-tactile-btn ${
                  isFired
                    ? color.active
                    : `bg-[#131620] ${color.bg} text-slate-200 border border-white/10 active:scale-95`
                }`}
              >
                <span className="text-xs sm:text-sm font-black font-['Chakra_Petch'] uppercase tracking-wider truncate max-w-full">
                  {pad.name}
                </span>
                <span className="text-[9px] opacity-70 mt-1 font-mono">
                  {pad.isLoop ? (pad.isPlaying ? 'LOOPING' : 'LOOP') : 'ONE-SHOT'}
                </span>
              </button>

              {/* Pad Bottom Controls: Volume & Custom MP3 Upload */}
              <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between gap-1">
                {/* Pad Volume Slider */}
                <div className="flex items-center gap-1 flex-1">
                  <Volume2 className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={pad.volume}
                    onChange={(e) => onUpdatePad(idx, { volume: parseFloat(e.target.value) })}
                    className="w-full h-1.5 accent-slate-300 cursor-pointer"
                    title={`Volume: ${(pad.volume * 100).toFixed(0)}%`}
                  />
                </div>

                {/* Upload Custom Audio File */}
                <input
                  type="file"
                  accept="audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/*"
                  ref={(el) => { fileInputRefs.current[idx] = el; }}
                  onChange={(e) => handleFileChange(idx, e)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRefs.current[idx]?.click()}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 shadow-sm"
                  title="Load custom MP3 / WAV sample"
                >
                  <Upload className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Sampler6Pad = React.memo(Sampler6PadComponent);

// src/components/Sampler6Pad.tsx
import React, { useState } from 'react';

interface Pad {
  id: number;
  name: string;
  sampleUrl: string;
}

export const Sampler6Pad = () => {
  const [pads] = useState<Pad[]>([
    { id: 1, name: 'Airhorn', sampleUrl: '/samples/airhorn.wav' },
    { id: 2, name: 'Siren', sampleUrl: '/samples/siren.wav' },
    { id: 3, name: 'Drop', sampleUrl: '/samples/drop.wav' },
    { id: 4, name: 'Laser', sampleUrl: '/samples/laser.wav' },
    { id: 5, name: 'Clap', sampleUrl: '/samples/clap.wav' },
    { id: 6, name: 'Kick', sampleUrl: '/samples/kick.wav' },
  ]);

  const [activePad, setActivePad] = useState<number | null>(null);

  const handlePadTrigger = (pad: Pad) => {
    setActivePad(pad.id);
    // Trigger sample via Audio Engine without modifying pad.name or pad object
    const audio = new Audio(pad.sampleUrl);
    audio.currentTime = 0;
    audio.play().catch(() => {});

    setTimeout(() => setActivePad(null), 150);
  };

  return (
    <div className="sampler-grid grid grid-cols-3 gap-2 p-2">
      {pads.map((pad) => (
        <button
          key={pad.id}
          onClick={() => handlePadTrigger(pad)}
          className={`pad-button p-3 rounded font-bold text-xs truncate transition-all ${
            activePad === pad.id ? 'bg-cyan-500 text-black shadow-lg scale-95' : 'bg-gray-800 text-white hover:bg-gray-700'
          }`}
        >
          {/* Always display pad.name explicitly to prevent blank text */}
          {pad.name || `Sample ${pad.id}`}
        </button>
      ))}
    </div>
  );
};
