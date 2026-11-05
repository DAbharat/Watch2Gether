export type Role = 'host' | 'moderator' | 'participant';

export interface ParticipantData {
  userId: string;
  socketId: string;
  username: string;
  role: Role;
  joinedAt: number;
  avatar?: string;
  connected?: boolean;
}

export interface RoomState {
  roomId: string;
  videoId: string;
  currentTime: number;
  isPlaying: boolean;
  playState: 'playing' | 'paused';
  hostSocketId: string;
  participants: ParticipantData[];
  messages?: ChatMessage[];
  anchorPosition?: number;
  anchorServerTime?: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  role: Role;
  text: string;
  timestamp: number;
  avatar?: string;
}

export interface ReactionData {
  id: string;
  emoji: string;
  username: string;
}

export interface VideoRequest {
  requestId: string;
  userId: string;
  username: string;
  videoId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  action?: 'play_now' | 'queue' | 'reject';
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface QueueItem {
  videoId: string;
  requestedBy: string;
  requestedByUsername: string;
  approvedAt: number;
}
