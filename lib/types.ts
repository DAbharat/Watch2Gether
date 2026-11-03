export type Role = 'host' | 'moderator' | 'participant';

export interface ParticipantData {
  userId: string;
  socketId: string;
  username: string;
  role: Role;
  joinedAt: number;
  avatar?: string;
}

export interface RoomState {
  roomId: string;
  videoId: string;
  currentTime: number;
  isPlaying: boolean;
  playState: 'playing' | 'paused';
  hostSocketId: string;
  participants: ParticipantData[];
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
