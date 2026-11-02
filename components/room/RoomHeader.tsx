'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Play, Copy, Check, LogOut } from 'lucide-react';
import { Role } from '@/lib/types';
import { RoleBadge } from '@/lib/roles';

interface RoomHeaderProps {
  roomId: string;
  isConnected: boolean;
  userRole: Role;
  copied: boolean;
  onCopyRoomLink: () => void;
  onLeaveRoom: () => void;
}

export function RoomHeader({
  roomId,
  isConnected,
  userRole,
  copied,
  onCopyRoomLink,
  onLeaveRoom,
}: RoomHeaderProps) {
  const router = useRouter();

  return (
    <header className="relative z-30 border-b border-white/[0.06] bg-[#05090a]/80 backdrop-blur-md sticky top-0 px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          <div className="w-5 h-5 rounded-md bg-white/[0.06] border border-white/10 flex items-center justify-center">
            <Play className="w-2.5 h-2.5 text-zinc-200 fill-zinc-200 ml-0.2" />
          </div>
          <span>Watch<span className="text-zinc-400 font-normal">2</span>Gether</span>
        </button>

        <div className="h-3.5 w-px bg-white/[0.08]" />

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-xs font-mono text-zinc-400">
          <span className="text-zinc-500 text-[11px]">Room:</span>
          <span className="font-medium text-zinc-300">{roomId}</span>
          <button
            onClick={onCopyRoomLink}
            title="Copy room link"
            className="text-zinc-500 hover:text-zinc-200 transition-colors ml-0.5 cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-teal-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-teal-400' : 'bg-zinc-600'
            }`}
          />
          <span className="hidden sm:inline text-[11px] font-mono text-zinc-400">
            {isConnected ? 'Live Sync' : 'Reconnecting'}
          </span>
        </div>

        <RoleBadge role={userRole} />

        <button
          onClick={onLeaveRoom}
          className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors cursor-pointer"
          title="Leave room"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
