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
  const isMod = role === 'moderator';

  const roleStyle = isHost
    ? 'text-white border-white/25 bg-white/[0.10] shadow-sm font-semibold'
    : isMod
    ? 'text-blue-300 border-blue-500/30 bg-blue-500/15 font-semibold'
    : 'text-white/80 border-white/15 bg-white/[0.05] font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] border backdrop-blur-md ${roleStyle} ${className}`}
    >
      <RoleIcon role={role} className={iconClassName} size={size} strokeWidth={strokeWidth} />
      <span>{short ? config.shortLabel : config.label}</span>
    </span>
  );
}
