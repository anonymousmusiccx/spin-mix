/**
 * Performance Modal Component (Cross DJ Launcher Style).
 * Allows launching the 2-Channel Mixer, Double FX Unit, or 6-Pad Sampler
 * directly from the main screen in a focused, mobile-friendly interactive overlay.
 */

import React from 'react';
import { DeckState, SamplerPad, FxConfig } from '../types';
import { MixerSection } from './MixerSection';
import { DoubleFxUnit } from './DoubleFxUnit';
import { Sampler6Pad } from './Sampler6Pad';
import { Sliders, Sparkles, Grid, X } from 'lucide-react';

export type PerformanceTab = 'mixer' | 'fx' | 'sampler';

interface PerformanceModalProps {
  isOpen: boolean;
  activeTab: PerformanceTab;
  onTabChange: (tab: PerformanceTab) => void;
  onClose: () => void;
  // Mixer Props
  deckA: DeckState;
  deckB: DeckState;
  crossfader: number;
  crossfaderCurve: 'smooth' | 'sharp';
  masterVolume: number;
  meterLevels: { master: number; deckA: number; deckB: number };
  onUpdateDeckA: (update: Partial<DeckState>) => void;
  onUpdateDeckB: (update: Partial<DeckState>) => void;
  onCrossfaderChange: (val: number) => void;
  onCrossfaderCurveToggle: () => void;
  onMasterVolumeChange: (val: number) => void;
  // FX Props
  onUpdateFx: (deckId: 'A' | 'B', fxSlot: 1 | 2, update: Partial<FxConfig>) => void;
  // Sampler Props
  samplerPads: SamplerPad[];
  onTriggerSamplerPad: (id: number) => void;
  onStopSamplerPad: (id: number) => void;
  onUpdateSamplerPad: (id: number, update: Partial<SamplerPad>) => void;
  onLoadCustomSample: (id: number, file: File) => void;
}

export const PerformanceModal: React.FC<PerformanceModalProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  deckA,
  deckB,
  crossfader,
  crossfaderCurve,
  masterVolume,
  meterLevels,
  onUpdateDeckA,
  onUpdateDeckB,
  onCrossfaderChange,
  onCrossfaderCurveToggle,
  onMasterVolumeChange,
  onUpdateFx,
  samplerPads,
  onTriggerSamplerPad,
  onStopSamplerPad,
  onUpdateSamplerPad,
  onLoadCustomSample
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] bg-[#0c0f17] border-2 border-[#242b3d] rounded-2xl flex flex-col shadow-2xl overflow-hidden shadow-bevel-out">
        {/* Launcher Header & Module Navigation Switcher */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-white/10 bg-[#121622] gap-2">
          {/* Module Selector Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5">
            <button
              id="tab-launch-mixer"
              onClick={() => onTabChange('mixer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-['Chakra_Petch'] font-black flex items-center gap-1.5 uppercase transition-all shadow-tactile-btn border whitespace-nowrap ${
                activeTab === 'mixer'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white border-cyan-400 led-glow-cyan'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-300" />
              <span>2-CH MIXER</span>
            </button>

            <button
              id="tab-launch-fx"
              onClick={() => onTabChange('fx')}
              className={`px-3 py-1.5 rounded-lg text-xs font-['Chakra_Petch'] font-black flex items-center gap-1.5 uppercase transition-all shadow-tactile-btn border whitespace-nowrap ${
                activeTab === 'fx'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-400 led-glow-magenta'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-300" />
              <span>DOUBLE FX [10 FX]</span>
              {(deckA.fx1.active || deckA.fx2.active || deckB.fx1.active || deckB.fx2.active) && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 led-glow-green animate-ping" />
              )}
            </button>

            <button
              id="tab-launch-sampler"
              onClick={() => onTabChange('sampler')}
              className={`px-3 py-1.5 rounded-lg text-xs font-['Chakra_Petch'] font-black flex items-center gap-1.5 uppercase transition-all shadow-tactile-btn border whitespace-nowrap ${
                activeTab === 'sampler'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-400 led-glow-amber'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-amber-300" />
              <span>SAMPLER [6-PAD]</span>
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 transition-colors shadow-tactile-btn flex items-center gap-1 text-xs font-['Chakra_Petch'] font-bold flex-shrink-0"
            title="Return to Main Decks"
          >
            <span className="hidden sm:inline">CLOSE</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Interactive Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#0a0c12]">
          {/* 2-CHANNEL MIXER VIEW */}
          {activeTab === 'mixer' && (
            <div className="max-w-xl mx-auto flex flex-col gap-3">
              <MixerSection
                deckA={deckA}
                deckB={deckB}
                crossfader={crossfader}
                crossfaderCurve={crossfaderCurve}
                masterVolume={masterVolume}
                meterLevels={meterLevels}
                onUpdateDeckA={update => onUpdateDeckA(update)}
                onUpdateDeckB={update => onUpdateDeckB(update)}
                onCrossfaderChange={onCrossfaderChange}
                onCrossfaderCurveToggle={onCrossfaderCurveToggle}
                onMasterVolumeChange={onMasterVolumeChange}
              />
            </div>
          )}

          {/* DOUBLE FX UNIT VIEW */}
          {activeTab === 'fx' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Deck A Double FX */}
              <DoubleFxUnit
                deckId="A"
                deckColor="cyan"
                fx1={deckA.fx1}
                fx2={deckA.fx2}
                onUpdateFx1={(u) => onUpdateFx('A', 1, u)}
                onUpdateFx2={(u) => onUpdateFx('A', 2, u)}
              />

              {/* Deck B Double FX */}
              <DoubleFxUnit
                deckId="B"
                deckColor="amber"
                fx1={deckB.fx1}
                fx2={deckB.fx2}
                onUpdateFx1={(u) => onUpdateFx('B', 1, u)}
                onUpdateFx2={(u) => onUpdateFx('B', 2, u)}
              />
            </div>
          )}

          {/* 6-PAD SAMPLER VIEW */}
          {activeTab === 'sampler' && (
            <div className="max-w-2xl mx-auto">
              <Sampler6Pad
                pads={samplerPads}
                onTriggerPad={onTriggerSamplerPad}
                onStopPad={onStopSamplerPad}
                onUpdatePad={onUpdateSamplerPad}
                onLoadCustomSample={onLoadCustomSample}
              />
            </div>
          )}
        </div>

        {/* Footer Quick Status Bar */}
        <div className="px-4 py-2 bg-[#090b10] border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 led-glow-cyan" />
            <span className="text-slate-400 font-bold">CROSS DJ LAUNCHER ENGINE</span>
          </div>
          <span className="text-slate-400">TOUCHPADS & HARDWARE ROTARY SYNCHRONIZED</span>
        </div>
      </div>
    </div>
  );
};
