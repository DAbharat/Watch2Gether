import { ParticipantData } from './types';

/**
 * Standard list of avatars provided by shadcn/ui.
 * Downloaded and served locally from /public/avatars/
 */
export const SHADCN_AVATARS: string[] = [
  '/avatars/01.png',
  '/avatars/02.png',
  '/avatars/03.png',
  '/avatars/04.png',
  '/avatars/05.png',
];

// Session-level stable index cache to keep participant avatars deterministic
const sessionOrderMap = new Map<string, number>();
let sessionCounter = 0;

/**
 * Registers participants into a deterministic join sequence.
 * Sorted by joinedAt timestamp ascending.
 */
export function registerParticipantOrder(participants: ParticipantData[]): void {
  const sorted = [...participants].sort((a, b) => {
    const timeA = a.joinedAt ?? 0;
    const timeB = b.joinedAt ?? 0;
    if (timeA !== timeB) return timeA - timeB;
    return (a.socketId || a.userId || '').localeCompare(b.socketId || b.userId || '');
  });

  for (const p of sorted) {
    const key = p.socketId || p.userId;
    if (key && !sessionOrderMap.has(key)) {
      sessionOrderMap.set(key, sessionCounter++);
    }
  }
}

/**
 * Reset participant order map (e.g. when room changes or unmounts)
 */
export function resetParticipantOrder(): void {
  sessionOrderMap.clear();
  sessionCounter = 0;
}

/**
 * Allocates and retrieves an avatar from the shadcn avatars list.
 * Allocates sequentially 1-5 for first 1-5 joined users based on timestamp,
 * and cycles back to 1st avatar when exhausted (users 6-10 get 1-5, users 11-15 get 1-5, etc.).
 */
export function getAvatarForUser(
  user: {
    socketId?: string;
    userId?: string;
    username?: string;
    joinedAt?: number;
    avatar?: string;
  } | null | undefined,
  participants: ParticipantData[] = []
): string {
  if (!user) return SHADCN_AVATARS[0];

  // 1. If explicit avatar property exists (e.g. assigned by server), use it
  if (user.avatar) return user.avatar;

  const userKey = user.socketId || user.userId;

  // 2. If present in participants list with avatar
  if (userKey && participants.length > 0) {
    const found = participants.find((p) => p.socketId === userKey || p.userId === userKey);
    if (found?.avatar) return found.avatar;
  }

  // 3. Register current participants into order tracker
  if (participants.length > 0) {
    registerParticipantOrder(participants);
  }

  // 4. Return cached join order avatar if available
  if (userKey && sessionOrderMap.has(userKey)) {
    const index = sessionOrderMap.get(userKey)!;
    return SHADCN_AVATARS[index % SHADCN_AVATARS.length];
  }

  // 5. Fallback calculate dynamically from sorted participants
  if (participants.length > 0) {
    const sorted = [...participants].sort((a, b) => {
      const timeA = a.joinedAt ?? 0;
      const timeB = b.joinedAt ?? 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.socketId || a.userId || '').localeCompare(b.socketId || b.userId || '');
    });

    const idx = sorted.findIndex(
      (p) =>
        (userKey && (p.socketId === userKey || p.userId === userKey)) ||
        (user.username && p.username === user.username)
    );

    if (idx !== -1) {
      if (userKey) sessionOrderMap.set(userKey, idx);
      return SHADCN_AVATARS[idx % SHADCN_AVATARS.length];
    }
  }

  // 6. If userKey is seen for first time without participants list
  if (userKey) {
    const newIdx = sessionCounter++;
    sessionOrderMap.set(userKey, newIdx);
    return SHADCN_AVATARS[newIdx % SHADCN_AVATARS.length];
  }

  return SHADCN_AVATARS[0];
}
