'use client';

import React, { useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { ChatMessage, ParticipantData } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarForUser } from '@/lib/avatars';

interface ChatBoxProps {
  messages: ChatMessage[];
  participants: ParticipantData[];
  currentSocketId: string;
  chatInput: string;
  onChatInputChange: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onSendReaction?: (emoji: string) => void;
  onOpenParticipants?: () => void;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
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

export function ChatBox({
  messages,
  participants,
  currentSocketId,
  chatInput,
  onChatInputChange,
  onSendMessage,
  chatBottomRef,
}: ChatBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full flex-1 min-h-[220px] glass-white-card rounded-2xl sm:rounded-3xl p-4 flex flex-col shadow-xl overflow-hidden mt-3 select-none">
      {/* 1. Header: Chat icon + Chat title matching screenshot */}
      <div className="flex items-center gap-2 pb-3 border-b border-white/20 shrink-0">
        <MessageSquare className="w-4 h-4 text-white" />
        <h3 className="text-sm font-bold text-white tracking-wide">Chat</h3>
      </div>

      {/* 2. Message Feed matching screenshot layout */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pt-3 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/60 text-xs py-8">
            <MessageSquare className="w-7 h-7 stroke-1 text-white/40 mb-2" />
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
                {/* Avatar with green dot */}
                <div className="relative shrink-0 mt-0.5">
                  <Avatar size="sm" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/30 shadow">
                    <AvatarImage src={avatarUrl} alt={m.username} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-pink-500 text-white font-bold text-xs">
                      {m.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black/80" />
                </div>

                {/* Message Content: Header with name + time, then message text */}
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

      {/* 3. Bottom Pill Input with Coral Send Button matching screenshot */}
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

        {/* Coral Send Button matching screenshot */}
        <button
          type="submit"
          disabled={!chatInput.trim()}
          className="absolute right-1.5 p-2 rounded-full bg-[#F05A65] hover:bg-[#FF7180] text-white shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center"
          title="Send message"
        >
          <Send className="w-3.5 h-3.5 fill-white text-white" />
        </button>
      </form>
    </div>
  );
}
