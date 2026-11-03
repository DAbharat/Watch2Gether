'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { YouTubePlayerRef } from '@/components/YouTubePlayer';
import { extractYouTubeId } from '@/lib/youtube';
import { Role, ParticipantData, RoomState, ChatMessage, ReactionData } from '@/lib/types';
import { toast } from '@/components/ui/toast';
import { AlertCircle } from 'lucide-react';

import { RoomHeader } from '@/components/room/RoomHeader';
import { VideoSection } from '@/components/room/VideoSection';
import { ParticipantsCard } from '@/components/room/ParticipantsCard';
import { ChatBox } from '@/components/room/ChatBox';
import { ChangeVideoModal } from '@/components/room/ChangeVideoModal';
import { ParticipantsModal } from '@/components/room/ParticipantsModal';
import { FloatingReactions } from '@/components/room/FloatingReactions';
import { resetParticipantOrder } from '@/lib/avatars';

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

  const hostParticipant = participants.find(
    (p) => p.role === 'host' || p.socketId === hostSocketId
  );
  const [isChangeVideoOpen, setIsChangeVideoOpen] = useState<boolean>(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState<boolean>(false);

  const [copied, setCopied] = useState<boolean>(false);
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

    socket.on('participants_update', (updatedParticipants: ParticipantData[]) => {
      setParticipants(updatedParticipants);
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });

    socket.on('reaction', (reaction: ReactionData) => {
      setFloatingReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3500);
    });

    socket.on('role_changed', ({ socketId: changedId, newRole }: { socketId: string; newRole: Role }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === changedId ? { ...p, role: newRole } : p))
      );
      if (changedId === socketId) {
        const label = newRole === 'moderator' ? 'Moderator' : 'Participant';
        toast.add({
          title: 'Role Updated',
          description: `You are now a ${label}.`,
          type: 'info',
        });
      }
    });

    socket.on('kicked', ({ message }: { message: string }) => {
      setKickedMessage(message || 'You have been removed from the room.');
      socket.disconnect();
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('sync_state');
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
      socket.off('change_video');
      socket.off('participants_update');
      socket.off('chat_message');
      socket.off('reaction');
      socket.off('role_changed');
      socket.off('kicked');
    };
  }, [roomId]);

  const handleTogglePlay = () => {
    if (!canControl || !playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime();
    if (isPlaying) {
      setIsPlaying(false);
      playerRef.current.pauseVideo();
      socket.emit('pause', { roomId, currentTime });
    } else {
      setIsPlaying(true);
      playerRef.current.playVideo();
      socket.emit('play', { roomId, currentTime });
    }
  };

  const handleChangeVideo = (url: string) => {
    const newVideoId = extractYouTubeId(url);
    if (!newVideoId) {
      toast.add({
        title: 'Invalid URL',
        description: 'Please enter a valid YouTube URL.',
        type: 'error',
      });
      return;
    }
    socket.emit('change_video', { roomId, videoId: newVideoId });
    setIsChangeVideoOpen(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('chat_message', { roomId, text: chatInput.trim() });
    setChatInput('');
  };

  const handleSendReaction = (emoji: string) => {
    socket.emit('reaction', { roomId, emoji });
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAssignRole = (targetSocketId: string, newRole: Role) => {
    socket.emit('assign_role', { roomId, targetSocketId, newRole });
  };

  const handleRemoveUser = (targetSocketId: string) => {
    socket.emit('kick_user', { roomId, targetSocketId });
  };

  if (kickedMessage) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0b0c0f] text-zinc-100">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
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
    <div className="h-screen w-screen max-h-screen overflow-hidden text-white flex flex-col justify-center items-center p-3 sm:p-5 lg:p-7 relative select-none">
      {/* Background Image: watch2gether.jpg (less brighter with subtle dark veil) */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
        <Image
          src="/bg/watch2gether.jpg"
          alt="Sunset Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center brightness-[0.88] contrast-[1.05]"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <FloatingReactions reactions={floatingReactions} />

      {/* Main Centered Application Frame (constrained to match reference mockup alignment) */}
      <div className="w-full max-w-[1360px] 2xl:max-w-[1480px] h-full max-h-[880px] flex flex-col justify-between mx-auto overflow-hidden">
        {/* Top Navigation & Room Banner Card matching screenshot */}
        <RoomHeader
          roomId={roomId}
          hostParticipant={hostParticipant}
          currentUser={currentUser}
          participants={participants}
          isConnected={isConnected}
          canControl={canControl}
          copied={copied}
          onCopyRoomLink={copyRoomLink}
          onSubmitUrl={handleChangeVideo}
          onLeaveRoom={() => router.push('/')}
        />

        {/* Main Content Area: Left Video & Controls + Right 2 Stacked Cards (Participants & Chat) */}
        <div className="flex-1 min-h-0 w-full flex flex-col lg:flex-row overflow-hidden gap-3.5 lg:gap-4 xl:gap-5">
          {/* Left Column: Video Area & Controls Bar */}
          <div className="flex-1 min-w-0 h-full flex flex-col justify-between overflow-hidden">
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
              onOpenChangeVideo={() => setIsChangeVideoOpen(true)}
            />
          </div>

          {/* Right Column: Two Stacked Cards matching screenshot (Participants Card on Top, Chat on Bottom) */}
          <div className="w-full lg:w-[320px] xl:w-[350px] 2xl:w-[370px] shrink-0 h-full min-h-0 flex flex-col justify-between overflow-hidden">
            <ParticipantsCard
              participants={participants}
              currentSocketId={socketId}
              isHost={isHost}
              onOpenModal={() => setIsParticipantsOpen(true)}
            />

            <ChatBox
              messages={messages}
              participants={participants}
              currentSocketId={socketId}
              chatInput={chatInput}
              onChatInputChange={setChatInput}
              onSendMessage={handleSendMessage}
              onSendReaction={handleSendReaction}
              onOpenParticipants={() => setIsParticipantsOpen(true)}
              chatBottomRef={chatBottomRef}
            />
          </div>
        </div>
      </div>

      {/* Modal: Change Video URL (triggered by Room Settings button) */}
      <ChangeVideoModal
        isOpen={isChangeVideoOpen}
        onClose={() => setIsChangeVideoOpen(false)}
        onSubmitUrl={handleChangeVideo}
        canControl={canControl}
      />

      {/* Modal: Room Participants Roster & Moderation */}
      <ParticipantsModal
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        participants={participants}
        currentSocketId={socketId}
        isHost={isHost}
        onAssignRole={handleAssignRole}
        onRemoveUser={handleRemoveUser}
      />
    </div>
  );
}
