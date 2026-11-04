'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Users, Send, Mic, MoreVertical } from 'lucide-react';
import { ChatMessage, ParticipantData } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarForUser } from '@/lib/avatars';

interface RoomSidebarProps {
  messages: ChatMessage[];
  participants: ParticipantData[];
  currentSocketId: string;
  isHost: boolean;
  chatInput: string;
  onChatInputChange: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onOpenModal?: () => void;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
  defaultTab?: 'chat' | 'participants';
}

function formatMessageTime(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function RoomSidebar({
  messages,
  participants,
  currentSocketId,
  isHost,
  chatInput,
  onChatInputChange,
  onSendMessage,
  onOpenModal,
  chatBottomRef,
  defaultTab = 'chat',
}: RoomSidebarProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>(defaultTab);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat to bottom when messages update and chat is active
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, chatBottomRef]);

  return (
    <div className="w-full h-full glass-white-card rounded-2xl sm:rounded-3xl p-4 flex flex-col shadow-xl overflow-hidden select-none">
      {/* 1. Header with Tab Switcher */}
      <div className="flex items-center justify-between pb-3 border-b border-white/20 shrink-0">
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/10 border border-white/15">
          {/* Chat Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-white/25 text-white shadow-sm backdrop-blur-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
            {messages.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                {messages.length}
              </span>
            )}
          </button>

          {/* Participants Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTab('participants')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'participants'
                ? 'bg-white/25 text-white shadow-sm backdrop-blur-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Participants</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
              {participants.length}
            </span>
          </button>
        </div>

        {/* Action Button: Open Full Modal if needed */}
        {onOpenModal && (
          <button
            type="button"
            onClick={onOpenModal}
            title="Manage participants"
            className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Body View: Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
          {/* Scrollable Messages Feed */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pt-3 pr-1">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/60 text-xs py-12">
                <MessageSquare className="w-8 h-8 stroke-1 text-white/40 mb-2" />
                <p className="font-semibold text-white/90 text-xs">No messages yet</p>
                <p className="text-[11px] text-white/60 mt-0.5">Be the first to say hi!</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.userId === currentSocketId;
                const avatarUrl = getAvatarForUser(
                  { userId: m.userId, username: m.username, avatar: m.avatar },
                  participants
                );
                const timeString = formatMessageTime(m.timestamp);

                return (
                  <div key={m.id} className="flex items-start gap-2.5">
                    {/* Avatar with green online dot */}
                    <div className="relative shrink-0 mt-0.5">
                      <Avatar size="sm" className="w-8 h-8 rounded-full border border-white/30 shadow">
                        <AvatarImage src={avatarUrl} alt={m.username} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-pink-500 text-white font-bold text-xs">
                          {m.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black/80" />
                    </div>

                    {/* Content: Username + Time + Message */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-white truncate">
                          {isMe ? 'You' : m.username}
                        </span>
                        <span className="text-[10px] text-white/60 font-normal shrink-0">
                          {timeString}
                        </span>
                      </div>
                      <p className="text-xs text-white/95 leading-relaxed font-normal mt-0.5 break-words">
                        {m.text}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Bottom Pill Input with Coral Send Button */}
          <form
            onSubmit={onSendMessage}
            className="relative flex items-center glass-white-input rounded-full px-4 py-1.5 mt-3 shadow-inner shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              placeholder="Type a message..."
              maxLength={250}
              className="flex-1 bg-transparent text-xs text-white placeholder-white/60 outline-none pr-9 py-1 font-medium"
            />

            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="absolute right-1.5 w-7 h-7 rounded-full bg-[#F05A65] hover:bg-[#FF7180] disabled:opacity-40 disabled:hover:bg-[#F05A65] flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shadow-md shadow-red-500/20"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* 3. Body View: Participants Tab */}
      {activeTab === 'participants' && (
        <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
          {/* Scrollable Participants Roster */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pt-3 pr-1">
            {participants.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/60 text-xs py-12">
                <Users className="w-8 h-8 stroke-1 text-white/40 mb-2" />
                <p className="font-semibold text-white/90 text-xs">No active participants</p>
              </div>
            ) : (
              participants.map((p) => {
                const isMe = p.socketId === currentSocketId || p.userId === currentSocketId;
                const avatarUrl = getAvatarForUser(p, participants);
                const isHostUser = p.role === 'host';
                const isModUser = p.role === 'moderator';

                return (
                  <div
                    key={p.userId || p.socketId}
                    className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-white/[0.08] transition-colors"
                  >
                    {/* Left: Avatar with green online dot + username + role tag */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar size="sm" className="w-8 h-8 rounded-full border border-white/30 shadow">
                          <AvatarImage src={avatarUrl} alt={p.username} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-pink-500 text-white font-bold text-xs">
                            {p.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Online indicator dot */}
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

                    {/* Right: Microphone icon */}
                    <div className="shrink-0 text-white/50 pl-2">
                      <Mic className="w-4 h-4 text-white/60 hover:text-white transition-colors cursor-pointer" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Roster Footer for Hosts */}
          {isHost && onOpenModal && (
            <div className="pt-3 border-t border-white/15 shrink-0">
              <button
                type="button"
                onClick={onOpenModal}
                className="w-full glass-white-pill py-2 rounded-full text-xs font-semibold text-white hover:bg-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Manage Permissions & Roster</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
