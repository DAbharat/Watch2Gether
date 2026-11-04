'use client';

import React, { useState } from 'react';
import {
  Users,
  MoreVertical,
  ShieldCheck,
  Eye,
  Crown,
  UserMinus,
} from 'lucide-react';
import { ParticipantData, Role } from '@/lib/types';
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

interface ParticipantsCardProps {
  participants: ParticipantData[];
  currentSocketId: string;
  isHost: boolean;
  onAssignRole?: (userId: string, role: Role) => void;
  onTransferHost?: (userId: string) => void;
  onRemoveUser?: (userId: string) => void;
  onOpenModal?: () => void;
}

export function ParticipantsCard({
  participants,
  currentSocketId,
  isHost,
  onAssignRole,
  onTransferHost,
  onRemoveUser,
  onOpenModal,
}: ParticipantsCardProps) {
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    type: 'promote_mod' | 'demote' | 'transfer_host' | 'remove';
    targetUser: ParticipantData | null;
  }>({
    isOpen: false,
    type: 'promote_mod',
    targetUser: null,
  });

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
      <div className="w-full h-[38%] min-h-[170px] max-h-[240px] glass-white-card rounded-2xl sm:rounded-3xl p-4 flex flex-col shadow-xl overflow-hidden shrink-0 select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/20 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Participants ({participants.length})
            </h3>
          </div>

          {onOpenModal && isHost && (
            <button
              onClick={onOpenModal}
              title="Manage participants"
              className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scrollable Participants List */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pt-2 pr-1">
          {participants.map((p) => {
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

                {/* Right: Frosted RoleBadge Pill + Three Dots (never on own row) */}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <RoleBadge role={p.role} className="w-20 justify-center text-[11px]" size={12} />

                  {!isMe ? (
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
                  )}
                </div>
              </div>
            );
          })}
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
