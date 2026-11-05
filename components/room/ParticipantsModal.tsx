'use client';

import React, { useState, useEffect } from 'react';
import { X, MoreVertical, ShieldCheck, Eye, Crown, UserMinus } from 'lucide-react';
import { Role, ParticipantData } from '@/lib/types';
import { RoleBadge } from '@/lib/roles';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarForUser } from '@/lib/avatars';
import { cn } from 'cn';

interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: ParticipantData[];
  currentSocketId: string;
  isHost: boolean;
  isModerator?: boolean;
  hostGrace?: { hostId: string; deadline: number; remaining: number } | null;
  onAssignRole: (userId: string, role: Role) => void;
  onTransferHost?: (userId: string) => void;
  onRemoveUser: (userId: string) => void;
}

interface DialogState {
  isOpen: boolean;
  type: 'role' | 'transfer' | 'remove';
  targetUser: ParticipantData | null;
  targetRole?: Role;
}

export function ParticipantsModal({
  isOpen,
  onClose,
  participants,
  currentSocketId,
  isHost,
  isModerator = false,
  hostGrace,
  onAssignRole,
  onTransferHost,
  onRemoveUser,
}: ParticipantsModalProps) {
  const [menuAnchor, setMenuAnchor] = useState<{
    user: ParticipantData;
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    type: 'role',
    targetUser: null,
  });

  const myParticipant = participants.find(
    (p) => (currentSocketId && p.socketId === currentSocketId) || (currentSocketId && p.userId === currentSocketId)
  );
  const myRole = myParticipant?.role || (isHost ? 'host' : 'participant');
  const isMod = isModerator || myRole === 'moderator';
  const canModerate = isHost || isMod;

  // Close menus on scroll, resize, or escape
  useEffect(() => {
    const handleScrollOrResize = () => {
      setMenuAnchor(null);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menuAnchor) {
          setMenuAnchor(null);
        } else if (dialogState.isOpen) {
          setDialogState({ isOpen: false, type: 'role', targetUser: null });
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dialogState.isOpen, menuAnchor, onClose]);

  if (!isOpen) return null;

  const openRoleDialog = (user: ParticipantData) => {
    const nextRole: Role = user.role === 'moderator' ? 'participant' : 'moderator';
    setDialogState({
      isOpen: true,
      type: 'role',
      targetUser: user,
      targetRole: nextRole,
    });
  };

  const openTransferDialog = (user: ParticipantData) => {
    setDialogState({
      isOpen: true,
      type: 'transfer',
      targetUser: user,
      targetRole: 'host',
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
    const targetId = dialogState.targetUser.userId || dialogState.targetUser.socketId;

    if (dialogState.type === 'role' && dialogState.targetRole) {
      onAssignRole(targetId, dialogState.targetRole);
    } else if (dialogState.type === 'transfer') {
      if (onTransferHost) {
        onTransferHost(targetId);
      } else {
        onAssignRole(targetId, 'host');
      }
    } else if (dialogState.type === 'remove') {
      onRemoveUser(targetId);
    }
    setDialogState({ isOpen: false, type: 'role', targetUser: null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in-0 duration-150">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg rounded-3xl glass-white-card p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-left flex flex-col max-h-[85vh] text-white"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/20 mb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>Room Participants</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 border border-white/25 text-white font-mono">
                {participants.length}
              </span>
            </h3>
            <p className="text-[11px] text-white/70">
              Users currently connected to this watch party
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Participants Roster with clean alignment */}
        <div className="flex-1 overflow-y-auto space-y-1 p-1 -mx-2 pr-1">
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
          {participants.length === 0 ? (
            <p className="text-center py-8 text-xs text-white/60">No active participants</p>
          ) : (
            participants.map((p) => {
              const isMe = p.socketId === currentSocketId || p.userId === currentSocketId;
              const isDisconnected = p.connected === false;
              const isMenuOpen =
                menuAnchor?.user.userId === p.userId && menuAnchor?.user.socketId === p.socketId;

              return (
                <div
                  key={p.userId || p.socketId}
                  className={cn(
                    "group px-3 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs hover:bg-white/10 transition-colors relative",
                    isDisconnected && "opacity-75"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <Avatar size="default" className="w-9 h-9 border border-white/20">
                        <AvatarImage
                          src={getAvatarForUser(p, participants)}
                          alt={p.username}
                          className="object-cover"
                        />
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
                      <span className="font-semibold text-sm text-white truncate">
                        {p.username}
                      </span>
                      {isDisconnected && (
                        <span className="text-[11px] text-amber-300/80 font-normal shrink-0">
                          (Reconnecting...)
                        </span>
                      )}
                      {isMe && (
                        <span className="text-xs text-white/60 font-normal shrink-0">
                          (You)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side: Role Badge and Host/Mod Menu */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <RoleBadge role={p.role} className="w-24 justify-center text-xs" size={13} />

                    {canModerate ? (
                      !isMe ? (
                        <div className="w-7 h-7 flex items-center justify-center shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isMenuOpen) {
                                setMenuAnchor(null);
                                return;
                              }
                              const rect = e.currentTarget.getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const menuEstimatedHeight = 175;
                              const openUpwards = spaceBelow < menuEstimatedHeight;

                              setMenuAnchor({
                                user: p,
                                top: openUpwards ? undefined : rect.bottom + 6,
                                bottom: openUpwards ? window.innerHeight - rect.top + 6 : undefined,
                                right: window.innerWidth - rect.right,
                              });
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isMenuOpen
                                ? 'bg-white/20 text-white'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                            title="Member options"
                            aria-expanded={isMenuOpen}
                          >
                            <MoreVertical className="w-4 h-4" strokeWidth={1.75} />
                          </button>
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
      </div>

      {/* Floating Member Options Dropdown: Portaled with fixed position so it is NEVER clipped by modal scroll containers */}
      {menuAnchor && (
        <>
          <div
            className="fixed inset-0 z-[65] cursor-pointer"
            onClick={() => setMenuAnchor(null)}
          />
          <div
            style={{
              position: 'fixed',
              top: menuAnchor.top !== undefined ? `${menuAnchor.top}px` : undefined,
              bottom: menuAnchor.bottom !== undefined ? `${menuAnchor.bottom}px` : undefined,
              right: `${menuAnchor.right}px`,
            }}
            className="z-[70] w-48 rounded-2xl glass-white-card p-1.5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100 text-left text-white"
          >
            {isHost ? (
              <>
                {/* 1. Make Moderator / Demote */}
                <button
                  type="button"
                  onClick={() => {
                    const target = menuAnchor.user;
                    setMenuAnchor(null);
                    openRoleDialog(target);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/15 transition-colors text-left cursor-pointer font-medium"
                >
                  {menuAnchor.user.role === 'moderator' ? (
                    <>
                      <Eye className="w-4 h-4 text-white shrink-0" strokeWidth={1.75} />
                      <span className="text-white">Demote to Viewer</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-white shrink-0" strokeWidth={1.75} />
                      <span className="text-white">Make Moderator</span>
                    </>
                  )}
                </button>

                {/* 2. Promote to Host */}
                <button
                  type="button"
                  onClick={() => {
                    const target = menuAnchor.user;
                    setMenuAnchor(null);
                    openTransferDialog(target);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white hover:bg-white/15 transition-colors text-left cursor-pointer font-medium"
                >
                  <Crown className="w-4 h-4 text-white shrink-0" strokeWidth={1.75} />
                  <span className="text-white">Promote to Host</span>
                </button>

                <div className="my-1 h-px bg-white/20" />

                {/* 3. Remove Member */}
                <button
                  type="button"
                  onClick={() => {
                    const target = menuAnchor.user;
                    setMenuAnchor(null);
                    openRemoveDialog(target);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-300 hover:text-white hover:bg-rose-500/25 transition-colors text-left cursor-pointer font-medium"
                >
                  <UserMinus className="w-4 h-4 text-rose-400 shrink-0" strokeWidth={1.75} />
                  <span>Remove Member</span>
                </button>
              </>
            ) : isMod && menuAnchor.user.role === 'participant' ? (
              /* Moderator action on viewer */
              <button
                type="button"
                onClick={() => {
                  const target = menuAnchor.user;
                  setMenuAnchor(null);
                  openRemoveDialog(target);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-300 hover:text-white hover:bg-rose-500/25 transition-colors text-left cursor-pointer font-medium"
              >
                <UserMinus className="w-4 h-4 text-rose-400 shrink-0" strokeWidth={1.75} />
                <span>Remove Member</span>
              </button>
            ) : (
              <div className="px-3 py-2 text-xs text-white/70 text-center">
                Host controls only
              </div>
            )}
          </div>
        </>
      )}

      {/* Confirmation Dialog */}
      {dialogState.isOpen && dialogState.targetUser && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in-0 duration-150">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setDialogState({ isOpen: false, type: 'role', targetUser: null })}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl glass-white-card p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-left text-white border border-white/30 backdrop-blur-2xl">
            <div className="flex items-center gap-3 mb-3">
              <Avatar size="default" className="w-9 h-9 border border-white/20 shrink-0">
                <AvatarImage
                  src={getAvatarForUser(dialogState.targetUser, participants)}
                  alt={dialogState.targetUser.username}
                  className="object-cover"
                />
                <AvatarFallback className="bg-white/15 text-white font-semibold text-xs">
                  {dialogState.targetUser.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-base font-semibold text-white">
                  {dialogState.type === 'role'
                    ? dialogState.targetRole === 'moderator'
                      ? 'Make Moderator'
                      : 'Demote to Viewer'
                    : dialogState.type === 'transfer'
                    ? 'Promote to Host'
                    : 'Remove Member'}
                </h3>
                <p className="text-xs text-white/70">{dialogState.targetUser.username}</p>
              </div>
            </div>
            <p className="text-xs text-white/80 mt-2 leading-relaxed">
              {dialogState.type === 'role'
                ? dialogState.targetRole === 'moderator'
                  ? `Are you sure you want to make ${dialogState.targetUser.username} a moderator? They will be granted controls to play, pause, seek, and change videos for everyone.`
                  : `Are you sure you want to demote ${dialogState.targetUser.username} to a viewer? They will no longer be able to control playback or change videos.`
                : dialogState.type === 'transfer'
                ? `Are you sure you want to transfer room ownership to ${dialogState.targetUser.username}? You will become a moderator.`
                : `Are you sure you want to remove ${dialogState.targetUser.username} from the watch party? They will be disconnected from this room immediately.`}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-4 mt-3 border-t border-white/15">
              <button
                type="button"
                onClick={() => setDialogState({ isOpen: false, type: 'role', targetUser: null })}
                className="glass-white-pill px-4 py-2 rounded-full text-xs font-semibold text-white/80 hover:text-white hover:bg-white/20 border-white/20 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-5 py-2 rounded-full text-xs font-semibold text-white transition-colors cursor-pointer shadow-sm ${
                  dialogState.type === 'remove'
                    ? 'bg-rose-500 hover:bg-rose-600'
                    : dialogState.type === 'transfer'
                    ? 'bg-[#F05A65] hover:bg-[#ff6974]'
                    : 'bg-white/20 hover:bg-white/30 border border-white/25'
                }`}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
