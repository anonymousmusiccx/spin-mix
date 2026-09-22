/**
 * Double FX Unit Component with up to 10 Effects, Dual Simultaneous Slots,
 * FX Lock / Freeze functionality, Rotary Knobs, and 3D Kaoss Touch Pad.
 */

import React, { useState } from 'react';
import { FxState, FxType } from '../types';
import { FX_LIST } from '../audio/audioEngine';
import { RotaryKnob } from './RotaryKnob';
import { Lock, Unlock, Sparkles, Layers, Sliders } from 'lucide-react';

interface DoubleFxUnitProps {
  deckId: 'A' | 'B';
  deckColor: 'cyan' | 'amber';
  fx1: FxState;
  fx2: FxState;
  onUpdateFx1: (updates: Partial<FxState>) => void;
  onUpdateFx2: (updates: Partial<FxState>) => void;
}

const DoubleFxUnitComponent: React.FC<DoubleFxUnitProps> = ({
  deckId,
  deckColor,
  fx1,
  fx2,
  onUpdateFx1,
  onUpdateFx2
}) => {
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);
  const [showTouchPad, setShowTouchPad] = useState(false);

  const currentFx1Config = FX_LIST.find((f) => f.type === fx1.type) || FX_LIST[0];
  const currentFx2Config = FX_LIST.find((f) => f.type === fx2.type) || FX_LIST[1];

  const theme = deckColor === 'cyan'
    ? {
        border: 'border-cyan-500/30',
        badge: 'bg-cyan-950 text-cyan-400 border-cyan-500/40',
        activeBtn: 'bg-cyan-500 text-black font-black led-glow-cyan',
        freezeBtn: 'bg-indigo-600 text-white led-glow-cyan'
      }
    : {
        border: 'border-amber-500/30',
        badge: 'bg-amber-950 text-amber-400 border-amber-500/40',
        activeBtn: 'bg-amber-500 text-black font-black led-glow-amber',
        freezeBtn: 'bg-orange-600 text-white led-glow-amber'
      };

  // Kaoss Touch Pad Drag Interaction
  const handleTouchPadMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    if (activeSlot === 1) {
      onUpdateFx1({ param1: x, param2: y, active: true });
    } else {
      onUpdateFx2({ param1: x, param2: y, active: true });
    }
  };

  return (
    <div className={`w-full bg-[#0d0f16] rounded-xl border ${theme.border} shadow-bevel-out p-3 flex flex-col gap-2.5`}>
      {/* Header with Slot Switcher & Mode */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="font-['Chakra_Petch'] font-black text-xs text-white">
            DOUBLE FX ENGINE • DECK {deckId}
          </span>
          <span className="text-[10px] text-slate-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
            10 PRO FX
          </span>
        </div>

        {/* Slot Selector & Touch Pad Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSlot(1)}
            className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
              activeSlot === 1 ? theme.badge : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            SLOT 1 {fx1.active && '●'}
          </button>
          <button
            onClick={() => setActiveSlot(2)}
            className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
              activeSlot === 2 ? theme.badge : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            SLOT 2 {fx2.active && '●'}
          </button>
          <button
            onClick={() => setShowTouchPad(!showTouchPad)}
            className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all ${
              showTouchPad 
                ? 'bg-purple-900/60 text-purple-300 border-purple-500/50' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle Kaoss XY Touch Pad"
          >
            <Sparkles className="w-3 h-3 inline mr-1" />
            XY PAD
          </button>
        </div>
      </div>

      {/* FX Slots Layout: Dual Side-by-Side or Selected Slot Focus */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* FX SLOT 1 */}
        <div className={`p-2.5 rounded-lg border bg-[#11141e] flex flex-col gap-2 ${
          activeSlot === 1 ? 'border-cyan-500/40 ring-1 ring-cyan-500/20' : 'border-white/5 opacity-85'
        }`}>
          {/* FX 1 Header & Selector */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-cyan-400 font-['Chakra_Petch']">
              FX 1:
            </span>
            <select
              value={fx1.type}
              onChange={(e) => onUpdateFx1({ type: e.target.value as FxType })}
              className="bg-black/60 text-slate-200 text-xs px-2 py-1 rounded border border-white/10 focus:outline-none focus:border-cyan-400 cursor-pointer font-semibold"
            >
              {FX_LIST.map((fx) => (
                <option key={fx.type} value={fx.type}>
                  {fx.name} ({fx.category})
                </option>
              ))}
            </select>
          </div>

          {/* Knobs for FX 1 */}
          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/5">
            <RotaryKnob
              label="WET/DRY"
              value={fx1.wet}
              min={0}
              max={1}
              defaultValue={0.5}
              unit="%"
              size="sm"
              color="cyan"
              onChange={(v) => onUpdateFx1({ wet: v })}
            />
            <RotaryKnob
              label={currentFx1Config.param1Label}
              value={fx1.param1}
              min={0}
              max={1}
              defaultValue={0.5}
              size="sm"
              color="cyan"
              onChange={(v) => onUpdateFx1({ param1: v })}
            />
            <RotaryKnob
              label={currentFx1Config.param2Label}
              value={fx1.param2}
              min={0}
              max={1}
              defaultValue={0.5}
              size="sm"
              color="cyan"
              onChange={(v) => onUpdateFx1({ param2: v })}
            />
          </div>

          {/* Action Buttons: On/Off & FX Freeze/Lock */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={() => onUpdateFx1({ active: !fx1.active })}
              className={`py-1 text-[11px] font-bold rounded uppercase transition-all shadow-tactile-btn ${
                fx1.active
                  ? theme.activeBtn
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
              }`}
            >
              {fx1.active ? 'FX 1 ON' : 'FX 1 OFF'}
            </button>
            <button
              onClick={() => onUpdateFx1({ locked: !fx1.locked, active: true })}
              className={`py-1 text-[11px] font-bold rounded flex items-center justify-center gap-1 uppercase transition-all shadow-tactile-btn ${
                fx1.locked
                  ? 'bg-blue-600 text-white font-black led-glow-cyan border border-blue-400'
                  : 'bg-slate-800/90 text-slate-400 border border-slate-700 hover:text-blue-300'
              }`}
              title="Lock effect tail/feedback loop during transitions"
            >
              {fx1.locked ? <Lock className="w-3 h-3 text-white" /> : <Unlock className="w-3 h-3 text-slate-500" />}
              {fx1.locked ? 'FREEZE' : 'FREEZE'}
            </button>
          </div>
        </div>

        {/* FX SLOT 2 */}
        <div className={`p-2.5 rounded-lg border bg-[#11141e] flex flex-col gap-2 ${
          activeSlot === 2 ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-white/5 opacity-85'
        }`}>
          {/* FX 2 Header & Selector */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 font-['Chakra_Petch']">
              FX 2:
            </span>
            <select
              value={fx2.type}
              onChange={(e) => onUpdateFx2({ type: e.target.value as FxType })}
              className="bg-black/60 text-slate-200 text-xs px-2 py-1 rounded border border-white/10 focus:outline-none focus:border-amber-400 cursor-pointer font-semibold"
            >
              {FX_LIST.map((fx) => (
                <option key={fx.type} value={fx.type}>
                  {fx.name} ({fx.category})
                </option>
              ))}
            </select>
          </div>

          {/* Knobs for FX 2 */}
          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/5">
            <RotaryKnob
              label="WET/DRY"
              value={fx2.wet}
              min={0}
              max={1}
              defaultValue={0.5}
              unit="%"
              size="sm"
              color="amber"
              onChange={(v) => onUpdateFx2({ wet: v })}
            />
            <RotaryKnob
              label={currentFx2Config.param1Label}
              value={fx2.param1}
              min={0}
              max={1}
              defaultValue={0.5}
              size="sm"
              color="amber"
              onChange={(v) => onUpdateFx2({ param1: v })}
            />
            <RotaryKnob
              label={currentFx2Config.param2Label}
              value={fx2.param2}
              min={0}
              max={1}
              defaultValue={0.5}
              size="sm"
              color="amber"
              onChange={(v) => onUpdateFx2({ param2: v })}
            />
          </div>

          {/* Action Buttons: On/Off & FX Freeze/Lock */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={() => onUpdateFx2({ active: !fx2.active })}
              className={`py-1 text-[11px] font-bold rounded uppercase transition-all shadow-tactile-btn ${
                fx2.active
                  ? 'bg-amber-500 text-black font-black led-glow-amber'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
              }`}
            >
              {fx2.active ? 'FX 2 ON' : 'FX 2 OFF'}
            </button>
            <button
              onClick={() => onUpdateFx2({ locked: !fx2.locked, active: true })}
              className={`py-1 text-[11px] font-bold rounded flex items-center justify-center gap-1 uppercase transition-all shadow-tactile-btn ${
                fx2.locked
                  ? 'bg-amber-600 text-white font-black led-glow-amber border border-amber-400'
                  : 'bg-slate-800/90 text-slate-400 border border-slate-700 hover:text-amber-300'
              }`}
              title="Lock effect tail/feedback loop during transitions"
            >
              {fx2.locked ? <Lock className="w-3 h-3 text-white" /> : <Unlock className="w-3 h-3 text-slate-500" />}
              {fx2.locked ? 'FREEZE' : 'FREEZE'}
            </button>
          </div>
        </div>
      </div>

      {/* Kaoss 3D XY Touch Pad (Optional Expressive Sweep Surface) */}
      {showTouchPad && (
        <div className="mt-2 bg-[#090b10] border border-purple-500/40 rounded-lg p-2 flex flex-col gap-1.5 shadow-bevel-in">
          <div className="flex items-center justify-between text-[10px] text-purple-300 font-mono">
            <span>KAOSS XY TOUCH PAD (FX {activeSlot})</span>
            <span>X: {(activeSlot === 1 ? fx1.param1 : fx2.param1).toFixed(2)} | Y: {(activeSlot === 1 ? fx1.param2 : fx2.param2).toFixed(2)}</span>
          </div>

          <div
            onPointerMove={handleTouchPadMove}
            onPointerDown={handleTouchPadMove}
            className="relative h-28 bg-gradient-to-tr from-purple-950/40 via-black to-cyan-950/40 rounded border border-white/10 cursor-crosshair overflow-hidden touch-none"
          >
            {/* Grid markings */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:16px_16px]" />

            {/* Glowing Touch Point */}
            <div
              className="absolute w-4 h-4 rounded-full bg-purple-400 -translate-x-1/2 -translate-y-1/2 led-glow-magenta pointer-events-none transition-all duration-75"
              style={{
                left: `${(activeSlot === 1 ? fx1.param1 : fx2.param1) * 100}%`,
                top: `${(1 - (activeSlot === 1 ? fx1.param2 : fx2.param2)) * 100}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const DoubleFxUnit = React.memo(DoubleFxUnitComponent);
