'use client';

import React, { useState, useEffect } from 'react';
import { X, MoreVertical, ShieldCheck, Eye, UserMinus } from 'lucide-react';
import { Role, ParticipantData } from '@/lib/types';
import { RoleBadge } from '@/lib/roles';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarForUser } from '@/lib/avatars';

interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: ParticipantData[];
  currentSocketId: string;
  isHost: boolean;
  onAssignRole: (userId: string, role: Role) => void;
  onRemoveUser: (userId: string) => void;
}

interface DialogState {
  isOpen: boolean;
  type: 'role' | 'remove';
  targetUser: ParticipantData | null;
  targetRole?: Role;
}

export function ParticipantsModal({
  isOpen,
  onClose,
  participants,
  currentSocketId,
  isHost,
  onAssignRole,
  onRemoveUser,
}: ParticipantsModalProps) {
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    type: 'role',
    targetUser: null,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dialogState.isOpen) {
          setDialogState({ isOpen: false, type: 'role', targetUser: null });
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dialogState.isOpen, onClose]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in-0 duration-150">
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
          {participants.length === 0 ? (
            <p className="text-center py-8 text-xs text-white/60">No active participants</p>
          ) : (
            participants.map((p) => {
              const isMe = p.socketId === currentSocketId;
              const isMenuOpen = activeMenuUserId === p.socketId;

              return (
                <div
                  key={p.socketId}
                  className="group px-3 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs hover:bg-white/10 transition-colors relative"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar size="default" className="w-9 h-9 shrink-0 border border-white/20">
                      <AvatarImage
                        src={getAvatarForUser(p, participants)}
                        alt={p.username}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-white/15 text-white font-semibold text-xs">
                        {p.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-white truncate">
                        {p.username}
                      </span>
                      {isMe && (
                        <span className="text-xs text-white/60 font-normal shrink-0">
                          (You)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side: Role Badge and Host Menu */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <RoleBadge role={p.role} className="w-24 justify-center text-xs" size={13} />

                    {isHost && (
                      <div className="w-7 h-7 flex items-center justify-center shrink-0">
                        {!isMe && (
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveMenuUserId(isMenuOpen ? null : p.socketId)
                              }
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

                            {isMenuOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-20 cursor-pointer"
                                  onClick={() => setActiveMenuUserId(null)}
                                />
                                <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-2xl glass-white-card p-1.5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100 text-left">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuUserId(null);
                                      openRoleDialog(p);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-white/90 hover:text-white hover:bg-white/15 transition-colors text-left cursor-pointer font-medium"
                                  >
                                    {p.role === 'moderator' ? (
                                      <>
                                        <Eye className="w-3.5 h-3.5 text-white/80 shrink-0" strokeWidth={1.75} />
                                        <span>Demote to Viewer</span>
                                      </>
                                    ) : (
                                      <>
                                        <ShieldCheck className="w-3.5 h-3.5 text-white/80 shrink-0" strokeWidth={1.75} />
                                        <span>Make Moderator</span>
                                      </>
                                    )}
                                  </button>

                                  <div className="my-1 h-px bg-white/15" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuUserId(null);
                                      openRemoveDialog(p);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-red-200 hover:text-white hover:bg-red-500/30 transition-colors text-left cursor-pointer font-medium"
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
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {dialogState.isOpen && dialogState.targetUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in-0 duration-150">
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setDialogState({ isOpen: false, type: 'role', targetUser: null })}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl glass-white-card p-6 shadow-2xl animate-in zoom-in-95 duration-150 text-left text-white">
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
                <h3 className="text-sm font-bold text-white">
                  {dialogState.type === 'role'
                    ? dialogState.targetRole === 'moderator'
                      ? 'Make Moderator'
                      : 'Demote to Viewer'
                    : 'Remove Member'}
                </h3>
                <p className="text-xs text-white/70">{dialogState.targetUser.username}</p>
              </div>
            </div>
            <p className="text-xs text-white/90 leading-relaxed">
              {dialogState.type === 'role'
                ? dialogState.targetRole === 'moderator'
                  ? `Grant ${dialogState.targetUser.username} playback and video control permissions?`
                  : `Revoke playback control permissions from ${dialogState.targetUser.username}?`
                : `Are you sure you want to disconnect ${dialogState.targetUser.username} from this watch party?`}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/20 mt-4">
              <button
                type="button"
                onClick={() => setDialogState({ isOpen: false, type: 'role', targetUser: null })}
                className="glass-white-pill px-4 py-2 rounded-full text-xs font-semibold text-white transition-all cursor-pointer shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#F05A65] hover:bg-[#FF7180] active:scale-95 transition-all cursor-pointer shadow-lg shadow-red-500/25"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
