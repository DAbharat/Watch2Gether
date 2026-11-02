import React from 'react';
import { Crown, ShieldCheck, Eye, type LucideIcon } from 'lucide-react';
import { Role } from './types';

export interface RoleConfigItem {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const ROLE_CONFIG: Record<Role, RoleConfigItem> = {
  host: {
    label: 'Host',
    shortLabel: 'Host',
    icon: Crown,
  },
  moderator: {
    label: 'Moderator',
    shortLabel: 'Mod',
    icon: ShieldCheck,
  },
  participant: {
    label: 'Viewer',
    shortLabel: 'Viewer',
    icon: Eye,
  },
};

interface RoleIconProps {
  role: Role;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function RoleIcon({
  role,
  className = '',
  size = 14,
  strokeWidth = 1.75,
}: RoleIconProps) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.participant;
  const IconComponent = config.icon;
  return (
    <IconComponent
      className={`inline-block shrink-0 align-middle ${className}`}
      size={size}
      strokeWidth={strokeWidth}
      color="currentColor"
      aria-hidden="true"
    />
  );
}

interface RoleBadgeProps {
  role: Role;
  short?: boolean;
  className?: string;
  iconClassName?: string;
  size?: number;
  strokeWidth?: number;
}

export function RoleBadge({
  role,
  short = false,
  className = '',
  iconClassName = '',
  size = 13,
  strokeWidth = 1.75,
}: RoleBadgeProps) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.participant;
  const isHost = role === 'host';
  const roleStyle = isHost
    ? 'text-zinc-200 border-white/15 bg-white/[0.04]'
    : 'text-zinc-400 border-white/[0.07] bg-white/[0.02]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${roleStyle} ${className}`}
    >
      <RoleIcon role={role} className={iconClassName} size={size} strokeWidth={strokeWidth} />
      <span>{short ? config.shortLabel : config.label}</span>
    </span>
  );
}
