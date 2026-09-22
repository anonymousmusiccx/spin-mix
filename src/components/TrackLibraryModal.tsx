/**
 * Track Library Component for Local Audio Storage Integration.
 * Multi-format playback (MP3, WAV, M4A, OGG), Drag & Drop import,
 * Automatic BPM Detection, Musical Key Analysis, Search & Instant Deck Loading.
 */

import React, { useState, useRef } from 'react';
import { Track } from '../types';
import { AudioEngine } from '../audio/audioEngine';
import { Folder, Upload, Search, Music, Play, Square, X, Plus, HardDrive, Sparkles } from 'lucide-react';

interface TrackLibraryModalProps {
  isOpen: boolean;
  tracks: Track[];
  onClose: () => void;
  onLoadTrackToDeck: (deckId: 'A' | 'B', track: Track) => void;
  onImportFiles: (files: FileList | File[]) => Promise<void>;
  isLoadingAudio: boolean;
}

export const TrackLibraryModal: React.FC<TrackLibraryModalProps> = ({
  isOpen,
  tracks,
  onClose,
  onLoadTrackToDeck,
  onImportFiles,
  isLoadingAudio
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioEngine = AudioEngine.getInstance();

  if (!isOpen) return null;

  const filteredTracks = tracks.filter((t) => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.bpm.toString().includes(searchQuery)
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onImportFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onImportFiles(e.target.files);
    }
  };

  // Preview track in library
  const handleTogglePreview = (track: Track) => {
    if (previewTrackId === track.id) {
      setPreviewTrackId(null);
    } else {
      setPreviewTrackId(track.id);
    }
  };

  const formatDuration = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full max-w-4xl max-h-[90vh] bg-[#0c0f16] border-2 rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all ${
          isDragging ? 'border-cyan-400 ring-4 ring-cyan-500/20' : 'border-[#262e42]'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#121622]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-['Chakra_Petch'] text-white flex items-center gap-2">
                LOCAL TRACK LIBRARY & STORAGE
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  {tracks.length} TRACKS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Supports MP3, WAV, M4A, OGG. Plays 100% locally with low latency.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoadingAudio}
              className="px-3 py-1.5 text-xs font-bold font-['Chakra_Petch'] rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-tactile-btn flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              ADD LOCAL FILES
            </button>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/aac,audio/*"
              onChange={handleFileInput}
              className="hidden"
            />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Drag/Drop Notification Banner */}
        <div className="p-4 bg-[#0e111a] border-b border-white/5 flex flex-col sm:flex-row items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, artist, BPM, or Camelot key (e.g., '126', '8A', 'Tech')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/60 border border-white/10 rounded-lg text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Quick Dropzone indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-2 rounded-lg border border-white/5 w-full sm:w-auto justify-center">
            <HardDrive className="w-4 h-4 text-slate-400" />
            <span>Drag & Drop files anywhere into this window</span>
          </div>
        </div>

        {/* Loading Spinner Indicator */}
        {isLoadingAudio && (
          <div className="p-4 bg-cyan-950/40 border-b border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <span>Decoding audio buffer & analyzing multi-band waveforms, BPM, and musical key...</span>
          </div>
        )}

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {filteredTracks.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500">
              <Music className="w-12 h-12 mb-3 text-slate-600" />
              <p className="text-sm font-bold text-slate-400">No tracks match your query</p>
              <p className="text-xs text-slate-500 mt-1">
                Drop your local MP3, WAV, M4A or OGG files here to import them.
              </p>
            </div>
          ) : (
            filteredTracks.map((track) => (
              <div
                key={track.id}
                className="bg-[#131622] hover:bg-[#181c2c] border border-white/5 hover:border-cyan-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all group"
              >
                {/* Track Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-cyan-400 flex-shrink-0 group-hover:scale-105 transition-transform">
                    {track.isDemo ? <Sparkles className="w-5 h-5 text-amber-400" /> : <Music className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white truncate font-['Chakra_Petch']">
                        {track.title}
                      </h3>
                      {track.isDemo && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                          Built-in
                        </span>
                      )}
                      {track.fileFormat && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                          {track.fileFormat}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{track.artist}</span>
                      <span>•</span>
                      <span className="font-mono text-cyan-300 font-bold">{track.bpm} BPM</span>
                      <span>•</span>
                      <span className="font-mono text-emerald-300 font-bold bg-emerald-950/40 px-1 rounded border border-emerald-500/20">
                        {track.key} ({track.musicalKey})
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-500">{formatDuration(track.duration)}</span>
                    </div>
                  </div>
                </div>

                {/* Deck Load Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <button
                    onClick={() => {
                      onLoadTrackToDeck('A', track);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 active:bg-cyan-400 text-black font-['Chakra_Petch'] text-xs font-black shadow-tactile-btn transition-all"
                  >
                    LOAD TO DECK A
                  </button>
                  <button
                    onClick={() => {
                      onLoadTrackToDeck('B', track);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 active:bg-amber-400 text-black font-['Chakra_Petch'] text-xs font-black shadow-tactile-btn transition-all"
                  >
                    LOAD TO DECK B
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#0d1017] flex items-center justify-between text-xs text-slate-400">
          <span>All tracks stored in memory for real-time, low-latency zero-buffering playback.</span>
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
