'use client';

import React from 'react';

interface ChangeVideoSectionProps {
  newVideoUrl: string;
  onVideoUrlChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  canControl: boolean;
}

export function ChangeVideoSection({
  newVideoUrl,
  onVideoUrlChange,
  onSubmit,
  canControl,
}: ChangeVideoSectionProps) {
  return (
    <div className="pt-1">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          Change Video
        </label>
        {!canControl && (
          <span className="text-[11px] text-zinc-500 font-normal">
            Playback locked by Host
          </span>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={newVideoUrl}
          onChange={(e) => onVideoUrlChange(e.target.value)}
          disabled={!canControl}
          placeholder={
            canControl
              ? 'Paste YouTube URL or video ID...'
              : 'Only Host and Moderators can change video'
          }
          className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.07] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        />
        <button
          type="submit"
          disabled={!canControl || !newVideoUrl.trim()}
          className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs text-zinc-200 transition-colors cursor-pointer"
        >
          Load
        </button>
      </form>
    </div>
  );
}
