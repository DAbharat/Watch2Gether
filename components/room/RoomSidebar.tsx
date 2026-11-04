'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  Send,
  MoreVertical,
  ShieldCheck,
  Eye,
  Crown,
  UserMinus,
} from 'lucide-react';
import { ChatMessage, ParticipantData, Role } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarForUser } from '@/lib/avatars';
import { RoleBadge } from '@/lib/roles';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface RoomSidebarProps {
  messages: ChatMessage[];
  participants: ParticipantData[];
  currentSocketId: string;
  isHost: boolean;
  isModerator?: boolean;
  chatInput: string;
  onChatInputChange: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onSendReaction?: (emoji: string) => void;
  onAssignRole?: (userId: string, role: Role) => void;
  onTransferHost?: (userId: string) => void;
  onRemoveUser?: (userId: string) => void;
  onOpenModal?: () => void;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
  defaultTab?: 'chat' | 'participants';
}

const QUICK_REACTIONS = ['😡', '😃', '😱', '😆', '❤️'];

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
  isModerator = false,
  chatInput,
  onChatInputChange,
  onSendMessage,
  onSendReaction,
  onAssignRole,
  onTransferHost,
  onRemoveUser,
  onOpenModal,
  chatBottomRef,
  defaultTab = 'chat',
}: RoomSidebarProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>(defaultTab);
  const inputRef = useRef<HTMLInputElement>(null);

  const myParticipant = participants.find(
    (p) => (currentSocketId && p.socketId === currentSocketId) || (currentSocketId && p.userId === currentSocketId)
  );
  const myRole = myParticipant?.role || (isHost ? 'host' : 'participant');
  const isMod = isModerator || myRole === 'moderator';
  const canModerate = isHost || isMod;

  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    type: 'promote_mod' | 'demote' | 'transfer_host' | 'remove';
    targetUser: ParticipantData | null;
  }>({
    isOpen: false,
    type: 'promote_mod',
    targetUser: null,
  });

  // Auto-scroll chat to bottom when messages update and chat is active
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, chatBottomRef]);

  const handleConfirm = () => {
    if (!confirmAction.targetUser) return;
    const targetId = confirmAction.targetUser.userId || confirmAction.targetUser.socketId;

    if (confirmAction.type === 'promote_mod') {
      onAssignRole?.(targetId, 'moderator');
    } else if (confirmAction.type === 'demote') {
      onAssignRole?.(targetId, 'participant');
    } else if (confirmAction.type === 'transfer_host') {
      if (onTransferHost) {
        onTransferHost(targetId);
      } else {
        onAssignRole?.(targetId, 'host');
      }
    } else if (confirmAction.type === 'remove') {
      onRemoveUser?.(targetId);
    }

    setConfirmAction({ isOpen: false, type: 'promote_mod', targetUser: null });
  };

  return (
    <>
      <div className="w-full h-full glass-white-card rounded-2xl sm:rounded-3xl p-4 flex flex-col shadow-xl overflow-hidden select-none">
        {/* 1. Header with Tab Switcher */}
        <div className="flex items-center justify-between pb-3 border-b border-white/20 shrink-0">
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/10 border border-white/15">
            {/* Chat Tab Button */}
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-white/25 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>

            {/* Participants Tab Button */}
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'participants'
                  ? 'bg-white/25 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>People ({participants.length})</span>
            </button>
          </div>

          {activeTab === 'participants' && onOpenModal && isHost && (
            <button
              onClick={onOpenModal}
              title="Manage participants"
              className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 2. Body View: Chat Tab matching Image 1 */}
        {activeTab === 'chat' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            {/* Scrollable Messages Area */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pt-3 pr-1">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/60 text-xs py-12">
                  <MessageSquare className="w-8 h-8 stroke-1 text-white/40 mb-2" />
                  <p className="font-semibold text-white/90 text-xs">No messages yet</p>
                  <p className="text-[11px] text-white/50 text-center max-w-[200px] mt-0.5">
                    Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isHostUser = msg.role === 'host';
                  const isModUser = msg.role === 'moderator';

                  return (
                    <div key={msg.id} className="flex gap-2.5 items-start text-xs group">
                      <Avatar size="sm" className="w-7 h-7 shrink-0 border border-white/20 mt-0.5 shadow">
                        <AvatarImage
                          src={msg.avatar || '/avatars/01.png'}
                          alt={msg.username}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-white/15 text-white font-semibold text-[10px]">
                          {msg.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-semibold text-white truncate max-w-[120px] text-xs">
                            {msg.username}
                          </span>
                          {isHostUser && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/15 text-white border border-white/25 font-semibold shrink-0">
                              Host
                            </span>
                          )}
                          {isModUser && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 font-semibold shrink-0">
                              Mod
                            </span>
                          )}
                          <span className="text-[10px] text-white/40 ml-auto shrink-0 font-mono">
                            {formatMessageTime(msg.timestamp)}
                          </span>
                        </div>
                        <p className="text-white/90 text-xs break-words leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Reactions Bar matching Image 1 */}
            {onSendReaction && (
              <div className="flex items-center justify-end pt-2 pb-1 shrink-0">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md shadow-sm">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onSendReaction(emoji)}
                      className="w-6 h-6 flex items-center justify-center text-sm rounded-full hover:bg-white/20 hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                      title={`Send ${emoji}`}
                    >
                      <span>{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Pill Input with Coral Send Button */}
            <form
              onSubmit={onSendMessage}
              className="relative flex items-center glass-white-input rounded-full px-4 py-1.5 mt-1 shadow-inner shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={(e) => onChatInputChange(e.target.value)}
                placeholder="Type comment..."
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
            {/* Scrollable Participants Roster matching Design Reference */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-2 pr-1">
              {participants.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/60 text-xs py-12">
                  <Users className="w-8 h-8 stroke-1 text-white/40 mb-2" />
                  <p className="font-semibold text-white/90 text-xs">No active participants</p>
                </div>
              ) : (
                participants.map((p) => {
                  const isMe = p.socketId === currentSocketId || p.userId === currentSocketId;
                  const avatarUrl = getAvatarForUser(p, participants);

                  return (
                    <div
                      key={p.userId || p.socketId}
                      className="group px-2.5 py-2 rounded-2xl flex items-center justify-between gap-2.5 hover:bg-white/[0.08] transition-colors"
                    >
                      {/* Left: Avatar with green online dot + username + (You) */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <Avatar size="sm" className="w-8 h-8 rounded-full border border-white/20 shadow">
                            <AvatarImage src={avatarUrl} alt={p.username} className="object-cover" />
                            <AvatarFallback className="bg-white/15 text-white font-semibold text-xs">
                              {p.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {/* Online indicator dot */}
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black/80" />
                        </div>

                        <div className="min-w-0 flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-white truncate max-w-[110px]">
                            {p.username}
                          </span>
                          {isMe && (
                            <span className="text-[11px] text-white/60 font-normal shrink-0">
                              (You)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Frosted RoleBadge Pill + Optional Three Dots (only visible in host and mod view) */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        <RoleBadge role={p.role} className="w-20 justify-center text-[11px]" size={12} />

                        {canModerate ? (
                          !isMe ? (
                            <div className="w-7 h-7 flex items-center justify-center shrink-0">
                              <DropdownMenu>
                                <DropdownMenuTrigger className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer outline-none flex items-center justify-center">
                                  <MoreVertical className="w-4 h-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  side="bottom"
                                  sideOffset={4}
                                  className="w-44 rounded-2xl glass-white-card p-1.5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100 z-50 border border-white/30 backdrop-blur-2xl text-white outline-none"
                                >
                                  {isHost ? (
                                    <>
                                      {/* 1. Promote to Moderator / Demote to Viewer */}
                                      {p.role === 'moderator' ? (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setConfirmAction({
                                              isOpen: true,
                                              type: 'demote',
                                              targetUser: p,
                                            })
                                          }
                                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-white/90 hover:text-white hover:bg-white/15 rounded-xl cursor-pointer transition-colors font-medium outline-none"
                                        >
                                          <Eye className="w-3.5 h-3.5 text-white/80 shrink-0" strokeWidth={1.75} />
                                          <span>Demote to Viewer</span>
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setConfirmAction({
                                              isOpen: true,
                                              type: 'promote_mod',
                                              targetUser: p,
                                            })
                                          }
                                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-white/90 hover:text-white hover:bg-white/15 rounded-xl cursor-pointer transition-colors font-medium outline-none"
                                        >
                                          <ShieldCheck className="w-3.5 h-3.5 text-white/80 shrink-0" strokeWidth={1.75} />
                                          <span>Make Moderator</span>
                                        </DropdownMenuItem>
                                      )}

                                      {/* 2. Promote to Host */}
                                      <DropdownMenuItem
                                        onClick={() =>
                                          setConfirmAction({
                                            isOpen: true,
                                            type: 'transfer_host',
                                            targetUser: p,
                                          })
                                        }
                                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-amber-200 hover:text-amber-100 hover:bg-white/15 rounded-xl cursor-pointer transition-colors font-medium outline-none"
                                      >
                                        <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={1.75} />
                                        <span>Promote to Host</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator className="my-1 -mx-1 h-px bg-white/15" />

                                      {/* 3. Remove Member */}
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() =>
                                          setConfirmAction({
                                            isOpen: true,
                                            type: 'remove',
                                            targetUser: p,
                                          })
                                        }
                                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-red-200 hover:text-white hover:bg-red-500/30 rounded-xl cursor-pointer transition-colors font-medium outline-none"
                                      >
                                        <UserMinus className="w-3.5 h-3.5 text-red-300 shrink-0" strokeWidth={1.75} />
                                        <span>Remove Member</span>
                                      </DropdownMenuItem>
                                    </>
                                  ) : isMod && p.role === 'participant' ? (
                                    /* Moderator actions on regular participants */
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() =>
                                        setConfirmAction({
                                          isOpen: true,
                                          type: 'remove',
                                          targetUser: p,
                                        })
                                      }
                                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-red-200 hover:text-white hover:bg-red-500/30 rounded-xl cursor-pointer transition-colors font-medium outline-none"
                                    >
                                      <UserMinus className="w-3.5 h-3.5 text-red-300 shrink-0" strokeWidth={1.75} />
                                      <span>Remove Member</span>
                                    </DropdownMenuItem>
                                  ) : (
                                    <div className="px-3 py-2 text-xs text-white/70 text-center">
                                      Host controls only
                                    </div>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ) : (
                            <div className="w-7 h-7" />
                          )
                        ) : null}
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

      {/* Alert Dialog matching Frosted Glass Design */}
      <AlertDialog
        open={confirmAction.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction((prev) => ({ ...prev, isOpen: false }));
          }
        }}
      >
        <AlertDialogContent className="w-full max-w-sm rounded-3xl glass-white-card p-6 shadow-2xl animate-in zoom-in-95 duration-150 border border-white/30 backdrop-blur-2xl text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-base font-bold flex items-center gap-2">
              {confirmAction.type === 'promote_mod' && <ShieldCheck className="w-4 h-4 text-blue-300" />}
              {confirmAction.type === 'demote' && <Eye className="w-4 h-4 text-white/80" />}
              {confirmAction.type === 'transfer_host' && <Crown className="w-4 h-4 text-amber-300" />}
              {confirmAction.type === 'remove' && <UserMinus className="w-4 h-4 text-red-300" />}
              <span>
                {confirmAction.type === 'promote_mod' && 'Make Moderator'}
                {confirmAction.type === 'demote' && 'Demote to Viewer'}
                {confirmAction.type === 'transfer_host' && 'Promote to Host'}
                {confirmAction.type === 'remove' && 'Remove Member'}
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70 text-xs mt-1.5 leading-relaxed">
              {confirmAction.type === 'promote_mod' &&
                `Grant moderator privileges to ${confirmAction.targetUser?.username}? They will be able to control playback and change videos.`}
              {confirmAction.type === 'demote' &&
                `Demote ${confirmAction.targetUser?.username} to a regular viewer? They will lose video playback controls.`}
              {confirmAction.type === 'transfer_host' &&
                `Transfer room host status to ${confirmAction.targetUser?.username}? You will step down to a moderator.`}
              {confirmAction.type === 'remove' &&
                `Are you sure you want to remove ${confirmAction.targetUser?.username} from the watch party immediately?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center justify-end gap-2.5 pt-4">
            <AlertDialogCancel className="glass-white-pill px-4 py-2 rounded-full text-xs font-semibold text-white/80 hover:text-white hover:bg-white/20 border-white/20 cursor-pointer transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={`rounded-full px-5 py-2 text-xs font-semibold text-white cursor-pointer transition-colors shadow-sm ${
                confirmAction.type === 'remove'
                  ? 'bg-rose-500 hover:bg-rose-600'
                  : confirmAction.type === 'transfer_host'
                  ? 'bg-[#F05A65] hover:bg-[#ff6974]'
                  : 'bg-white/20 hover:bg-white/30 border border-white/25'
              }`}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
