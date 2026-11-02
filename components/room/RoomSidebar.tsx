'use client';

import React, { useState, useEffect } from 'react';
import { Send, UserMinus, MoreVertical, ShieldCheck, Eye } from 'lucide-react';
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

interface DialogState {
  isOpen: boolean;
  type: 'role' | 'remove';
  targetUser: ParticipantData | null;
  targetRole?: Role;
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
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    type: 'role',
    targetUser: null,
  });

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuUserId(null);
        setDialogState({ isOpen: false, type: 'role', targetUser: null });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openRoleDialog = (user: ParticipantData) => {
    const nextRole: Role = user.role === 'moderator' ? 'participant' : 'moderator';
    setDialogState({
      isOpen: true,
      type: 'role',
      targetUser: user,
      targetRole: nextRole,
    });
  };

  const openRemoveDialog = (user: ParticipantData) => {
    setDialogState({
      isOpen: true,
      type: 'remove',
      targetUser: user,
    });
  };

  const handleConfirmAction = () => {
    if (!dialogState.targetUser) return;

    if (dialogState.type === 'role' && dialogState.targetRole) {
      onAssignRole(dialogState.targetUser.socketId, dialogState.targetRole);
    } else if (dialogState.type === 'remove') {
      onRemoveUser(dialogState.targetUser.socketId);
    }

    setDialogState({ isOpen: false, type: 'role', targetUser: null });
  };

  return (
    <>
      <div className="h-full flex flex-col rounded-xl bg-white/[0.025] border border-white/[0.07] overflow-hidden">
        {/* Tabs Header with Underline for Active Tab */}
        <div className="flex border-b border-white/[0.06] px-4 gap-6 bg-transparent shrink-0">
          <button
            onClick={() => onTabChange('chat')}
            className={`pb-2.5 pt-3 text-xs font-medium relative transition-colors cursor-pointer ${
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
            className={`pb-2.5 pt-3 text-xs font-medium relative transition-colors cursor-pointer ${
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
                    className="p-1 hover:scale-120 transition-transform text-sm opacity-70 hover:opacity-100 cursor-pointer"
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
                  className="p-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-zinc-200 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
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
                  const isMenuOpen = activeMenuUserId === p.socketId;

                  return (
                    <div
                      key={p.socketId}
                      className="group px-4 py-3 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.015] transition-colors relative"
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

                      {/* 3-Dots Button & Popover Menu for Host */}
                      {isHost && !isMe && (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActiveMenuUserId(isMenuOpen ? null : p.socketId)
                            }
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isMenuOpen
                                ? 'bg-white/[0.1] text-zinc-100'
                                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06]'
                            }`}
                            title="Member options"
                            aria-expanded={isMenuOpen}
                          >
                            <MoreVertical className="w-4 h-4" strokeWidth={1.75} />
                          </button>

                          {/* Popover Menu */}
                          {isMenuOpen && (
                            <>
                              {/* Invisible backdrop to dismiss popover when clicking outside */}
                              <div
                                className="fixed inset-0 z-20 cursor-pointer"
                                onClick={() => setActiveMenuUserId(null)}
                              />

                              <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-xl bg-[#090d12] border border-white/10 p-1 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-100">
                                {/* Option 1: Make Moderator / Demote */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuUserId(null);
                                    openRoleDialog(p);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                                >
                                  {p.role === 'moderator' ? (
                                    <>
                                      <Eye className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.75} />
                                      <span>Demote to Viewer</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.75} />
                                      <span>Make Moderator</span>
                                    </>
                                  )}
                                </button>

                                <div className="my-1 h-px bg-white/[0.06]" />

                                {/* Option 2: Remove Member */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuUserId(null);
                                    openRemoveDialog(p);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-zinc-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                                >
                                  <UserMinus className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                                  <span>Remove Member</span>
                                </button>
                              </div>
                            </>
                          )}
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

      {/* Alert Dialog (in black) for Confirming Actions */}
      {dialogState.isOpen && dialogState.targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-150">
          {/* Backdrop click to cancel */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() =>
              setDialogState({ isOpen: false, type: 'role', targetUser: null })
            }
          />

          <div
            role="alertdialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-2xl bg-[#080c0d] border border-white/10 p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150 text-left"
          >
            <div className="mb-5">
              <h3 className="text-base font-semibold text-zinc-100">
                {dialogState.type === 'role'
                  ? dialogState.targetRole === 'moderator'
                    ? 'Make Moderator'
                    : 'Demote to Viewer'
                  : 'Remove Member'}
              </h3>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                {dialogState.type === 'role'
                  ? dialogState.targetRole === 'moderator'
                    ? `Are you sure you want to make ${dialogState.targetUser.username} a moderator? They will be granted controls to play, pause, seek, and change videos for everyone.`
                    : `Are you sure you want to demote ${dialogState.targetUser.username} to a viewer? They will no longer be able to control playback or change videos.`
                  : `Are you sure you want to remove ${dialogState.targetUser.username} from the watch party? They will be disconnected from this room immediately.`}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() =>
                  setDialogState({ isOpen: false, type: 'role', targetUser: null })
                }
                className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  dialogState.type === 'remove'
                    ? 'bg-rose-500 hover:bg-rose-400 text-white'
                    : 'bg-teal-400 hover:bg-teal-300 text-black'
                }`}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
