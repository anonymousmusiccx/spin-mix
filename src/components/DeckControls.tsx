/**
 * Deck Controls Component: Tactile 3D CUE and PLAY/PAUSE buttons,
 * Pitch/Tempo Fader with Key Lock, Beat Sync, Tap BPM, Hot Cues, and Auto Loops.
 */

import React, { useState } from 'react';
import { DeckState } from '../types';
import { Play, Pause, Zap, Disc, Key, Music, RotateCw, Sparkles } from 'lucide-react';

interface DeckControlsProps {
  deck: DeckState;
  otherDeckBpm: number;
  deckColor: 'cyan' | 'amber';
  onPlayToggle: () => void;
  onCue: () => void;
  onSync: () => void;
  onTapBpm: () => void;
  onPitchChange: (pitch: number) => void;
  onPitchRangeChange: (range: number) => void;
  onKeyLockToggle: () => void;
  onVinylModeToggle: () => void;
  onSetHotCue: (id: number) => void;
  onTriggerHotCue: (id: number) => void;
  onClearHotCue: (id: number) => void;
  onSetBeatLoop: (beats: number) => void;
  onExitLoop: () => void;
}

const DeckControlsComponent: React.FC<DeckControlsProps> = ({
  deck,
  otherDeckBpm,
  deckColor,
  onPlayToggle,
  onCue,
  onSync,
  onTapBpm,
  onPitchChange,
  onPitchRangeChange,
  onKeyLockToggle,
  onVinylModeToggle,
  onSetHotCue,
  onTriggerHotCue,
  onClearHotCue,
  onSetBeatLoop,
  onExitLoop
}) => {
  const [activeTab, setActiveTab] = useState<'cues' | 'loops'>('cues');
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  const theme = deckColor === 'cyan'
    ? {
        border: 'border-cyan-500/30',
        syncActive: 'bg-cyan-500 text-black led-glow-cyan font-black',
        accentText: 'text-cyan-400',
        faderThumb: 'accent-cyan-400'
      }
    : {
        border: 'border-amber-500/30',
        syncActive: 'bg-amber-500 text-black led-glow-amber font-black',
        accentText: 'text-amber-400',
        faderThumb: 'accent-amber-400'
      };

  const loopBeats = [0.25, 0.5, 1, 2, 4, 8, 16];

  return (
    <div className={`w-full bg-[#0d0f16] rounded-xl border ${theme.border} shadow-bevel-out p-3 flex flex-col gap-3`}>
      {/* Top Deck Performance Header (Sync, Master Tempo Key Lock, Tap BPM, Pitch Range) */}
      <div className="flex items-center justify-between bg-[#121622] p-2 rounded-lg border border-white/5">
        {/* SYNC & TAP BPM */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSync}
            className={`px-3 py-1.5 text-xs font-black font-['Chakra_Petch'] rounded tracking-wider uppercase transition-all shadow-tactile-btn flex items-center gap-1 ${
              deck.isSync
                ? theme.syncActive
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white'
            }`}
            title="Beat Sync to Other Deck"
          >
            <Zap className="w-3.5 h-3.5" />
            SYNC
          </button>

          <button
            onClick={onTapBpm}
            className="px-2.5 py-1.5 text-xs font-bold font-['Chakra_Petch'] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shadow-tactile-btn transition-all"
            title="Tap Tempo Manually"
          >
            TAP
          </button>
        </div>

        {/* Vinyl vs CDJ Jog Mode */}
        <button
          onClick={onVinylModeToggle}
          className={`px-2.5 py-1 text-xs font-bold font-['Chakra_Petch'] rounded border flex items-center gap-1 transition-all ${
            deck.vinylMode
              ? 'bg-purple-950 text-purple-300 border-purple-500/50 led-glow-magenta'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
          title="Toggle Vinyl Scratch vs CDJ Pitch Bend Mode"
        >
          <Disc className="w-3 h-3" />
          {deck.vinylMode ? 'VINYL' : 'CDJ'}
        </button>

        {/* KEY LOCK (Master Tempo) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onKeyLockToggle}
            className={`px-2.5 py-1 text-xs font-bold font-['Chakra_Petch'] rounded border flex items-center gap-1 transition-all ${
              deck.keyLock
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 led-glow-green font-black'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Preserve Pitch / Musical Key while adjusting Tempo"
          >
            <Key className="w-3 h-3" />
            KEY LOCK
          </button>

          {/* Pitch Range Selector */}
          <select
            value={deck.pitchRange}
            onChange={(e) => onPitchRangeChange(Number(e.target.value))}
            className="bg-black/60 text-slate-300 text-xs px-2 py-1 rounded border border-white/10 font-mono"
            title="Pitch Fader Range"
          >
            <option value={8}>±8%</option>
            <option value={16}>±16%</option>
            <option value={50}>±50%</option>
          </select>
        </div>
      </div>

      {/* Center Layout: Hot Cues / Loops Pad Section + Pitch Fader */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Performance Tabs (3 cols) */}
        <div className="md:col-span-3 flex flex-col gap-2 bg-[#10131d] p-2.5 rounded-lg border border-white/5">
          {/* Tab Selector: HOT CUES vs BEAT LOOPS */}
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('cues')}
                className={`text-xs font-bold font-['Chakra_Petch'] uppercase px-2 py-1 rounded transition-all ${
                  activeTab === 'cues'
                    ? 'bg-slate-700 text-white border border-white/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                HOT CUES (1 - 4)
              </button>
              <button
                onClick={() => setActiveTab('loops')}
                className={`text-xs font-bold font-['Chakra_Petch'] uppercase px-2 py-1 rounded transition-all ${
                  activeTab === 'loops'
                    ? 'bg-slate-700 text-white border border-white/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                BEAT LOOPS {deck.activeLoop?.active && '● ACTIVE'}
              </button>
            </div>

            {activeTab === 'cues' && (
              <button
                onClick={() => setIsShiftPressed(!isShiftPressed)}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all ${
                  isShiftPressed ? 'bg-rose-600 text-white led-glow-red' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Hold or toggle Shift to delete hot cues"
              >
                SHIFT (DELETE)
              </button>
            )}
          </div>

          {/* HOT CUES View */}
          {activeTab === 'cues' && (
            <div className="grid grid-cols-4 gap-2 py-1">
              {[1, 2, 3, 4].map((id) => {
                const cue = deck.cuePoints.find((c) => c.id === id);
                const isSet = !!cue;

                const cueColors = ['#f43f5e', '#38bdf8', '#10b981', '#f59e0b'];
                const padColor = cueColors[id - 1];

                return (
                  <button
                    key={id}
                    onClick={() => {
                      if (isShiftPressed) {
                        onClearHotCue(id);
                      } else if (isSet) {
                        onTriggerHotCue(id);
                      } else {
                        onSetHotCue(id);
                      }
                    }}
                    className={`h-14 rounded-lg flex flex-col items-center justify-center p-1 border shadow-tactile-btn transition-all ${
                      isSet
                        ? 'border-white/40 text-black font-black'
                        : 'border-white/10 bg-[#161a25] text-slate-400 hover:text-white'
                    }`}
                    style={{
                      backgroundColor: isSet ? padColor : undefined,
                      boxShadow: isSet ? `0 0 10px ${padColor}88` : undefined
                    }}
                  >
                    <span className="text-xs font-black font-['Chakra_Petch']">CUE {id}</span>
                    <span className="text-[9px] font-mono mt-0.5 opacity-80">
                      {isSet ? `${cue?.time.toFixed(1)}s` : (isShiftPressed ? 'CLEAR' : 'EMPTY')}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* BEAT LOOPS View */}
          {activeTab === 'loops' && (
            <div className="flex flex-col gap-2 py-1">
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {loopBeats.map((beats) => {
                  const isCurrentLoop = deck.activeLoop?.active && deck.activeLoop.beats === beats;
                  return (
                    <button
                      key={beats}
                      onClick={() => onSetBeatLoop(beats)}
                      className={`py-2 px-1 rounded-md text-xs font-bold font-mono border shadow-tactile-btn transition-all ${
                        isCurrentLoop
                          ? 'bg-cyan-500 text-black font-black led-glow-cyan border-cyan-300'
                          : 'bg-[#161a25] text-slate-300 border-white/10 hover:bg-[#1f2434]'
                      }`}
                    >
                      {beats >= 1 ? `${beats}` : `1/${1 / beats}`} BEAT
                    </button>
                  );
                })}
              </div>

              {deck.activeLoop?.active && (
                <button
                  onClick={onExitLoop}
                  className="w-full py-1 text-xs font-bold rounded bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500 shadow-sm uppercase tracking-wider"
                >
                  EXIT ACTIVE LOOP
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pitch / Tempo Vertical Slider & Dedicated RESET Button (1 col) */}
        <div className="flex flex-col items-center justify-between bg-[#10131d] p-2.5 rounded-lg border border-white/5 relative min-w-[90px]">
          <div className="flex items-center justify-between w-full text-[10px] font-mono text-slate-400">
            <span className="font-bold">TEMPO</span>
            <span className={`font-bold ${theme.accentText}`}>
              {deck.pitch >= 0 ? '+' : ''}{(deck.pitch * 100).toFixed(1)}%
            </span>
          </div>

          {/* Fader & Dedicated RESET Button layout */}
          <div className="flex items-center justify-center gap-1.5 w-full my-1.5">
            {/* Slider track with center detent notch */}
            <div className="relative flex items-center justify-center h-28 w-12">
              <input
                type="range"
                min={-deck.pitchRange / 100}
                max={deck.pitchRange / 100}
                step="0.001"
                value={deck.pitch}
                onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                className={`w-24 h-6 -rotate-90 origin-center cursor-pointer ${theme.faderThumb} touch-none`}
                title="Adjust Track Tempo/Pitch"
              />
              {/* Center 0% LED detent indicator */}
              <div 
                onClick={() => onPitchChange(0)}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full cursor-pointer pointer-events-none transition-all ${
                  Math.abs(deck.pitch) < 0.002 ? 'bg-emerald-400 led-glow-green scale-125' : 'bg-slate-700/80'
                }`}
                title="Center Zero Notch"
              />
            </div>

            {/* Dedicated Hardware 'RESET' Button next to fader */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                id={`btn-tempo-reset-${deck.id}`}
                onClick={() => onPitchChange(0)}
                className={`w-11 py-2 px-1 rounded-lg text-[10px] font-black font-['Chakra_Petch'] flex flex-col items-center justify-center gap-0.5 border shadow-tactile-btn transition-all active:scale-95 ${
                  Math.abs(deck.pitch) > 0.001
                    ? 'bg-gradient-to-b from-amber-600 via-amber-500 to-amber-700 text-black border-amber-300 led-glow-amber'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:border-slate-600'
                }`}
                title="Instantly snap pitch to 0.0 and return to original native track BPM"
              >
                <RotateCw className={`w-3.5 h-3.5 ${Math.abs(deck.pitch) > 0.001 ? 'animate-spin-slow' : 'opacity-60'}`} />
                <span className="leading-tight">RESET</span>
                <span className="font-mono text-[8px] font-bold opacity-90">0.0%</span>
              </button>

              {/* Native BPM Indicator Pill */}
              <span className="text-[8px] font-mono text-slate-400 text-center leading-tight">
                {deck.track ? `${deck.track.bpm} BPM` : 'NATIVE'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between w-full text-[9px] font-mono text-slate-500">
            <span>-{deck.pitchRange}%</span>
            <span className={Math.abs(deck.pitch) < 0.002 ? 'text-emerald-400 font-bold' : ''}>0.0</span>
            <span>+{deck.pitchRange}%</span>
          </div>
        </div>
      </div>

      {/* Main Transport Buttons: Large 3D CUE & PLAY/PAUSE */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* CUE Button (Amber Glowing 3D Tactile Button) */}
        <button
          onClick={onCue}
          className="h-14 sm:h-16 rounded-xl bg-gradient-to-b from-[#2b2518] via-[#1d1911] to-[#120f09] border-2 border-amber-500/60 hover:border-amber-400 active:scale-[0.98] shadow-bevel-out flex items-center justify-center gap-2 group transition-all"
          style={{
            boxShadow: '0 4px 12px rgba(0,0,0,0.6), inset 0 2px 2px rgba(245,158,11,0.2)'
          }}
        >
          <div className="w-4 h-4 rounded-full bg-amber-400 led-glow-amber" />
          <span className="font-['Chakra_Petch'] text-lg sm:text-xl font-black tracking-wider text-amber-400 group-hover:text-amber-300">
            CUE
          </span>
        </button>

        {/* PLAY / PAUSE Button (Emerald Green Glowing 3D Tactile Button) */}
        <button
          onClick={onPlayToggle}
          className={`h-14 sm:h-16 rounded-xl bg-gradient-to-b transition-all active:scale-[0.98] shadow-bevel-out flex items-center justify-center gap-2 border-2 ${
            deck.isPlaying
              ? 'from-[#122e20] via-[#0b1f15] to-[#06120c] border-emerald-400 led-glow-green'
              : 'from-[#1b241e] via-[#111713] to-[#0a0f0c] border-emerald-500/60 hover:border-emerald-400'
          }`}
          style={{
            boxShadow: deck.isPlaying 
              ? '0 0 20px rgba(16,185,129,0.4), inset 0 2px 2px rgba(16,185,129,0.3)'
              : '0 4px 12px rgba(0,0,0,0.6), inset 0 2px 2px rgba(16,185,129,0.15)'
          }}
        >
          {deck.isPlaying ? (
            <>
              <Pause className="w-5 h-5 text-emerald-400 fill-emerald-400" />
              <span className="font-['Chakra_Petch'] text-lg sm:text-xl font-black tracking-wider text-emerald-400">
                PAUSE
              </span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 text-emerald-400 fill-emerald-400" />
              <span className="font-['Chakra_Petch'] text-lg sm:text-xl font-black tracking-wider text-emerald-400">
                PLAY
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export const DeckControls = React.memo(DeckControlsComponent);
