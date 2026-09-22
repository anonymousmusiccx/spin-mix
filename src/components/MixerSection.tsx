/**
 * Center Mixer Section Component: 2-Channel Strips, 3-Band EQs,
 * Bipolar Dual Filters, Channel VU Meters, Tactile Vertical Faders,
 * Crossfader with Curves, and Master Output Controls.
 */

import React from 'react';
import { DeckState } from '../types';
import { RotaryKnob } from './RotaryKnob';
import { Headphones, Sliders, Volume2 } from 'lucide-react';

interface MixerSectionProps {
  deckA: DeckState;
  deckB: DeckState;
  crossfader: number; // -1 to +1
  crossfaderCurve: 'smooth' | 'sharp';
  masterVolume: number;
  meterLevels: { master: number; deckA: number; deckB: number };
  autoGainEnabled?: boolean;
  targetLufs?: number;
  onToggleAutoGain?: () => void;
  onTargetLufsChange?: (val: number) => void;
  onUpdateDeckA: (updates: Partial<DeckState>) => void;
  onUpdateDeckB: (updates: Partial<DeckState>) => void;
  onCrossfaderChange: (val: number) => void;
  onCrossfaderCurveToggle: () => void;
  onMasterVolumeChange: (val: number) => void;
}

export const MixerSection: React.FC<MixerSectionProps> = ({
  deckA,
  deckB,
  crossfader,
  crossfaderCurve,
  masterVolume,
  meterLevels,
  autoGainEnabled = true,
  targetLufs = -14,
  onToggleAutoGain,
  onTargetLufsChange,
  onUpdateDeckA,
  onUpdateDeckB,
  onCrossfaderChange,
  onCrossfaderCurveToggle,
  onMasterVolumeChange
}) => {
  // Render a vertical LED VU meter column
  const renderVuMeter = (level: number, heightBars = 12) => {
    const bars = [];
    for (let i = heightBars - 1; i >= 0; i--) {
      const threshold = i / heightBars;
      const isActive = level >= threshold;
      let colorClass = 'bg-slate-800';
      if (isActive) {
        if (i >= heightBars - 2) colorClass = 'bg-rose-500 led-glow-red';
        else if (i >= heightBars - 4) colorClass = 'bg-amber-400 led-glow-amber';
        else colorClass = 'bg-emerald-400 led-glow-green';
      }
      bars.push(
        <div
          key={i}
          className={`w-1.5 h-2 rounded-[1px] transition-colors duration-75 ${colorClass}`}
        />
      );
    }
    return <div className="flex flex-col gap-0.5 p-1 bg-black/60 rounded border border-white/5">{bars}</div>;
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto bg-gradient-to-b from-[#181c26] via-[#10131a] to-[#0c0e14] rounded-xl border border-[#2b3346] shadow-bevel-out p-3 sm:p-4 flex flex-col justify-between">
      {/* Top Header: Master Output & Level Metering */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 bg-[#131722]/80 p-2.5 rounded-lg border border-white/5">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-slate-400" />
          <RotaryKnob
            label="MASTER"
            value={masterVolume}
            min={0}
            max={1.5}
            defaultValue={1.0}
            unit="x"
            size="sm"
            color="emerald"
            onChange={onMasterVolumeChange}
          />
        </div>

        {/* Master Stereo Peak LED Meter */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-['Chakra_Petch'] font-bold text-slate-400">
            MASTER OUT L / R
          </span>
          <div className="flex items-center gap-1">
            {renderVuMeter(meterLevels.master, 10)}
            {renderVuMeter(meterLevels.master * 0.95, 10)}
          </div>
        </div>

        {/* Crossfader Curve Mode */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] font-['Chakra_Petch'] font-bold text-slate-400">
            X-CURVE
          </span>
          <button
            onClick={onCrossfaderCurveToggle}
            className={`px-2 py-1 text-[10px] font-bold rounded uppercase transition-all shadow-tactile-btn ${
              crossfaderCurve === 'smooth'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                : 'bg-rose-950 text-rose-300 border border-rose-500/50'
            }`}
            title="Toggle Crossfader Curve (Smooth Blend vs Sharp Scratch Cut)"
          >
            {crossfaderCurve === 'smooth' ? 'SMOOTH' : 'SHARP CUT'}
          </button>
        </div>
      </div>

      {/* Auto-Gain (LUFS Normalization) Control Strip */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/10 px-2.5 py-1.5 bg-[#0b0e15] rounded-lg border border-cyan-500/20 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full transition-all ${
                autoGainEnabled ? 'bg-emerald-400 led-glow-green animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span className="font-['Chakra_Petch'] font-black text-[11px] text-slate-200 tracking-wider">
              AUTO-GAIN
            </span>
          </div>
          <button
            onClick={onToggleAutoGain}
            className={`px-2.5 py-0.5 rounded text-[10px] font-black font-['Chakra_Petch'] uppercase transition-all shadow-tactile-btn ${
              autoGainEnabled
                ? 'bg-emerald-500 text-black led-glow-green border border-emerald-300'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
            }`}
            title="Automatically normalizes gain of loaded tracks to target LUFS standard (ITU-R BS.1770)"
          >
            {autoGainEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Target LUFS Standard Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-400">TARGET:</span>
          <select
            value={targetLufs}
            disabled={!autoGainEnabled}
            onChange={(e) => onTargetLufsChange?.(Number(e.target.value))}
            className="bg-black/80 text-cyan-300 font-mono text-[10px] px-2 py-0.5 rounded border border-cyan-500/40 focus:outline-none cursor-pointer disabled:opacity-40"
            title="Target Integrated LUFS Loudness standard"
          >
            <option value={-14}>-14 LUFS (Standard)</option>
            <option value={-12}>-12 LUFS (Club / Loud)</option>
            <option value={-16}>-16 LUFS (Dynamic)</option>
            <option value={-9}>-9 LUFS (EDM / Max)</option>
          </select>
        </div>
      </div>

      {/* Dual Channel Strips (A & B) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        {/* Channel A Strip */}
        <div className="flex flex-col items-center gap-2.5 bg-[#0f121a] p-2.5 rounded-lg border border-cyan-500/20 shadow-bevel-in">
          {/* Channel Header */}
          <div className="w-full flex flex-col gap-1 border-b border-white/5 pb-1">
            <div className="w-full flex items-center justify-between">
              <span className="font-['Chakra_Petch'] text-xs font-black text-cyan-400">CH 1</span>
              <RotaryKnob
                label="TRIM"
                value={deckA.gain}
                min={0}
                max={2.0}
                defaultValue={1.0}
                unit="x"
                size="sm"
                color="cyan"
                onChange={(v) => onUpdateDeckA({ gain: v })}
              />
            </div>
            {/* Auto-Gain LUFS Status Badge for CH 1 */}
            {autoGainEnabled && deckA.track && (
              <div className="flex items-center justify-between text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 text-cyan-300">
                <span>{deckA.track.lufs !== undefined ? `${deckA.track.lufs.toFixed(1)} LUFS` : 'ANALYZING...'}</span>
                <span className="text-emerald-400 font-bold">AUTO {deckA.gain.toFixed(2)}x</span>
              </div>
            )}
          </div>

          {/* 3-Band Equalizer */}
          <div className="flex flex-col gap-2 w-full items-center">
            <RotaryKnob
              label="HI"
              value={deckA.eqHigh}
              min={-26}
              max={6}
              defaultValue={0}
              unit="dB"
              size="sm"
              color="cyan"
              hasKill
              isKilled={deckA.eqHigh <= -25}
              onKill={() => onUpdateDeckA({ eqHigh: deckA.eqHigh <= -25 ? 0 : -26 })}
              onChange={(v) => onUpdateDeckA({ eqHigh: v })}
            />
            <RotaryKnob
              label="MID"
              value={deckA.eqMid}
              min={-26}
              max={6}
              defaultValue={0}
              unit="dB"
              size="sm"
              color="cyan"
              hasKill
              isKilled={deckA.eqMid <= -25}
              onKill={() => onUpdateDeckA({ eqMid: deckA.eqMid <= -25 ? 0 : -26 })}
              onChange={(v) => onUpdateDeckA({ eqMid: v })}
            />
            <RotaryKnob
              label="LOW"
              value={deckA.eqLow}
              min={-26}
              max={6}
              defaultValue={0}
              unit="dB"
              size="sm"
              color="cyan"
              hasKill
              isKilled={deckA.eqLow <= -25}
              onKill={() => onUpdateDeckA({ eqLow: deckA.eqLow <= -25 ? 0 : -26 })}
              onChange={(v) => onUpdateDeckA({ eqLow: v })}
            />
          </div>

          {/* Dual Color Filter (Bipolar LPF / HPF) */}
          <div className="w-full pt-1 border-t border-white/5 flex flex-col items-center">
            <RotaryKnob
              label="FILTER"
              value={deckA.filter}
              min={-1}
              max={1}
              defaultValue={0}
              size="sm"
              color="cyan"
              onChange={(v) => onUpdateDeckA({ filter: v })}
            />
          </div>

          {/* Headphone CUE / PFL Monitor Button */}
          <button
            onClick={() => onUpdateDeckA({ cuePfl: !deckA.cuePfl })}
            className={`w-full py-1 text-[10px] font-bold rounded flex items-center justify-center gap-1 border transition-all ${
              deckA.cuePfl
                ? 'bg-amber-500 text-black border-amber-400 led-glow-amber font-black'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Headphones className="w-3 h-3" />
            CUE A
          </button>

          {/* Vertical Channel Fader & Channel VU Meter */}
          <div className="flex items-center gap-3 w-full justify-center pt-2">
            {/* Channel VU Meter */}
            {renderVuMeter(meterLevels.deckA, 12)}

            {/* Tactile Vertical Slider */}
            <div className="relative flex flex-col items-center h-36">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={deckA.volume}
                onChange={(e) => onUpdateDeckA({ volume: parseFloat(e.target.value) })}
                className="w-32 h-6 -rotate-90 origin-center accent-cyan-400 cursor-pointer bg-transparent"
                style={{ marginTop: '55px' }}
              />
              <div className="text-[10px] font-mono text-cyan-400 font-bold mt-16">
                {(deckA.volume * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Crossfader Routing Selector for Deck A */}
          <div className="w-full pt-2 border-t border-white/5 flex flex-col items-center gap-1.5">
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-[9px] font-['Chakra_Petch'] font-bold text-slate-400">
                X-FADER ROUTING
              </span>
              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-black uppercase ${
                deckA.crossfaderRouting === 'THRU' 
                  ? 'bg-purple-950 text-purple-300 border border-purple-500/50 led-glow-magenta' 
                  : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
              }`}>
                {deckA.crossfaderRouting === 'THRU' ? 'THRU (BYPASS)' : `ASSIGN ${deckA.crossfaderRouting}`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 w-full">
              <button
                onClick={() => onUpdateDeckA({ crossfaderRouting: 'A' })}
                className={`py-1 text-[10px] font-bold font-['Chakra_Petch'] rounded transition-all shadow-tactile-btn ${
                  deckA.crossfaderRouting === 'A'
                    ? 'bg-cyan-500 text-black font-black led-glow-cyan'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-white/5'
                }`}
                title="Route Deck A to Crossfader Left (A)"
              >
                A
              </button>
              <button
                onClick={() => onUpdateDeckA({ crossfaderRouting: 'THRU' })}
                className={`py-1 text-[10px] font-bold font-['Chakra_Petch'] rounded transition-all shadow-tactile-btn ${
                  deckA.crossfaderRouting === 'THRU'
                    ? 'bg-purple-600 text-white font-black led-glow-magenta'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-white/5'
                }`}
                title="THRU: Bypass Crossfader completely (volume controlled only by channel vertical fader)"
              >
                THRU
              </button>
              <button
                onClick={() => onUpdateDeckA({ crossfaderRouting: 'B' })}
                className={`py-1 text-[10px] font-bold font-['Chakra_Petch'] rounded transition-all shadow-tactile-btn ${
                  deckA.crossfaderRouting === 'B'
                    ? 'bg-amber-500 text-black font-black led-glow-amber'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-white/5'
                }`}
                title="Route Deck A to Crossfader Right (B)"
              >
                B
              </button>
            </div>
          </div>
        </div>

        {/* Channel B Strip */}
        <div className="flex flex-col items-center gap-2.5 bg-[#0f121a] p-2.5 rounded-lg border border-amber-500/20 shadow-bevel-in">
          {/* Channel Header */}
          <div className="w-full flex flex-col gap-1 border-b border-white/5 pb-1">
            <div className="w-full flex items-center justify-between">
              <span className="font-['Chakra_Petch'] text-xs font-black text-amber-400">CH 2</span>
              <RotaryKnob
                label="TRIM"
                value={deckB.gain}
                min={0}
                max={2.0}
                defaultValue={1.0}
                unit="x"
                size="sm"
                color="amber"
                onChange={(v) => onUpdateDeckB({ gain: v })}
              />
            </div>
            {/* Auto-Gain LUFS Status Badge for CH 2 */}
            {autoGainEnabled && deckB.track && (
              <div className="flex items-center justify-between text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-500/30 text-amber-300">
                <span>{deckB.track.lufs !== undefined ? `${deckB.track.lufs.toFixed(1)} LUFS` : 'ANALYZING...'}</span>
                <span className="text-emerald-400 font-bold">AUTO {deckB.gain.toFixed(2)}x</span>
              </div>
            )}
          </div>

          {/* 3-Band Equalizer */}
          <div className="flex flex-col gap-2 w-full items-center">
            <RotaryKnob
              label="HI"
              value={deckB.eqHigh}
              min={-26}
              max={6}
              defaultValue={0}
              unit="dB"
              size="sm"
              color="amber"
              hasKill
              isKilled={deckB.eqHigh <= -25}
              onKill={() => onUpdateDeckB({ eqHigh: deckB.eqHigh <= -25 ? 0 : -26 })}
              onChange={(v) => onUpdateDeckB({ eqHigh: v })}
            />
            <RotaryKnob
              label="MID"
              value={deckB.eqMid}
              min={-26}
              max={6}
              defaultValue={0}
              unit="dB"
              size="sm"
              color="amber"
              hasKill
              isKilled={deckB.eqMid <= -25}
              onKill={() => onUpdateDeckB({ eqMid: deckB.eqMid <= -25 ? 0 : -26 })}
              onChange={(v) => onUpdateDeckB({ eqMid: v })}
            />
            <RotaryKnob
              label="LOW"
              value={deckB.eqLow}
              min={-26}
              max={6}
              defaultValue={0}
              unit="dB"
              size="sm"
              color="amber"
              hasKill
              isKilled={deckB.eqLow <= -25}
              onKill={() => onUpdateDeckB({ eqLow: deckB.eqLow <= -25 ? 0 : -26 })}
              onChange={(v) => onUpdateDeckB({ eqLow: v })}
            />
          </div>

          {/* Dual Color Filter (Bipolar LPF / HPF) */}
          <div className="w-full pt-1 border-t border-white/5 flex flex-col items-center">
            <RotaryKnob
              label="FILTER"
              value={deckB.filter}
              min={-1}
              max={1}
              defaultValue={0}
              size="sm"
              color="amber"
              onChange={(v) => onUpdateDeckB({ filter: v })}
            />
          </div>

          {/* Headphone CUE / PFL Monitor Button */}
          <button
            onClick={() => onUpdateDeckB({ cuePfl: !deckB.cuePfl })}
            className={`w-full py-1 text-[10px] font-bold rounded flex items-center justify-center gap-1 border transition-all ${
              deckB.cuePfl
                ? 'bg-amber-500 text-black border-amber-400 led-glow-amber font-black'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Headphones className="w-3 h-3" />
            CUE B
          </button>

          {/* Vertical Channel Fader & Channel VU Meter */}
          <div className="flex items-center gap-3 w-full justify-center pt-2">
            {/* Channel VU Meter */}
            {renderVuMeter(meterLevels.deckB, 12)}

            {/* Tactile Vertical Slider */}
            <div className="relative flex flex-col items-center h-36">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={deckB.volume}
                onChange={(e) => onUpdateDeckB({ volume: parseFloat(e.target.value) })}
                className="w-32 h-6 -rotate-90 origin-center accent-amber-400 cursor-pointer bg-transparent"
                style={{ marginTop: '55px' }}
              />
              <div className="text-[10px] font-mono text-amber-400 font-bold mt-16">
                {(deckB.volume * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Crossfader Routing Selector for Deck B */}
          <div className="w-full pt-2 border-t border-white/5 flex flex-col items-center gap-1.5">
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-[9px] font-['Chakra_Petch'] font-bold text-slate-400">
                X-FADER ROUTING
              </span>
              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-black uppercase ${
                deckB.crossfaderRouting === 'THRU' 
                  ? 'bg-purple-950 text-purple-300 border border-purple-500/50 led-glow-magenta' 
                  : 'bg-amber-950 text-amber-300 border border-amber-500/30'
              }`}>
                {deckB.crossfaderRouting === 'THRU' ? 'THRU (BYPASS)' : `ASSIGN ${deckB.crossfaderRouting}`}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 w-full">
              <button
                onClick={() => onUpdateDeckB({ crossfaderRouting: 'A' })}
                className={`py-1 text-[10px] font-bold font-['Chakra_Petch'] rounded transition-all shadow-tactile-btn ${
                  deckB.crossfaderRouting === 'A'
                    ? 'bg-cyan-500 text-black font-black led-glow-cyan'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-white/5'
                }`}
                title="Route Deck B to Crossfader Left (A)"
              >
                A
              </button>
              <button
                onClick={() => onUpdateDeckB({ crossfaderRouting: 'THRU' })}
                className={`py-1 text-[10px] font-bold font-['Chakra_Petch'] rounded transition-all shadow-tactile-btn ${
                  deckB.crossfaderRouting === 'THRU'
                    ? 'bg-purple-600 text-white font-black led-glow-magenta'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-white/5'
                }`}
                title="THRU: Bypass Crossfader completely (volume controlled only by channel vertical fader)"
              >
                THRU
              </button>
              <button
                onClick={() => onUpdateDeckB({ crossfaderRouting: 'B' })}
                className={`py-1 text-[10px] font-bold font-['Chakra_Petch'] rounded transition-all shadow-tactile-btn ${
                  deckB.crossfaderRouting === 'B'
                    ? 'bg-amber-500 text-black font-black led-glow-amber'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-white/5'
                }`}
                title="Route Deck B to Crossfader Right (B)"
              >
                B
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Crossfader Section at Bottom */}
      <div className="mt-4 pt-3 border-t border-white/10 bg-[#0d0f16] p-3 rounded-lg border border-white/5 shadow-bevel-in">
        <div className="flex items-center justify-between text-[10px] font-['Chakra_Petch'] font-black px-1 mb-1">
          <button 
            onClick={() => onCrossfaderChange(-1)} 
            className="text-cyan-400 hover:text-white px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30"
          >
            CUT A
          </button>
          
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 tracking-wider">CROSSFADER</span>
            {(deckA.crossfaderRouting === 'THRU' || deckB.crossfaderRouting === 'THRU') && (
              <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/40 font-bold">
                {deckA.crossfaderRouting === 'THRU' && deckB.crossfaderRouting === 'THRU' 
                  ? 'ALL THRU' 
                  : deckA.crossfaderRouting === 'THRU' ? 'CH1 THRU' : 'CH2 THRU'}
              </span>
            )}
          </div>

          <button 
            onClick={() => onCrossfaderChange(1)} 
            className="text-amber-400 hover:text-white px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/30"
          >
            CUT B
          </button>
        </div>

        {/* Tactile Horizontal Crossfader Slider */}
        <div className="relative flex items-center justify-center my-1.5">
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={crossfader}
            onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
            className="w-full h-8 accent-slate-100 cursor-pointer"
          />
        </div>

        {/* Center Indicator */}
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-2">
          <span>DECK A</span>
          <button 
            onClick={() => onCrossfaderChange(0)}
            className="hover:text-white transition-colors"
            title="Reset Crossfader to Center"
          >
            CENTER [0]
          </button>
          <span>DECK B</span>
        </div>
      </div>
    </div>
  );
};
