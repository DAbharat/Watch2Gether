'use client';

import React from 'react';
import { Users, Mic, MoreVertical } from 'lucide-react';
import { ParticipantData } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarForUser } from '@/lib/avatars';

interface ParticipantsCardProps {
  participants: ParticipantData[];
  currentSocketId: string;
  isHost: boolean;
  onOpenModal?: () => void;
}

export function ParticipantsCard({
  participants,
  currentSocketId,
  isHost,
  onOpenModal,
}: ParticipantsCardProps) {
  return (
    <div className="w-full h-[38%] min-h-[170px] max-h-[240px] glass-white-card rounded-2xl sm:rounded-3xl p-4 flex flex-col shadow-xl overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/20 shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-white" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Participants ({participants.length})
          </h3>
        </div>

        {onOpenModal && (
          <button
            onClick={onOpenModal}
            title="Manage participants"
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable Participants List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pt-3 pr-1">
        {participants.map((p) => {
          const isMe = p.socketId === currentSocketId;
          const avatarUrl = getAvatarForUser(p, participants);
          const isHostUser = p.role === 'host';
          const isModUser = p.role === 'moderator';

          return (
            <div
              key={p.socketId}
              className="flex items-center justify-between py-1 px-1.5 rounded-xl hover:bg-white/[0.08] transition-colors"
            >
              {/* Left: Avatar with green online dot + username + role tag */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <Avatar size="sm" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/30 shadow">
                    <AvatarImage src={avatarUrl} alt={p.username} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-pink-500 text-white font-bold text-xs">
                      {p.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator dot matching screenshot */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black/80" />
                </div>

                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-semibold text-white truncate">
                    {p.username}
                  </span>
                  {isMe && (
                    <span className="text-[10px] text-white/60 font-normal shrink-0">
                      (You)
                    </span>
                  )}
                  {isHostUser && (
                    <span className="text-[11px] text-[#F05A65] font-semibold shrink-0">
                      Host
                    </span>
                  )}
                  {isModUser && (
                    <span className="text-[11px] text-blue-300 font-semibold shrink-0">
                      Mod
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Microphone icon matching screenshot */}
              <div className="shrink-0 text-white/50 pl-2">
                <Mic className="w-4 h-4 text-white/60 hover:text-white transition-colors cursor-pointer" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

