'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, X, Check } from 'lucide-react';

interface SetUsernameModalProps {
  isOpen: boolean;
  currentUsername: string;
  onSave: (newName: string) => void;
  onClose: () => void;
}

export function SetUsernameModal({
  isOpen,
  currentUsername,
  onSave,
  onClose,
}: SetUsernameModalProps) {
  const [nameInput, setNameInput] = useState(currentUsername);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameInput(currentUsername);
  }, [currentUsername, isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Focus and highlight text so the user can easily replace the default User_XXXX name
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
    const clean = nameInput.trim();
    if (!clean) return;
    onSave(clean);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in-0 duration-150">
      {/* Backdrop */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      {/* Frosted Glass Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-sm rounded-3xl glass-white-card p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-left text-white"
      >
        {/* Top Header with Icon and Close Button */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/20 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-sm shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-snug">
                Wanna add a name for the watch party?
              </h3>
              <p className="text-[11px] text-white/70 mt-0.5 leading-tight">
                Choose a display name so others in the room know who you are.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-white/80 uppercase tracking-wider mb-1.5 px-1">
              Your Display Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Alex"
              maxLength={25}
              className="w-full glass-white-input rounded-full px-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#F05A65]/70 shadow-inner font-medium"
            />
          </div>

          {/* Action Buttons: Cancel and Save */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="glass-white-pill px-4 py-2 rounded-full text-xs font-semibold text-white/80 hover:text-white active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="px-5 py-2 rounded-full bg-[#F05A65] hover:bg-[#FF7180] disabled:opacity-40 text-xs font-bold text-white shadow-lg shadow-red-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

