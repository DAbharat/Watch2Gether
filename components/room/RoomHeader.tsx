'use client';

import React from 'react';
import { Play, Link2, Users, LogOut, Check, Home } from 'lucide-react';
import { ParticipantData } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface RoomHeaderProps {
  roomId: string;
  hostParticipant?: ParticipantData;
  currentUser?: ParticipantData;
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
  currentUser,
  participants,
  copied,
  onCopyRoomLink,
  onLeaveRoom,
}: RoomHeaderProps) {
  const hostName = hostParticipant?.username || 'Host';
  const currentUserName = currentUser?.username || 'You';

  return (
    <div className="w-full shrink-0 flex flex-col mb-2.5 sm:mb-3">
      {/* Room Banner Card: Party Title + Invite Friends + Leave Room */}
      <div className="w-full glass-white-card rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 flex items-center justify-between gap-4 shadow-xl shrink-0">
        {/* Left: Party Title + Meta */}
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate leading-snug">
                {hostName}&apos;s Watch Party
              </h1>
              <button
                onClick={onCopyRoomLink}
                title="Copy room link"
                className="text-white/70 hover:text-white transition-colors cursor-pointer p-0.5"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Link2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <p className="text-[11px] sm:text-xs text-white/80 font-normal leading-tight mt-0.5">
              Room: {roomId} &bull; {participants.length}{' '}
              {participants.length === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>

        {/* Right: Invite Friends & Leave Room matching screenshot */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Invite Friends Button */}
          <button
            onClick={onCopyRoomLink}
            title="Invite friends"
            className="glass-white-pill flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold text-white shadow-md transition-all cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Users className="w-3.5 h-3.5 text-white" />
            )}
            <span className="hidden sm:inline">{copied ? 'Link Copied!' : 'Invite Friends'}</span>
            <span className="sm:hidden">{copied ? 'Copied' : 'Invite'}</span>
          </button>

          {/* Leave Room Button matching screenshot (Coral color) */}
          <button
            onClick={onLeaveRoom}
            title="Leave room"
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-[#F05A65] hover:bg-[#FF7180] text-xs font-bold text-white shadow-lg shadow-red-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-white" />
            <span>Leave Room</span>
          </button>
        </div>
      </div>
    </div>
  );
}
