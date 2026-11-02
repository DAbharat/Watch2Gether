'use client';

import React from 'react';
import { Send, UserMinus } from 'lucide-react';
import { Role, ParticipantData, ChatMessage } from '@/lib/types';
import { RoleIcon } from '@/lib/roles';

interface RoomSidebarProps {
  activeTab: 'chat' | 'participants';
  onTabChange: (tab: 'chat' | 'participants') => void;
  messages: ChatMessage[];
  participants: ParticipantData[];
  currentSocketId: string;
  isHost: boolean;
  chatInput: string;
  onChatInputChange: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onSendReaction: (emoji: string) => void;
  onAssignRole: (userId: string, role: Role) => void;
  onRemoveUser: (userId: string) => void;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
}

const REACTION_EMOJIS = ['🔥', '❤️', '😂', '👏', '🚀'];

export function RoomSidebar({
  activeTab,
  onTabChange,
  messages,
  participants,
  currentSocketId,
  isHost,
  chatInput,
  onChatInputChange,
  onSendMessage,
  onSendReaction,
  onAssignRole,
  onRemoveUser,
  chatBottomRef,
}: RoomSidebarProps) {
  return (
    <div className="h-full flex flex-col rounded-xl bg-white/[0.025] border border-white/[0.07] overflow-hidden">
      {/* Tabs Header with Underline for Active Tab */}
      <div className="flex border-b border-white/[0.06] px-4 gap-6 bg-transparent shrink-0">
        <button
          onClick={() => onTabChange('chat')}
          className={`pb-2.5 pt-3 text-xs font-medium relative transition-colors ${
            activeTab === 'chat'
              ? 'text-zinc-100 font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span>Chat ({messages.length})</span>
          {activeTab === 'chat' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-teal-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => onTabChange('participants')}
          className={`pb-2.5 pt-3 text-xs font-medium relative transition-colors ${
            activeTab === 'participants'
              ? 'text-zinc-100 font-semibold'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span>Participants ({participants.length})</span>
          {activeTab === 'participants' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-teal-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Chat Tab Panel */}
      {activeTab === 'chat' && (
        <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
          {/* Scrollable messages */}
          <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs py-8">
                <p>No messages yet</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">Start the conversation</p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="flex flex-col gap-0.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-zinc-300">{m.username}</span>
                    {m.role === 'host' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.05] text-zinc-200 border border-white/10 inline-flex items-center gap-1">
                        <RoleIcon role="host" size={11} strokeWidth={1.75} />
                        <span>Host</span>
                      </span>
                    )}
                    {m.role === 'moderator' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.03] text-zinc-400 border border-white/[0.07] inline-flex items-center gap-1">
                        <RoleIcon role="moderator" size={11} strokeWidth={1.75} />
                        <span>Mod</span>
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500 font-mono ml-auto">
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-zinc-300 bg-white/[0.02] p-2 rounded-lg border border-white/[0.04] break-words text-xs">
                    {m.text}
                  </p>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Pinned Bottom: Quick Reactions + Chat Input */}
          <div className="border-t border-white/[0.06] bg-black/20 shrink-0">
            {/* Quick Reactions */}
            <div className="px-3 pt-2 pb-1 flex items-center justify-around">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSendReaction(emoji)}
                  className="p-1 hover:scale-120 transition-transform text-sm opacity-70 hover:opacity-100"
                  title={`Send ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Message input */}
            <form onSubmit={onSendMessage} className="p-3 pt-1 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => onChatInputChange(e.target.value)}
                placeholder="Type a message..."
                maxLength={200}
                className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.07] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-white/20 transition-colors"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-zinc-200 disabled:opacity-30 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Participants Tab Panel */}
      {activeTab === 'participants' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {participants.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-xs py-8">
              <p>No active participants</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {participants.map((p) => {
                const isMe = p.socketId === currentSocketId;
                const isUserHost = p.role === 'host';

                return (
                  <div
                    key={p.socketId}
                    className="group px-4 py-3 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.015] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Neutral avatar circle */}
                      <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-zinc-300 font-semibold text-[11px] shrink-0">
                        {p.username.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <p className="font-medium text-zinc-200 truncate flex items-center gap-1.5">
                          <span>{p.username}</span>
                          {isMe && (
                            <span className="text-[10px] text-zinc-500 font-normal">
                              (You)
                            </span>
                          )}
                        </p>

                        <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <RoleIcon
                            role={p.role}
                            size={12}
                            strokeWidth={1.75}
                            className={isUserHost ? 'text-zinc-300' : 'text-zinc-500'}
                          />
                          <span className={isUserHost ? 'text-zinc-300' : 'text-zinc-500'}>
                            {p.role === 'host'
                              ? 'Host'
                              : p.role === 'moderator'
                              ? 'Moderator'
                              : 'Viewer'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Host Moderation Actions (ghost icon buttons visible on hover) */}
                    {isHost && !isMe && (
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        {p.role === 'participant' ? (
                          <button
                            onClick={() => onAssignRole(p.socketId, 'moderator')}
                            className="px-2 py-0.5 rounded text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] border border-white/[0.08] transition-colors"
                            title="Promote to Moderator"
                          >
                            + Mod
                          </button>
                        ) : p.role === 'moderator' ? (
                          <button
                            onClick={() => onAssignRole(p.socketId, 'participant')}
                            className="px-2 py-0.5 rounded text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] border border-white/[0.08] transition-colors"
                            title="Demote to Viewer"
                          >
                            - Demote
                          </button>
                        ) : null}

                        {/* Destructive remove action (neutral gray by default, turns red on hover) */}
                        <button
                          onClick={() => onRemoveUser(p.socketId)}
                          className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Remove user"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
