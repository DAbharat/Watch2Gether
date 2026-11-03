'use client';

import React, { useState, useEffect } from 'react';
import { Video, X, Link, ArrowRight } from 'lucide-react';

interface ChangeVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitUrl: (url: string) => void;
  canControl: boolean;
}

export function ChangeVideoModal({
  isOpen,
  onClose,
  onSubmitUrl,
  canControl,
}: ChangeVideoModalProps) {
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    onSubmitUrl(urlInput.trim());
    setUrlInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in-0 duration-150">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-2xl bg-[#121317] border border-white/10 p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-left"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.07] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Change Video</h3>
              <p className="text-[11px] text-zinc-400">
                {canControl
                  ? 'Paste any YouTube URL or video ID to play for everyone'
                  : 'Only Host and Moderators can change the video'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
              YouTube URL or Video ID
            </label>
            <div className="relative">
              <Link className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={!canControl}
                autoFocus
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canControl || !urlInput.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-400 to-emerald-400 hover:brightness-110 active:scale-95 text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-teal-500/20"
            >
              <span>Load Video</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
