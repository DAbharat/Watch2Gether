'use client';

import React from 'react';
import { Play, Pause, RotateCcw, RotateCw } from 'lucide-react';
import { YouTubePlayer, YouTubePlayerRef } from '@/components/YouTubePlayer';

interface VideoSectionProps {
  playerRef: React.RefObject<YouTubePlayerRef | null>;
  videoId: string;
  isPlaying: boolean;
  canControl: boolean;
  onLocalPlay: (time: number) => void;
  onLocalPause: (time: number) => void;
  onLocalSeek: (time: number) => void;
  onTogglePlay: () => void;
  onSeekOffset: (seconds: number) => void;
}

export function VideoSection({
  playerRef,
  videoId,
  isPlaying,
  canControl,
  onLocalPlay,
  onLocalPause,
  onLocalSeek,
  onTogglePlay,
  onSeekOffset,
}: VideoSectionProps) {
  return (
    <div className="rounded-xl overflow-hidden bg-black border border-white/[0.07]">
      {/* 16:9 Video Player Container */}
      <div className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center">
        <YouTubePlayer
          ref={playerRef}
          videoId={videoId}
          canControl={canControl}
          onLocalPlay={onLocalPlay}
          onLocalPause={onLocalPause}
          onLocalSeek={onLocalSeek}
        />
      </div>

      {/* Attached compact control bar */}
      <div className="px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Play/Pause: the ONLY accent-colored button */}
          <button
            onClick={onTogglePlay}
            disabled={!canControl}
            className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all ${
              canControl
                ? 'bg-teal-400 hover:bg-teal-300 text-black active:scale-95'
                : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed border border-white/[0.04]'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-black" strokeWidth={2} />
            ) : (
              <Play className="w-3.5 h-3.5 fill-black ml-0.5" strokeWidth={2} />
            )}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Rewind: neutral ghost button */}
          <button
            onClick={() => onSeekOffset(-10)}
            disabled={!canControl}
            className={`p-1.5 rounded-lg border border-transparent transition-colors ${
              canControl
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] hover:border-white/[0.08]'
                : 'text-zinc-600 cursor-not-allowed'
            }`}
            title="Rewind 10 seconds"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>

          {/* Forward: neutral ghost button */}
          <button
            onClick={() => onSeekOffset(10)}
            disabled={!canControl}
            className={`p-1.5 rounded-lg border border-transparent transition-colors ${
              canControl
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] hover:border-white/[0.08]'
                : 'text-zinc-600 cursor-not-allowed'
            }`}
            title="Forward 10 seconds"
          >
            <RotateCw className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Sync status: muted gray text with tiny dot, no yellow */}
        <div className="text-[11px] text-zinc-400 flex items-center gap-2 font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPlaying ? 'bg-teal-400' : 'bg-zinc-500'
            }`}
          />
          <span>{isPlaying ? 'Broadcast Synchronized' : 'Paused for everyone'}</span>
        </div>
      </div>
    </div>
  );
}
