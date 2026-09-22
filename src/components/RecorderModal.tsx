/**
 * Live Set Recording Component.
 * Captures master audio output, live duration timer,
 * instant preview playback, and direct export/download to mobile/desktop device.
 */

import React from 'react';
import { RecordingItem } from '../types';
import { Disc, Download, Play, Square, Trash2, X, Circle } from 'lucide-react';

interface RecorderModalProps {
  isOpen: boolean;
  isRecording: boolean;
  recordingDuration: number;
  recordings: RecordingItem[];
  onClose: () => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onDeleteRecording: (id: string) => void;
}

export const RecorderModal: React.FC<RecorderModalProps> = ({
  isOpen,
  isRecording,
  recordingDuration,
  recordings,
  onClose,
  onStartRecord,
  onStopRecord,
  onDeleteRecording
}) => {
  if (!isOpen) return null;

  const formatTimer = (sec: number): string => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#0c0f16] border-2 border-[#262e42] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#121622]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${
              isRecording 
                ? 'bg-rose-950/80 border-rose-500/50 text-rose-400 led-glow-red' 
                : 'bg-slate-800 border-white/10 text-slate-400'
            }`}>
              <Disc className={`w-5 h-5 ${isRecording ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-['Chakra_Petch'] text-white">
                LIVE SET RECORDER
              </h2>
              <p className="text-xs text-slate-400">
                Record your full mix directly to device storage in high quality.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Recording Status Card */}
        <div className="p-6 bg-gradient-to-b from-[#141824] to-[#0c0f16] border-b border-white/5 flex flex-col items-center justify-center text-center gap-4">
          {/* Animated LED / Pulsing Indicator */}
          <div className="flex items-center gap-2">
            <span className={`w-3.5 h-3.5 rounded-full ${
              isRecording ? 'bg-rose-500 led-glow-red animate-pulse' : 'bg-slate-700'
            }`} />
            <span className="font-['Chakra_Petch'] font-black text-sm uppercase tracking-wider text-slate-300">
              {isRecording ? 'RECORDING LIVE SET IN PROGRESS' : 'RECORDER STANDBY'}
            </span>
          </div>

          {/* Time Counter */}
          <div className="font-mono text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
            {formatTimer(recordingDuration)}
          </div>

          {/* Start / Stop Button */}
          <div>
            {isRecording ? (
              <button
                onClick={onStopRecord}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-['Chakra_Petch'] font-black text-sm uppercase tracking-wider shadow-tactile-btn led-glow-red flex items-center gap-2 transition-all"
              >
                <Square className="w-4 h-4 fill-white" />
                STOP & SAVE RECORDING
              </button>
            ) : (
              <button
                onClick={onStartRecord}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-['Chakra_Petch'] font-black text-sm uppercase tracking-wider shadow-tactile-btn flex items-center gap-2 transition-all"
              >
                <Circle className="w-4 h-4 fill-white" />
                START RECORDING LIVE SET
              </button>
            )}
          </div>
        </div>

        {/* Saved Session Recordings List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 max-h-72">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1 mb-1">
            <span>SAVED SETS ({recordings.length})</span>
            <span>DIRECT DEVICE DOWNLOAD</span>
          </div>

          {recordings.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No sets recorded in this session yet. Hit Start Recording to begin!
            </div>
          ) : (
            recordings.map((rec) => (
              <div
                key={rec.id}
                className="bg-[#121622] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3 shadow-bevel-out"
              >
                <div>
                  <h4 className="text-sm font-bold text-white font-['Chakra_Petch']">
                    {rec.name}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {rec.timestamp} • {formatTimer(rec.duration)} • {rec.sizeMb.toFixed(1)} MB
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Download to mobile device */}
                  <a
                    href={rec.url}
                    download={`${rec.name}.webm`}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-['Chakra_Petch'] flex items-center gap-1.5 shadow-tactile-btn transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    DOWNLOAD
                  </a>

                  {/* Delete */}
                  <button
                    onClick={() => onDeleteRecording(rec.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                    title="Delete recording"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#0d1017] flex items-center justify-between text-xs text-slate-400">
          <span>Audio files are processed locally on your hardware.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
