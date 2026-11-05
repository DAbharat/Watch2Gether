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
  Film,
  Plus,
  Play,
  ListPlus,
  Link as LinkIcon,
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  Check,
} from 'lucide-react';
import { ChatMessage, ParticipantData, Role, VideoRequest, QueueItem } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarForUser } from '@/lib/avatars';
import { RoleBadge } from '@/lib/roles';
import { validateYouTubeUrl } from '@/lib/youtubeValidator';
import { cn } from 'cn';
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
  hostGrace?: { hostId: string; deadline: number; remaining: number } | null;
  chatInput: string;
  onChatInputChange: (val: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onSendReaction?: (emoji: string) => void;
  onAssignRole?: (userId: string, role: Role) => void;
  onTransferHost?: (userId: string) => void;
  onRemoveUser?: (userId: string) => void;
  onOpenModal?: () => void;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
  defaultTab?: 'chat' | 'participants' | 'requests';
  requests?: VideoRequest[];
  queue?: QueueItem[];
  onRequestVideo?: (url: string) => void;
  onResolveRequest?: (requestId: string, action: 'play_now' | 'queue' | 'reject') => void;
  onCopyRoomLink?: () => void;
  copied?: boolean;
  onLeaveRoom?: () => void;
  hostName?: string;
  roomId?: string;
  typingUsers?: { userId: string; username: string }[];
  onTypingStart?: () => void;
  onTypingStop?: () => void;
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
  hostGrace,
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
  requests = [],
  queue = [],
  onRequestVideo,
  onResolveRequest,
  onCopyRoomLink,
  copied = false,
  onLeaveRoom,
  hostName = 'Host',
  roomId = '',
  typingUsers = [],
  onTypingStart,
  onTypingStop,
}: RoomSidebarProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'requests'>(defaultTab);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleInputChange = (val: string) => {
    onChatInputChange(val);
    if (val.trim()) {
      onTypingStart?.();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTypingStop?.();
      }, 2500);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTypingStop?.();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTypingStop?.();
    onSendMessage(e);
  };

  // Requests state
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [isRequestFormOpen, setIsRequestFormOpen] = useState<boolean>(false);
  const [requestUrlInput, setRequestUrlInput] = useState<string>('');
  const [requestError, setRequestError] = useState<string | null>(null);

  const myParticipant = participants.find(
    (p) => (currentSocketId && p.socketId === currentSocketId) || (currentSocketId && p.userId === currentSocketId)
  );
  const myRole = myParticipant?.role || (isHost ? 'host' : 'participant');
  const isMod = isModerator || myRole === 'moderator';
  const canModerate = isHost || isMod;

  const otherTypingUsers = (typingUsers || []).filter(
    (u) => u.userId !== currentSocketId && (!myParticipant || u.userId !== myParticipant.userId)
  );

  let typingLabel: string | null = null;
  if (otherTypingUsers.length === 1) {
    typingLabel = `${otherTypingUsers[0].username} is typing something`;
  } else if (otherTypingUsers.length > 1) {
    typingLabel = `${otherTypingUsers.length} users are typing`;
  }

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

  // Submit a video request with client-side validation
  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);

    const validation = validateYouTubeUrl(requestUrlInput);
    if (!validation.valid || !validation.canonicalUrl) {
      setRequestError(validation.error || 'Please enter a valid https:// YouTube link.');
      return;
    }

    if (onRequestVideo) {
      onRequestVideo(validation.canonicalUrl);
    }
    setRequestUrlInput('');
    setIsRequestFormOpen(false);
  };

  // Filter requests
  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length;

  const filteredRequests = requests.filter((r) => {
    if (requestFilter === 'all') return true;
    return r.status === requestFilter;
  });

  // Deduplicate participants to guarantee no duplicate cards or ghost entries
  const deduplicatedParticipants = React.useMemo(() => {
    const seenUsers = new Set<string>();
    const result: ParticipantData[] = [];

    // Find the current user entry if present
    const me = participants.find(
      (p) => currentSocketId && (p.socketId === currentSocketId || p.userId === currentSocketId)
    );

    for (const p of participants) {
      const key = p.userId || p.socketId;
      if (seenUsers.has(key)) continue;

      // Filter out stale viewer duplicates that share my username and are disconnected
      if (me && p !== me && p.role !== 'host' && p.username === me.username && (p.connected === false || !p.socketId)) {
        continue;
      }

      seenUsers.add(key);
      result.push(p);
    }
    return result;
  }, [participants, currentSocketId]);

  return (
    <>
      <div className="w-full h-full glass-white-card rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col shadow-xl overflow-hidden select-none">
        {/* 1. Header with Tab Switcher */}
        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-white/20 shrink-0">
          <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 rounded-full bg-white/10 border border-white/15">
            {/* Chat Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-white/25 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Chat</span>
            </button>

            {/* Participants Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab('participants')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'participants'
                  ? 'bg-white/25 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>
                <span className="hidden sm:inline">Participants</span>
                <span className="sm:hidden">People</span> ({deduplicatedParticipants.length})
              </span>
            </button>

            {/* Requests Tab Button */}
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-white/25 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Film className="w-3.5 h-3.5 shrink-0" />
              <span>Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          </div>

          {/* Desktop Manage Participants button */}
          {activeTab === 'participants' && onOpenModal && isHost && (
            <button
              type="button"
              onClick={onOpenModal}
              title="Manage participants"
              className="hidden lg:block p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Only: 3 dots in the right corner of room sidebar header */}
          <div className="lg:hidden flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer outline-none flex items-center justify-center"
                title="Room options"
              >
                <MoreVertical className="w-4 h-4 text-white" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={6}
                className="w-44 rounded-2xl glass-white-card p-1.5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100 z-50 text-white outline-none"
              >
                {/* 1. Invite Friends */}
                {onCopyRoomLink && (
                  <DropdownMenuItem
                    onClick={onCopyRoomLink}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/15 rounded-xl cursor-pointer transition-colors font-medium outline-none"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Users className="w-4 h-4 text-white shrink-0" />
                    )}
                    <span>{copied ? 'Link Copied!' : 'Invite Friends'}</span>
                  </DropdownMenuItem>
                )}

                {/* Manage Roster (Host only) */}
                {isHost && onOpenModal && (
                  <DropdownMenuItem
                    onClick={onOpenModal}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/15 rounded-xl cursor-pointer transition-colors font-medium outline-none"
                  >
                    <ShieldCheck className="w-4 h-4 text-white shrink-0" />
                    <span>Manage Roster</span>
                  </DropdownMenuItem>
                )}

                {(onCopyRoomLink || (isHost && onOpenModal)) && onLeaveRoom && (
                  <DropdownMenuSeparator className="my-1 -mx-1 h-px bg-white/20" />
                )}

                {/* 2. Leave Room */}
                {onLeaveRoom && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={onLeaveRoom}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs text-rose-300 hover:text-white hover:bg-rose-500/25 rounded-xl cursor-pointer transition-colors font-medium outline-none"
                  >
                    <LogOut className="w-4 h-4 text-rose-300 shrink-0" />
                    <span>Leave Room</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 2. Body View: Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            {/* Scrollable Messages Area */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pt-3 pr-1">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/60 text-xs py-4 sm:py-8">
                  <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 stroke-1 text-white/40 mb-1.5" />
                  <p className="font-semibold text-white/90 text-xs">No messages yet</p>
                  <p className="text-[11px] text-white/50 text-center max-w-[200px] mt-0.5">
                    Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.userId === currentSocketId;
                  const avatarUrl = getAvatarForUser(
                    { userId: msg.userId, username: msg.username, avatar: msg.avatar },
                    participants
                  );
                  const timeString = formatMessageTime(msg.timestamp);

                  return (
                    <div key={msg.id} className="flex items-start gap-2.5">
                      <div className="relative shrink-0 mt-0.5">
                        <Avatar size="sm" className="w-8 h-8 rounded-full border border-white/20 shadow">
                          <AvatarImage src={avatarUrl} alt={msg.username} className="object-cover" />
                          <AvatarFallback className="bg-white/15 text-white font-semibold text-xs">
                            {msg.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black/80" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-white truncate">
                            {isMe ? 'You' : msg.username}
                          </span>
                          <span className="text-[10px] text-white/60 font-normal shrink-0">
                            {timeString}
                          </span>
                        </div>
                        <p className="text-xs text-white/95 leading-relaxed font-normal mt-0.5 break-words">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Reactions Strip */}
            {onSendReaction && (
              <div className="pt-1.5 pb-1 flex justify-center shrink-0">
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

            {/* Typing Indicator */}
            {typingLabel && (
              <div className="flex items-center gap-1.5 px-3 py-0.5 text-[11px] text-white/70 animate-in fade-in duration-150 shrink-0">
                <span className="flex items-center gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-white/70 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 rounded-full bg-white/70 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 rounded-full bg-white/70 animate-bounce" />
                </span>
                <span className="truncate italic">{typingLabel}</span>
              </div>
            )}

            {/* Bottom Pill Input with Coral Send Button */}
            <form
              onSubmit={handleFormSubmit}
              className="relative flex items-center glass-white-input rounded-full px-3.5 sm:px-4 py-1.5 mt-0.5 shadow-inner shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={(e) => handleInputChange(e.target.value)}
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
            {/* Scrollable Participants Roster */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-2 pr-1">
              {hostGrace && (
                <div className="mb-2 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between shadow">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Host disconnected</span>
                  </div>
                  <span className="font-mono text-[11px] bg-black/30 px-2 py-0.5 rounded-full border border-white/10">
                    New host in {hostGrace.remaining}s
                  </span>
                </div>
              )}
              {deduplicatedParticipants.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/60 text-xs py-12">
                  <Users className="w-8 h-8 stroke-1 text-white/40 mb-2" />
                  <p className="font-semibold text-white/90 text-xs">No active participants</p>
                </div>
              ) : (
                deduplicatedParticipants.map((p) => {
                  const isMe = p.socketId === currentSocketId || p.userId === currentSocketId;
                  const isDisconnected = p.connected === false;
                  const avatarUrl = getAvatarForUser(p, participants);

                  return (
                    <div
                      key={p.userId || p.socketId}
                      className={cn(
                        "group px-2.5 py-2 rounded-2xl flex items-center justify-between gap-2.5 hover:bg-white/[0.08] transition-colors",
                        isDisconnected && "opacity-75"
                      )}
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
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-black/80",
                              isDisconnected ? "bg-amber-400/90" : "bg-emerald-400"
                            )}
                          />
                        </div>

                        <div className="min-w-0 flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-white truncate max-w-[110px]">
                            {p.username}
                          </span>
                          {isDisconnected && (
                            <span className="text-[10px] text-amber-300/80 font-normal shrink-0">
                              (Reconnecting...)
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[11px] text-white/60 font-normal shrink-0">
                              (You)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Frosted RoleBadge Pill + Optional Three Dots */}
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
                                  sideOffset={6}
                                  className="w-48 rounded-2xl glass-white-card p-1.5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100 z-50 text-white outline-none"
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
                                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/15 rounded-xl cursor-pointer transition-colors font-medium outline-none"
                                        >
                                          <Eye className="w-4 h-4 text-white shrink-0" strokeWidth={1.75} />
                                          <span className="text-white">Demote to Viewer</span>
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
                                          className="flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/15 rounded-xl cursor-pointer transition-colors font-medium outline-none"
                                        >
                                          <ShieldCheck className="w-4 h-4 text-white shrink-0" strokeWidth={1.75} />
                                          <span className="text-white">Make Moderator</span>
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
                                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/15 rounded-xl cursor-pointer transition-colors font-medium outline-none"
                                      >
                                        <Crown className="w-4 h-4 text-white shrink-0" strokeWidth={1.75} />
                                        <span className="text-white">Promote to Host</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator className="my-1 -mx-1 h-px bg-white/20" />

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
                                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-rose-300 hover:text-white hover:bg-rose-500/25 rounded-xl cursor-pointer transition-colors font-medium outline-none"
                                      >
                                        <UserMinus className="w-4 h-4 text-rose-400 shrink-0" strokeWidth={1.75} />
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
                                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-rose-300 hover:text-white hover:bg-rose-500/25 rounded-xl cursor-pointer transition-colors font-medium outline-none"
                                    >
                                      <UserMinus className="w-4 h-4 text-rose-400 shrink-0" strokeWidth={1.75} />
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

        {/* 4. Body View: Requests Tab */}
        {activeTab === 'requests' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
            {/* Filter Chips Bar */}
            <div className="flex items-center justify-between pb-2 pt-1 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-1 p-0.5 rounded-full bg-white/10 border border-white/15 overflow-x-auto scrollbar-none">
                {(['all', 'pending', 'accepted', 'rejected'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setRequestFilter(filter)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer capitalize ${
                      requestFilter === filter
                        ? 'bg-white/25 text-white shadow-sm'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Queue badge indicator */}
              {queue.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 text-white/90 border border-white/20">
                  Queue: {queue.length}/20
                </span>
              )}
            </div>

            {/* Requests List Area */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 py-2.5 pr-1">
              {filteredRequests.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/60 text-xs py-12">
                  <Inbox className="w-8 h-8 stroke-1 text-white/40 mb-2" />
                  <p className="font-semibold text-white/90 text-xs">
                    {canModerate ? 'No requests from users right now.' : "You haven't made any requests yet."}
                  </p>
                  <p className="text-[11px] text-white/50 text-center max-w-[200px] mt-0.5">
                    {canModerate
                      ? 'Viewer requests will appear here for approval.'
                      : 'Suggest a video to the host below!'}
                  </p>
                </div>
              ) : (
                filteredRequests.map((req) => {
                  const canonicalUrl = `https://www.youtube.com/watch?v=${req.videoId}`;
                  const isPending = req.status === 'pending';

                  return (
                    <div
                      key={req.requestId}
                      className="p-3 rounded-2xl glass-white-card border border-white/20 shadow-sm space-y-2 text-left"
                    >
                      {/* Host / Moderator view for Pending Request */}
                      {canModerate && isPending ? (
                        <>
                          <div className="text-xs text-white/90 leading-relaxed">
                            <span>User </span>
                            <span className="font-bold text-white">{req.username}</span>
                            <span> made a request to play this video: </span>
                            <span className="font-mono text-white/90 break-all underline decoration-white/30">
                              {canonicalUrl}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 sm:gap-2 pt-1 flex-wrap">
                            {/* "Play now" button (Peach) */}
                            <button
                              type="button"
                              onClick={() => onResolveRequest?.(req.requestId, 'play_now')}
                              className="px-3 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-white bg-[#F05A65] hover:bg-[#FF7180] active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-1 sm:gap-1.5"
                            >
                              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white" />
                              <span>Play now</span>
                            </button>

                            {/* "Add to queue" button (Secondary) */}
                            <button
                              type="button"
                              onClick={() => onResolveRequest?.(req.requestId, 'queue')}
                              className="glass-white-pill px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold text-white hover:bg-white/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5"
                            >
                              <ListPlus className="w-3.5 h-3.5" />
                              <span>Add to queue</span>
                            </button>

                            {/* Reject button (Secondary / Destructive) */}
                            <button
                              type="button"
                              onClick={() => onResolveRequest?.(req.requestId, 'reject')}
                              className="px-2 sm:px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/25 transition-colors cursor-pointer ml-auto"
                            >
                              Reject
                            </button>
                          </div>
                        </>
                      ) : (
                        /* Viewer View or Handled History item */
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {canModerate ? req.username : 'Your Request'}
                            </span>

                            {/* Status label: Pending, Accepted, or Rejected */}
                            {req.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30 font-medium shrink-0">
                                <Clock className="w-3 h-3" />
                                <span>Pending</span>
                              </span>
                            )}
                            {req.status === 'accepted' && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-medium shrink-0">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>
                                  {req.action === 'queue' ? 'Added to queue' : 'Accepted'}
                                </span>
                              </span>
                            )}
                            {req.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30 font-medium shrink-0">
                                <XCircle className="w-3 h-3" />
                                <span>Rejected</span>
                              </span>
                            )}
                          </div>

                          {/* Canonical video link rendered strictly as plain text */}
                          <div className="text-xs text-white/80 font-mono break-all py-0.5">
                            {canonicalUrl}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-white/50 pt-0.5">
                            <span>{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {req.resolvedBy && (
                              <span>Reviewed by {req.resolvedBy}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Viewer: Make a request button and expandable input form */}
            {!canModerate && (
              <div className="pt-2 border-t border-white/15 shrink-0">
                {!isRequestFormOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsRequestFormOpen(true)}
                    className="w-full py-2.5 rounded-full text-xs font-bold text-white bg-[#F05A65] hover:bg-[#FF7180] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Make a request</span>
                  </button>
                ) : (
                  <form onSubmit={handleSubmitRequest} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-white/90">
                        Paste YouTube Video URL
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRequestFormOpen(false);
                          setRequestUrlInput('');
                          setRequestError(null);
                        }}
                        className="text-[11px] text-white/60 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="relative flex items-center glass-white-input rounded-full px-3 py-1 shadow-inner">
                      <LinkIcon className="w-3.5 h-3.5 text-white/60 shrink-0 ml-1 mr-2" />
                      <input
                        type="text"
                        value={requestUrlInput}
                        onChange={(e) => {
                          setRequestUrlInput(e.target.value);
                          setRequestError(null);
                        }}
                        placeholder="https://www.youtube.com/watch?v=..."
                        maxLength={200}
                        autoFocus
                        className="flex-1 bg-transparent text-xs text-white placeholder-white/50 outline-none pr-8 py-1 font-medium"
                      />
                      <button
                        type="submit"
                        disabled={!requestUrlInput.trim()}
                        className="w-7 h-7 rounded-full bg-[#F05A65] hover:bg-[#FF7180] disabled:opacity-40 flex items-center justify-center text-white transition-all cursor-pointer shadow-md shrink-0"
                        title="Send request"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {requestError && (
                      <p className="text-[11px] text-rose-300 font-medium px-1">
                        {requestError}
                      </p>
                    )}
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mobile Only: "user's watch party" as a text "TEXT ONLY" in the bottom, faded, minimal space */}
        <div className="lg:hidden text-center pt-1.5 shrink-0 select-none pointer-events-none">
          <p className="text-[11px] text-white/40 tracking-tight truncate">
            {hostName}&apos;s Watch Party
          </p>
        </div>
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
