'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, Gift, Users, Send, Smile, X
} from 'lucide-react';
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
  onSendReaction: (emoji: string) => void;
  onOpenParticipants: () => void;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
}

const QUICK_REACTION_PILLS = ['😡', '😋', '😱', '😂'];

const EMOJI_PICKER_LIST = [
  '😀', '😂', '🤣', '😍', '🤩', '😘', '😋', '😜', '🤪', '🤗',
  '🤔', '🤫', '🙄', '😴', '🥳', '😎', '🤓', '😡', '😱', '🤯',
  '🔥', '❤️', '👏', '🎉', '🚀', '🍿', '🎬', '⚡', '💯', '✨'
];

export function ChatBox({
  messages,
  participants,
  currentSocketId,
  chatInput,
  onChatInputChange,
  onSendMessage,
  onSendReaction,
  onOpenParticipants,
  chatBottomRef,
}: ChatBoxProps) {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close emoji picker on click outside or escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsEmojiPickerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectEmoji = (emoji: string) => {
    onChatInputChange(chatInput + emoji);
    inputRef.current?.focus();
  };

  const handleQuickGift = () => {
    onSendReaction('🎁');
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#16171d] overflow-hidden select-none">
      {/* 1. Header: Chat icon + Chat title, and action buttons on right */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between shrink-0 bg-[#16171d]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-teal-400 fill-teal-400/20" />
          <h2 className="text-sm font-bold text-zinc-100 tracking-wide">Chat</h2>
        </div>

        {/* Header Action Buttons matching screenshot */}
        <div className="flex items-center gap-1.5">
          {/* Gift reaction button */}
          <button
            onClick={handleQuickGift}
            title="Send celebration gift"
            className="p-1.5 rounded-lg hover:bg-teal-500/10 text-teal-400 hover:text-teal-300 transition-all cursor-pointer"
          >
            <Gift className="w-4 h-4" />
          </button>

          {/* Participants list button */}
          <button
            onClick={onOpenParticipants}
            title="View participants & roles"
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
          >
            <Users className="w-4 h-4" />
            <span className="text-[11px] font-mono font-medium text-zinc-400">
              {participants.length}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Message Feed: Senders on right, others on left */}
      <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs py-8">
            <MessageSquare className="w-8 h-8 stroke-1 text-zinc-600 mb-2" />
            <p className="font-medium text-zinc-400">No messages yet</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">Start the conversation</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.userId === currentSocketId;
            const avatarUrl = getAvatarForUser(
              { userId: m.userId, username: m.username, avatar: m.avatar },
              participants
            );

            // Pseudo sequence / reaction code like 2410, 3430, 269 in screenshot
            const messageCode = Math.abs((m.timestamp % 9000) + 1000);

            return (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 ${
                  isMe ? 'justify-end flex-row-reverse' : 'justify-start'
                }`}
              >
                {/* User Avatar */}
                <Avatar size="sm" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 mt-0.5 border border-white/10 shadow">
                  <AvatarImage src={avatarUrl} alt={m.username} className="object-cover" />
                  <AvatarFallback className="bg-white/[0.06] text-zinc-300 font-semibold text-[11px]">
                    {m.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Message Bubble + Meta */}
                <div className={`flex flex-col max-w-[78%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2">
                    {/* If message is mine, show code on the left */}
                    {isMe && (
                      <span className="text-[10px] text-zinc-600 font-mono select-none">
                        {messageCode}
                      </span>
                    )}

                    {/* Chat Bubble */}
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                        isMe
                          ? 'bg-[#142d27] border border-teal-500/30 text-teal-100 rounded-tr-xs'
                          : 'bg-[#23242a] text-zinc-100 rounded-tl-xs'
                      }`}
                    >
                      {m.text}
                    </div>

                    {/* If message is from others, show code on the right */}
                    {!isMe && (
                      <span className="text-[10px] text-zinc-600 font-mono select-none">
                        {messageCode}
                      </span>
                    )}
                  </div>

                  {/* Username label below bubble exactly like the screenshot */}
                  <span
                    className={`text-[10px] text-zinc-500 mt-1 px-1 font-medium ${
                      isMe ? 'text-right' : 'text-left'
                    }`}
                  >
                    {isMe ? 'You' : m.username}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* 3. Bottom: Floating Reaction Pill + Type Box with Emoticon picker */}
      <div className="p-3 border-t border-white/[0.06] bg-[#16171d] shrink-0 relative">
        {/* Floating Quick Reaction Pill right above the input box (matching image 2) */}
        <div className="flex justify-end mb-2 pr-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#24252c] border border-white/10 shadow-lg backdrop-blur-md">
            {QUICK_REACTION_PILLS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onSendReaction(emoji)}
                className="hover:scale-125 transition-transform text-sm cursor-pointer p-0.5 leading-none"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Emoticon Picker Popup */}
        {isEmojiPickerOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsEmojiPickerOpen(false)}
            />
            <div className="absolute right-3 bottom-16 z-50 w-64 rounded-2xl bg-[#1f2027] border border-white/10 p-3 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                <span className="text-[11px] font-semibold text-zinc-300">Emoticons</span>
                <button
                  type="button"
                  onClick={() => setIsEmojiPickerOpen(false)}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-6 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {EMOJI_PICKER_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectEmoji(emoji)}
                    className="p-1.5 text-base hover:bg-white/[0.08] rounded-lg transition-transform hover:scale-120 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Type Comment Box with Send & Emoticon Buttons */}
        <form
          onSubmit={onSendMessage}
          className="relative flex items-center bg-[#202127] border border-white/[0.08] focus-within:border-teal-500/50 rounded-2xl px-3 py-1.5 transition-all shadow-inner"
        >
          <input
            ref={inputRef}
            type="text"
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            placeholder="Type comment"
            maxLength={200}
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none pr-2 py-1"
          />

          {/* Right inside actions: Send button + Emoticon button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Send button */}
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-1.5 rounded-lg text-teal-400 hover:text-teal-300 disabled:opacity-30 disabled:text-zinc-500 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>

            {/* Emoticon smiley button */}
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isEmojiPickerOpen
                  ? 'text-teal-400 bg-teal-500/10'
                  : 'text-zinc-400 hover:text-teal-400'
              }`}
              title="Add emoticon"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
