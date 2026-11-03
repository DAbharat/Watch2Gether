'use client';

import React, { useState, useRef } from 'react';
import { Copy, Check, LogOut, Video, X } from 'lucide-react';
import { ParticipantData } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarForUser } from '@/lib/avatars';

interface RoomHeaderProps {
  roomId: string;
  hostParticipant?: ParticipantData;
  participants: ParticipantData[];
  isConnected: boolean;
  canControl: boolean;
  copied: boolean;
  onCopyRoomLink: () => void;
  onSubmitUrl: (url: string) => void;
  onLeaveRoom: () => void;
}

export function RoomHeader({
  roomId,
  hostParticipant,
  participants,
  isConnected,
  canControl,
  copied,
  onCopyRoomLink,
  onSubmitUrl,
  onLeaveRoom,
}: RoomHeaderProps) {
  const hostName = hostParticipant?.username || 'Host';
  const hostAvatar = getAvatarForUser(hostParticipant, participants);

  const [isInputOpen, setIsInputOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggleOrSubmit = () => {
    if (!isInputOpen) {
      setIsInputOpen(true);
      setTimeout(() => inputRef.current?.focus(), 150);
      return;
    }

    if (urlInput.trim()) {
      onSubmitUrl(urlInput.trim());
      setUrlInput('');
      setIsInputOpen(false);
    } else {
      setIsInputOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleToggleOrSubmit();
    } else if (e.key === 'Escape') {
      setIsInputOpen(false);
      setUrlInput('');
    }
  };

  return (
    <header className="w-full flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.06] shrink-0 bg-[#121316]">
      {/* Left: Avatar + Host Name + 'Host' subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar size="lg" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/10 shadow shrink-0">
          <AvatarImage src={hostAvatar} alt={hostName} className="object-cover" />
          <AvatarFallback className="bg-teal-500/20 text-teal-300 font-bold text-sm">
            {hostName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-zinc-100 truncate leading-tight">
            {hostName}
          </span>
          <span className="text-[11px] text-zinc-400 font-medium leading-tight">
            Host
          </span>
        </div>
      </div>

      {/* Right: Add New Video with LHS expanding input + Room Code + Leave Button */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Room Code Badge & Copy */}
        <button
          onClick={onCopyRoomLink}
          title="Copy room invite link"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/[0.04] text-xs font-medium text-zinc-300 transition-all cursor-pointer"
        >
          <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Room:</span>
          <span className="font-mono text-zinc-200">{roomId}</span>
          {copied ? (
            <Check className="w-3.5 h-3.5 text-teal-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </button>

        {/* Add New Video with LHS expanding input */}
        <div className="flex items-center">
          {/* LHS Expanding Input Box */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out flex items-center ${
              isInputOpen ? 'w-60 sm:w-72 opacity-100 mr-2' : 'w-0 opacity-0 pointer-events-none'
            }`}
          >
            <div className="relative w-full flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste YouTube video URL..."
                className="w-full bg-[#1b1c22] border border-teal-500/50 focus:border-teal-400 rounded-xl px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none pr-7 shadow-lg"
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={() => setUrlInput('')}
                  className="absolute right-2 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Add New Video Button (Teal accent, NO yellow) */}
          <button
            type="button"
            onClick={handleToggleOrSubmit}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-teal-400 to-emerald-400 hover:brightness-110 active:scale-95 text-black shadow-md shadow-teal-500/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            title={isInputOpen && urlInput.trim() ? 'Load video' : 'Add new video'}
          >
            <Video className="w-3.5 h-3.5 fill-black text-black" />
            <span>{isInputOpen && urlInput.trim() ? 'Add' : 'Add New Video'}</span>
          </button>
        </div>

        {/* Leave Room Button */}
        <button
          onClick={onLeaveRoom}
          title="Leave Watch Party"
          className="p-1.5 sm:p-2 rounded-xl border border-white/10 hover:border-rose-500/30 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
