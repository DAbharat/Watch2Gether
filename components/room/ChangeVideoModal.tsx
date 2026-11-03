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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in-0 duration-150">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-3xl glass-white-card p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-left text-white"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/20 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-sm">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Change Video</h3>
              <p className="text-[11px] text-white/70">
                {canControl
                  ? 'Paste any YouTube URL or video ID to play for everyone'
                  : 'Only Host and Moderators can change the video'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-white/90 block mb-1.5">
              YouTube URL or Video ID
            </label>
            <div className="relative">
              <Link className="w-4 h-4 text-white/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={!canControl}
                autoFocus
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full glass-white-input text-xs text-white placeholder-white/50 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="glass-white-pill px-4 py-2 rounded-full text-xs font-semibold text-white transition-all cursor-pointer shadow-sm"
            >
              Cancel
            </button>
            {/* Coral accent button like Leave Room with white text */}
            <button
              type="submit"
              disabled={!canControl || !urlInput.trim()}
              className="px-5 py-2 rounded-full text-xs font-bold bg-[#F05A65] hover:bg-[#FF7180] active:scale-95 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-500/25"
            >
              <span>Load Video</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
