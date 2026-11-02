'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { YouTubePlayerRef } from '@/components/YouTubePlayer';
import { extractYouTubeId } from '@/lib/youtube';
import { Role, ParticipantData, RoomState, ChatMessage, ReactionData } from '@/lib/types';
import { toast } from '@/components/ui/toast';
import { AlertCircle } from 'lucide-react';

import { RoomHeader } from '@/components/room/RoomHeader';
import { VideoSection } from '@/components/room/VideoSection';
import { ChangeVideoSection } from '@/components/room/ChangeVideoSection';
import { RoomSidebar } from '@/components/room/RoomSidebar';
import { FloatingReactions } from '@/components/room/FloatingReactions';

interface RoomClientProps {
  roomId: string;
}

export default function RoomClient({ roomId }: RoomClientProps) {
  const router = useRouter();

  const socket = getSocket();
  const playerRef = useRef<YouTubePlayerRef>(null);

  const [username, setUsername] = useState<string>('');
  const [socketId, setSocketId] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [videoId, setVideoId] = useState<string>('dQw4w9WgXcQ');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [hostSocketId, setHostSocketId] = useState<string>('');
  const [kickedMessage, setKickedMessage] = useState<string | null>(null);

  const currentUser = participants.find((p) => p.socketId === socketId);
  const userRole: Role = currentUser?.role || 'participant';
  const isHost = userRole === 'host';
  const isModerator = userRole === 'moderator';
  const canControl = isHost || isModerator;

  const [copied, setCopied] = useState<boolean>(false);
  const [newVideoUrl, setNewVideoUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [floatingReactions, setFloatingReactions] = useState<ReactionData[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let storedName = localStorage.getItem('wtg_username');
    if (!storedName) {
      storedName = `User_${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem('wtg_username', storedName);
    }
    setUsername(storedName);

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);
      setSocketId(socket.id || '');
      socket.emit('join_room', { roomId, username: storedName });
    };

    const onDisconnect = () => {
      setIsConnected(false);
      toast.add({
        title: 'Connection Lost',
        description: 'Disconnected from the watch party server.',
        type: 'warning',
      });
    };

    if (socket.connected) {
      onConnect();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.on('sync_state', (state: RoomState) => {
      setVideoId(state.videoId);
      setIsPlaying(state.isPlaying);
      setParticipants(state.participants);
      setHostSocketId(state.hostSocketId);

      if (playerRef.current) {
        if (state.isPlaying) {
          playerRef.current.playVideo();
        } else {
          playerRef.current.pauseVideo();
        }

        // Re-align local player if playback drift exceeds 1.5 seconds
        const localTime = playerRef.current.getCurrentTime();
        if (Math.abs(localTime - state.currentTime) > 1.5) {
          playerRef.current.seekTo(state.currentTime);
        }
      }
    });

    socket.on('play', ({ currentTime }: { currentTime: number }) => {
      setIsPlaying(true);
      if (playerRef.current) {
        playerRef.current.playVideo();
        if (currentTime !== undefined) {
          const local = playerRef.current.getCurrentTime();
          if (Math.abs(local - currentTime) > 1.5) {
            playerRef.current.seekTo(currentTime);
          }
        }
      }
    });

    socket.on('pause', ({ currentTime }: { currentTime: number }) => {
      setIsPlaying(false);
      if (playerRef.current) {
        playerRef.current.pauseVideo();
        if (currentTime !== undefined) {
          playerRef.current.seekTo(currentTime);
        }
      }
    });

    socket.on('seek', ({ time }: { time: number }) => {
      if (playerRef.current) {
        playerRef.current.seekTo(time);
      }
    });

    socket.on('change_video', ({ videoId: newId }: { videoId: string }) => {
      setVideoId(newId);
      setIsPlaying(true);
      if (playerRef.current) {
        playerRef.current.loadVideo(newId);
      }
      toast.add({
        title: 'Video Updated',
        description: 'A new video was loaded in the room.',
        type: 'info',
      });
    });

    socket.on('user_joined', (data: any) => {
      setParticipants(data.participants);
      if (data.userId !== socket.id) {
        toast.add({
          title: 'Participant Joined',
          description: `${data.username} entered the room.`,
          type: 'info',
        });
      }
    });

    socket.on('user_left', (data: any) => {
      setParticipants(data.participants);
      if (data.hostSocketId) setHostSocketId(data.hostSocketId);
      toast.add({
        title: 'Participant Left',
        description: `${data.username} left the party.`,
        type: 'info',
      });
    });

    socket.on('role_assigned', (data: any) => {
      setParticipants(data.participants);
      if (data.hostSocketId) setHostSocketId(data.hostSocketId);

      if (data.userId === socket.id) {
        toast.add({
          title: 'Role Updated',
          description: `You are now a ${data.role}!`,
          type: 'success',
        });
      } else {
        toast.add({
          title: 'Role Changed',
          description: `${data.username} is now a ${data.role}.`,
          type: 'info',
        });
      }
    });

    socket.on('participant_removed', (data: any) => {
      setParticipants(data.participants);
    });

    socket.on('kicked', () => {
      setKickedMessage('You have been removed from the room by the host.');
      toast.add({
        title: 'Removed from Room',
        description: 'The host removed you from this watch party.',
        type: 'error',
      });
    });

    socket.on('error_message', (data: { message: string }) => {
      toast.add({
        title: 'Action Not Permitted',
        description: data.message,
        type: 'error',
      });
    });

    socket.on('new_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('new_reaction', (reaction: { emoji: string; username: string }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setFloatingReactions((prev) => [
        ...prev,
        { id, emoji: reaction.emoji, username: reaction.username },
      ]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2500);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('sync_state');
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
      socket.off('change_video');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('role_assigned');
      socket.off('participant_removed');
      socket.off('kicked');
      socket.off('error_message');
      socket.off('new_message');
      socket.off('new_reaction');
      socket.emit('leave_room');
    };
  }, [roomId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTogglePlay = () => {
    if (!canControl) return;
    const currentTime = playerRef.current?.getCurrentTime() || 0;
    if (isPlaying) {
      setIsPlaying(false);
      playerRef.current?.pauseVideo();
      socket.emit('pause', { roomId, currentTime });
    } else {
      setIsPlaying(true);
      playerRef.current?.playVideo();
      socket.emit('play', { roomId, currentTime });
    }
  };

  const handleSeekOffset = (seconds: number) => {
    if (!canControl) return;
    const current = playerRef.current?.getCurrentTime() || 0;
    const newTime = Math.max(0, current + seconds);
    playerRef.current?.seekTo(newTime);
    socket.emit('seek', { roomId, time: newTime });
  };

  const handleChangeVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canControl) return;

    const extractedId = extractYouTubeId(newVideoUrl);
    if (!extractedId) {
      toast.add({
        title: 'Invalid Video URL',
        description: 'Please paste a valid YouTube video link or 11-character video ID.',
        type: 'error',
      });
      return;
    }

    socket.emit('change_video', { roomId, videoId: extractedId });
    setNewVideoUrl('');
  };

  const handleAssignRole = (targetUserId: string, newRole: Role) => {
    if (!isHost) return;
    socket.emit('assign_role', { roomId, userId: targetUserId, role: newRole });
  };

  const handleRemoveUser = (targetUserId: string) => {
    if (!isHost) return;
    socket.emit('remove_participant', { roomId, userId: targetUserId });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('send_message', { roomId, text: chatInput.trim() });
    setChatInput('');
  };

  const handleSendReaction = (emoji: string) => {
    socket.emit('send_reaction', { roomId, emoji });
  };

  const copyRoomLink = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.add({
      title: 'Invite Link Copied',
      description: 'Room URL copied to your clipboard.',
      type: 'success',
    });
  };

  if (kickedMessage) {
    return (
      <div className="min-h-screen bg-[#05090a] flex flex-col items-center justify-center p-6 text-center text-zinc-100">
        <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold mb-2 text-zinc-200">Removed from Room</h1>
        <p className="text-zinc-500 max-w-sm mb-6 text-xs">{kickedMessage}</p>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] font-medium text-zinc-200 transition-colors text-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05090a] text-zinc-100 flex flex-col justify-between selection:bg-teal-400 selection:text-black">
      {/* Background radial glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[75vw] max-w-[1200px] h-[450px] blur-[60px] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 75% 450px at 50% 0%, rgba(20, 90, 80, 0.32) 0%, rgba(15, 61, 56, 0.18) 35%, rgba(5, 20, 18, 0.06) 65%, transparent 80%)',
          }}
        />
      </div>

      {/* Floating Reactions Overlay */}
      <FloatingReactions reactions={floatingReactions} />

      {/* Slim, Low-contrast Header */}
      <RoomHeader
        roomId={roomId}
        isConnected={isConnected}
        userRole={userRole}
        copied={copied}
        onCopyRoomLink={copyRoomLink}
        onLeaveRoom={() => router.push('/')}
      />

      {/* Main Area: Two-column grid (~70% / 30%) with Equal Height columns */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px] gap-6 items-stretch">
        {/* Left Column: Video + Attached Control Bar + Compact Change Video Row */}
        <div className="flex flex-col gap-3 min-w-0">
          <VideoSection
            playerRef={playerRef}
            videoId={videoId}
            isPlaying={isPlaying}
            canControl={canControl}
            onLocalPlay={(time) => {
              setIsPlaying(true);
              socket.emit('play', { roomId, currentTime: time });
            }}
            onLocalPause={(time) => {
              setIsPlaying(false);
              socket.emit('pause', { roomId, currentTime: time });
            }}
            onLocalSeek={(time) => {
              socket.emit('seek', { roomId, time });
            }}
            onTogglePlay={handleTogglePlay}
            onSeekOffset={handleSeekOffset}
          />

          <ChangeVideoSection
            newVideoUrl={newVideoUrl}
            onVideoUrlChange={setNewVideoUrl}
            onSubmit={handleChangeVideo}
            canControl={canControl}
          />
        </div>

        {/* Right Column: Equal-height Tabbed Panel */}
        <div className="min-w-0 h-[520px] lg:h-auto flex flex-col">
          <RoomSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            messages={messages}
            participants={participants}
            currentSocketId={socketId}
            isHost={isHost}
            chatInput={chatInput}
            onChatInputChange={setChatInput}
            onSendMessage={handleSendMessage}
            onSendReaction={handleSendReaction}
            onAssignRole={handleAssignRole}
            onRemoveUser={handleRemoveUser}
            chatBottomRef={chatBottomRef}
          />
        </div>
      </main>
    </div>
  );
}
