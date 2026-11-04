'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { YouTubePlayerRef } from '@/components/YouTubePlayer';
import { extractYouTubeId } from '@/lib/youtube';
import { Role, ParticipantData, RoomState, ChatMessage, ReactionData, VideoRequest, QueueItem } from '@/lib/types';
import { toast } from '@/components/ui/toast';
import { AlertCircle } from 'lucide-react';

import { RoomHeader } from '@/components/room/RoomHeader';
import { VideoSection } from '@/components/room/VideoSection';
import { RoomSidebar } from '@/components/room/RoomSidebar';
import { ChangeVideoModal } from '@/components/room/ChangeVideoModal';
import { ParticipantsModal } from '@/components/room/ParticipantsModal';
import { SetUsernameModal } from '@/components/room/SetUsernameModal';
import { FloatingReactions } from '@/components/room/FloatingReactions';
import { resetParticipantOrder } from '@/lib/avatars';
import { getStableParticipant } from '@/lib/participant';

interface RoomClientProps {
  roomId: string;
}

export default function RoomClient({ roomId }: RoomClientProps) {
  const router = useRouter();

  const socket = getSocket();
  const playerRef = useRef<YouTubePlayerRef>(null);

  const { participantId, participantToken } = getStableParticipant(roomId);

  const [username, setUsername] = useState<string>('');
  const [socketId, setSocketId] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [videoId, setVideoId] = useState<string>('dQw4w9WgXcQ');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [hostSocketId, setHostSocketId] = useState<string>('');
  const [kickedMessage, setKickedMessage] = useState<string | null>(null);

  const currentUser = participants.find(
    (p) => (participantId && p.userId === participantId) || p.socketId === socketId
  );
  const userRole: Role = currentUser?.role || 'participant';
  const isHost = userRole === 'host';
  const isModerator = userRole === 'moderator';
  const canControl = isHost || isModerator;

  const hostParticipant = participants.find(
    (p) => p.role === 'host' || (hostSocketId && p.socketId === hostSocketId)
  );
  const [isChangeVideoOpen, setIsChangeVideoOpen] = useState<boolean>(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState<boolean>(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState<boolean>(false);

  const [copied, setCopied] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [typingUsers, setTypingUsers] = useState<{ userId: string; username: string }[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<ReactionData[]>([]);
  const [requests, setRequests] = useState<VideoRequest[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 1. Clock Offset (NTP Synchronization): serverTime = Date.now() + clientServerOffset
  const clientServerOffsetRef = useRef<number>(0);
  const getServerNow = () => Date.now() + clientServerOffsetRef.current;

  // 2. Server-Authoritative Timeline State (Master Clock)
  const timelineRef = useRef<{
    anchorPosition: number;
    anchorServerTime: number;
    isPlaying: boolean;
    videoId: string;
  }>({
    anchorPosition: 0,
    anchorServerTime: Date.now(),
    isPlaying: false,
    videoId: '',
  });

  const getTargetPlayheadPosition = () => {
    const { anchorPosition, anchorServerTime, isPlaying: playing } = timelineRef.current;
    if (!playing) return anchorPosition;
    const serverNow = getServerNow();
    const elapsedSec = Math.max(0, (serverNow - anchorServerTime) / 1000);
    return Math.max(0, anchorPosition + elapsedSec);
  };

  const lastHardSeekRef = useRef<number>(0);
  const lastLocalActionRef = useRef<number>(0);

  const canControlRef = useRef<boolean>(canControl);
  useEffect(() => {
    canControlRef.current = canControl;
  }, [canControl]);

  const isPlayingRef = useRef<boolean>(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const handlePlayerReady = () => {
    if (!playerRef.current) return;
    const { isPlaying: shouldPlay } = timelineRef.current;
    const targetTime = getTargetPlayheadPosition();
    if (targetTime > 0) {
      playerRef.current.seekTo(targetTime);
    }
    if (!canControlRef.current && shouldPlay) {
      playerRef.current.playVideo();
    }
  };

  useEffect(() => {
    let storedName = localStorage.getItem('wtg_username');
    const isCustom = localStorage.getItem('wtg_username_custom') === 'true';
    const isDefaultName = !storedName || /^User_\d+$/i.test(storedName.trim());

    if (!storedName) {
      storedName = `User_${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem('wtg_username', storedName);
    }
    setUsername(storedName);

    // If joining with a default system-generated username, prompt them to personalize it
    let promptTimer: NodeJS.Timeout | undefined;
    if (isDefaultName && !isCustom) {
      promptTimer = setTimeout(() => {
        setIsNameModalOpen(true);
      }, 500);
    }

    if (!socket.connected) {
      socket.connect();
    }

    // NTP ping/pong for sub-millisecond clock synchronization
    const pingNtp = () => {
      if (socket.connected) {
        socket.emit('ntp_ping', { clientSendTime: Date.now() });
      }
    };

    socket.on('ntp_pong', ({ clientSendTime, serverTime }: { clientSendTime: number; serverTime: number }) => {
      const now = Date.now();
      const rtt = Math.max(0, now - clientSendTime);
      const estimatedServerTime = serverTime + (rtt / 2);
      const offset = estimatedServerTime - now;

      if (clientServerOffsetRef.current === 0) {
        clientServerOffsetRef.current = offset;
      } else {
        clientServerOffsetRef.current = clientServerOffsetRef.current * 0.7 + offset * 0.3;
      }
    });

    const onConnect = () => {
      setIsConnected(true);
      setSocketId(socket.id || '');
      socket.emit('join_room', {
        roomId,
        username: storedName,
        participantId,
        participantToken,
      });
      // Initial NTP clock synchronization
      pingNtp();
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

    const ntpInterval = setInterval(pingNtp, 4000);

    socket.on('sync_state', (state: RoomState) => {
      const anchorPos = state.anchorPosition !== undefined ? state.anchorPosition : state.currentTime;
      const anchorTime = state.anchorServerTime || getServerNow();

      // If room is paused according to server state, always enforce paused!
      if (!state.isPlaying) {
        timelineRef.current = {
          anchorPosition: anchorPos,
          anchorServerTime: anchorTime,
          isPlaying: false,
          videoId: state.videoId,
        };
        setVideoId(state.videoId);
        setIsPlaying(false);
        setParticipants(state.participants);
        setHostSocketId(state.hostSocketId);
        if (state.messages && state.messages.length > 0) {
          setMessages(state.messages);
        }
        if (playerRef.current && !canControlRef.current) {
          playerRef.current.setPlaybackRate(1);
          if (anchorPos >= 0) {
            playerRef.current.seekTo(anchorPos);
          }
          playerRef.current.pauseVideo();
        }
        return;
      }

      // If state.isPlaying is true, drop only if anchorServerTime is older than our currently applied timeline
      if (state.anchorServerTime && state.anchorServerTime < timelineRef.current.anchorServerTime) {
        return;
      }

      timelineRef.current = {
        anchorPosition: anchorPos,
        anchorServerTime: anchorTime,
        isPlaying: true,
        videoId: state.videoId,
      };

      setVideoId(state.videoId);
      setIsPlaying(true);
      setParticipants(state.participants);
      setHostSocketId(state.hostSocketId);
      if (state.messages && state.messages.length > 0) {
        setMessages(state.messages);
      }

      // Initial alignment or recovery for viewer
      if (playerRef.current && !canControlRef.current) {
        const targetTime = getTargetPlayheadPosition();
        if (targetTime >= 0) {
          playerRef.current.seekTo(targetTime);
        }
        playerRef.current.playVideo();
      }
    });

    socket.on('play', ({ currentTime, anchorPosition, anchorServerTime }: { currentTime: number; anchorPosition?: number; anchorServerTime?: number }) => {
      const anchorPos = anchorPosition !== undefined ? anchorPosition : currentTime;
      const anchorTime = anchorServerTime || getServerNow();

      if (anchorTime < timelineRef.current.anchorServerTime) return;

      timelineRef.current = {
        anchorPosition: anchorPos,
        anchorServerTime: anchorTime,
        isPlaying: true,
        videoId: timelineRef.current.videoId,
      };

      setIsPlaying(true);

      if (playerRef.current) {
        const targetTime = getTargetPlayheadPosition();
        if (targetTime >= 0) {
          playerRef.current.seekTo(targetTime);
        }
        playerRef.current.setPlaybackRate(1);
        playerRef.current.playVideo();
      }
    });

    socket.on('pause', ({ currentTime, anchorPosition, anchorServerTime }: { currentTime: number; anchorPosition?: number; anchorServerTime?: number }) => {
      const anchorPos = anchorPosition !== undefined ? anchorPosition : currentTime;
      const anchorTime = anchorServerTime || getServerNow();

      // Pause from host is an absolute directive: always apply
      timelineRef.current = {
        anchorPosition: anchorPos,
        anchorServerTime: anchorTime,
        isPlaying: false,
        videoId: timelineRef.current.videoId,
      };

      setIsPlaying(false);

      if (playerRef.current) {
        playerRef.current.setPlaybackRate(1);
        if (anchorPos !== undefined && !isNaN(anchorPos) && anchorPos >= 0) {
          playerRef.current.seekTo(anchorPos);
        }
        playerRef.current.pauseVideo();
      }
    });

    socket.on('seek', ({ time, anchorPosition, anchorServerTime }: { time: number; anchorPosition?: number; anchorServerTime?: number }) => {
      const anchorPos = anchorPosition !== undefined ? anchorPosition : time;
      const anchorTime = anchorServerTime || getServerNow();

      if (anchorTime < timelineRef.current.anchorServerTime) return;

      timelineRef.current.anchorPosition = anchorPos;
      timelineRef.current.anchorServerTime = anchorTime;

      if (playerRef.current) {
        const targetTime = getTargetPlayheadPosition();
        playerRef.current.seekTo(targetTime);
        playerRef.current.setPlaybackRate(1);
      }
    });

    socket.on('playback_sync', ({ currentTime, isPlaying: roomIsPlaying, anchorPosition, anchorServerTime }: { currentTime: number; isPlaying: boolean; anchorPosition?: number; anchorServerTime?: number }) => {
      const anchorPos = anchorPosition !== undefined ? anchorPosition : currentTime;
      const anchorTime = anchorServerTime || getServerNow();

      if (!roomIsPlaying) {
        timelineRef.current = {
          anchorPosition: anchorPos,
          anchorServerTime: anchorTime,
          isPlaying: false,
          videoId: timelineRef.current.videoId,
        };
        setIsPlaying(false);
        if (playerRef.current) {
          playerRef.current.pauseVideo();
        }
        return;
      }

      if (anchorTime < timelineRef.current.anchorServerTime && timelineRef.current.isPlaying) return;

      timelineRef.current = {
        anchorPosition: anchorPos,
        anchorServerTime: anchorTime,
        isPlaying: true,
        videoId: timelineRef.current.videoId,
      };

      if (canControlRef.current || !playerRef.current) return;

      const pState = playerRef.current.getPlayerState();
      setIsPlaying(true);
      if (pState !== 1 && pState !== 3) {
        const targetTime = getTargetPlayheadPosition();
        playerRef.current.seekTo(targetTime);
        playerRef.current.playVideo();
      }
    });

    socket.on('change_video', ({ videoId: newId }: { videoId: string }) => {
      setVideoId(newId);
      setIsPlaying(true);
      timelineRef.current = {
        anchorPosition: 0,
        anchorServerTime: getServerNow(),
        isPlaying: true,
        videoId: newId,
      };
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

    socket.on('user_joined', ({ participants: updatedList, participant: newParticipant, userId, username, role }: {
      participants?: ParticipantData[];
      participant?: ParticipantData;
      userId?: string;
      username?: string;
      role?: Role;
    }) => {
      if (updatedList && updatedList.length > 0) {
        setParticipants(updatedList);
      } else if (newParticipant) {
        setParticipants((prev) => {
          if (prev.some((p) => p.userId === newParticipant.userId)) return prev;
          return [...prev, newParticipant];
        });
      } else if (userId) {
        setParticipants((prev) => {
          if (prev.some((p) => p.userId === userId)) return prev;
          return [...prev, {
            userId,
            socketId: '',
            username: username || 'User',
            role: role || 'participant',
            joinedAt: Date.now(),
          }];
        });
      }
    });

    socket.on('user_left', ({ userId, participants: updatedList }: { userId?: string; participants?: ParticipantData[] }) => {
      if (updatedList && updatedList.length > 0) {
        setParticipants(updatedList);
      } else if (userId) {
        setParticipants((prev) => prev.filter((p) => p.userId !== userId));
      }
    });

    socket.on('user_typing', ({ userId, username: typingName, isTyping }: { userId: string; username: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          if (prev.some((u) => u.userId === userId)) return prev;
          return [...prev, { userId, username: typingName }];
        } else {
          return prev.filter((u) => u.userId !== userId);
        }
      });
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
        prev.map((p) => (p.socketId === changedId || p.userId === changedId ? { ...p, role: newRole } : p))
      );
      if (changedId === socketId || changedId === participantId) {
        const label = newRole === 'moderator' ? 'Moderator' : newRole === 'host' ? 'Host' : 'Participant';
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

    socket.on('requests_sync', ({ requests: syncedRequests }: { requests: VideoRequest[] }) => {
      setRequests(syncedRequests || []);
    });

    socket.on('request_created', ({ request }: { request: VideoRequest }) => {
      setRequests((prev) => {
        const exists = prev.some((r) => r.requestId === request.requestId);
        if (exists) return prev;
        return [request, ...prev];
      });
      if (canControlRef.current) {
        toast.add({
          title: 'New Video Request',
          description: `${request.username} requested a video.`,
          type: 'info',
        });
      }
    });

    socket.on('request_updated', ({ request, message }: { request: VideoRequest; message?: string }) => {
      setRequests((prev) => prev.map((r) => (r.requestId === request.requestId ? request : r)));
      if (message) {
        toast.add({
          title: 'Video Request',
          description: message,
          type: request.status === 'accepted' ? 'success' : 'info',
        });
      }
    });

    socket.on('queue_updated', ({ queue: updatedQueue }: { queue: QueueItem[] }) => {
      setQueue(updatedQueue || []);
    });

    socket.on('request_notification', ({ message, type }: { message: string; type: string }) => {
      toast.add({
        title: 'Video Request',
        description: message,
        type: type === 'success' ? 'success' : 'info',
      });
    });

    // Discord State Reconciliation Engine (Every 800ms)
    // Silently matches playhead using variable playbackRate to eliminate micro-seeks and audio stuttering
    const reconcileInterval = setInterval(() => {
      if (canControlRef.current || !playerRef.current) return;

      const pState = playerRef.current.getPlayerState();

      // IF ROOM IS PAUSED: Definitively enforce pause on viewer player
      if (!timelineRef.current.isPlaying || !isPlayingRef.current) {
        if (pState === 1 || pState === 3) {
          playerRef.current.pauseVideo();
        }
        return;
      }

      if (pState !== 1) return; // Only adjust rate when video is actively playing

      const targetTime = getTargetPlayheadPosition();
      const localTime = playerRef.current.getCurrentTime();
      const driftSec = localTime - targetTime;
      const absDriftMs = Math.abs(driftSec) * 1000;
      const currentRate = playerRef.current.getPlaybackRate();

      // Tier 1: Silent Drift (Δ < 150ms)
      // Imperceptible: do nothing, leave rate at 1.0x to avoid any audio distortion
      if (absDriftMs < 150) {
        if (currentRate !== 1) {
          playerRef.current.setPlaybackRate(1);
        }
        return;
      }

      // Tier 2: Elastic Catch-Up (150ms <= Δ < 1000ms)
      // Smoothly speed up (1.05x) or slow down (0.95x) playback rate without cutting audio
      if (absDriftMs >= 150 && absDriftMs < 1000) {
        if (driftSec < 0) {
          // Viewer is behind host: 1.05x speed
          if (currentRate !== 1.05) {
            playerRef.current.setPlaybackRate(1.05);
          }
        } else {
          // Viewer is ahead of host: 0.95x speed
          if (currentRate !== 0.95) {
            playerRef.current.setPlaybackRate(0.95);
          }
        }
        return;
      }

      // Tier 3: Hard Snap Sync (Δ >= 1000ms)
      // Severe lag (e.g. tab buffering / packet drop): perform hard seekTo snap
      const now = Date.now();
      if (now - lastHardSeekRef.current > 1500) {
        lastHardSeekRef.current = now;
        playerRef.current.seekTo(targetTime);
        if (currentRate !== 1) {
          playerRef.current.setPlaybackRate(1);
        }
      }
    }, 800);

    // Continuous precision heartbeat from controller to room (every 1000ms)
    const heartbeatInterval = setInterval(() => {
      if (canControlRef.current && isPlayingRef.current && playerRef.current && socket.connected) {
        const curTime = playerRef.current.getCurrentTime();
        if (typeof curTime === 'number' && !isNaN(curTime)) {
          socket.emit('playback_heartbeat', {
            roomId,
            currentTime: curTime,
            isPlaying: true,
            timestamp: Date.now(),
          });
        }
      }
    }, 1000);

    return () => {
      if (promptTimer) clearTimeout(promptTimer);
      clearInterval(reconcileInterval);
      clearInterval(ntpInterval);
      clearInterval(heartbeatInterval);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('ntp_pong');
      socket.off('sync_state');
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
      socket.off('playback_sync');
      socket.off('change_video');
      socket.off('participants_update');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('user_typing');
      socket.off('chat_message');
      socket.off('reaction');
      socket.off('role_changed');
      socket.off('kicked');
      socket.off('requests_sync');
      socket.off('request_created');
      socket.off('request_updated');
      socket.off('queue_updated');
      socket.off('request_notification');
    };
  }, [roomId]);

  const handleTogglePlay = () => {
    if (!canControl || !playerRef.current) return;
    const now = Date.now();
    if (now - lastLocalActionRef.current < 350) return;
    lastLocalActionRef.current = now;

    const currentTime = playerRef.current.getCurrentTime();
    if (isPlaying) {
      setIsPlaying(false);
      playerRef.current.pauseVideo();
      playerRef.current.setPlaybackRate(1);
      socket.emit('pause', { roomId, currentTime, timestamp: now });
    } else {
      setIsPlaying(true);
      playerRef.current.playVideo();
      playerRef.current.setPlaybackRate(1);
      socket.emit('play', { roomId, currentTime, timestamp: now });
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
    socket.emit('typing_stop', { roomId });
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

  const handleAssignRole = (targetId: string, newRole: Role) => {
    socket.emit('assign_role', { roomId, userId: targetId, targetSocketId: targetId, newRole });
  };

  const handleTransferHost = (targetId: string) => {
    socket.emit('transfer_host', { roomId, userId: targetId });
  };

  const handleRemoveUser = (targetId: string) => {
    socket.emit('kick_user', { roomId, userId: targetId, targetSocketId: targetId });
  };

  const handleRequestVideo = (videoUrl: string) => {
    socket.emit('request_video', {
      roomId,
      participantToken,
      videoUrl,
    });
  };

  const handleResolveRequest = (requestId: string, action: 'play_now' | 'queue' | 'reject') => {
    socket.emit('resolve_request', {
      roomId,
      participantToken,
      requestId,
      action,
    });
  };

  const handleVideoEnded = () => {
    if (canControlRef.current) {
      socket.emit('video_ended', {
        roomId,
        videoId,
        participantToken,
      });
    }
  };

  const handleSaveUsername = (newName: string) => {
    const clean = newName.trim().slice(0, 25);
    if (!clean) return;

    localStorage.setItem('wtg_username', clean);
    localStorage.setItem('wtg_username_custom', 'true');
    setUsername(clean);

    socket.emit('join_room', {
      roomId,
      username: clean,
      participantId,
      participantToken,
    });

    setIsNameModalOpen(false);

    toast.add({
      title: 'Name Saved',
      description: `You are now known as "${clean}".`,
      type: 'success',
    });
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
    <div className="h-screen w-screen max-h-screen overflow-hidden text-white flex flex-col justify-center items-center p-3 sm:p-5 lg:p-7 xl:p-9 max-lg:p-2.5 relative select-none">
      {/* Background Image: watch2gether.jpg (a little more dark veil for optimal frosted glass contrast) */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
        <Image
          src="/bg/watch2gether.jpg"
          alt="Sunset Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center brightness-[0.66] contrast-[1.10]"
        />
        <div className="absolute inset-0 bg-black/45" />
      </div>

      <FloatingReactions reactions={floatingReactions} />

      {/* Main Centered Application Frame: Full-width Header at top, Video & Chat below it */}
      <div className="w-full max-w-[1140px] xl:max-w-[1200px] 2xl:max-w-[1260px] h-full max-h-[850px] flex flex-col items-stretch mx-auto overflow-hidden">
        {/* Full-Width Header taking the entire horizontal space (DESKTOP ONLY) */}
        <div className="hidden lg:block w-full shrink-0">
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
        </div>

        {/* Content Area below Header: Left (Video Player & Controls) & Right (Chat / Participants Sidebar) */}
        <div className="flex-1 min-h-0 w-full flex flex-col lg:flex-row items-stretch overflow-hidden gap-3.5 lg:gap-4 xl:gap-5 max-lg:gap-2">
          {/* Left Column: Video Player & Controls Bar (Identical to original on desktop, 40% height on mobile) */}
          <div className="flex-1 min-w-0 h-full flex flex-col justify-between overflow-hidden max-lg:flex-none max-lg:h-[40%] max-lg:min-h-0 max-lg:w-full">
            <VideoSection
              playerRef={playerRef}
              videoId={videoId}
              isPlaying={isPlaying}
              canControl={canControl}
              onPlayerReady={handlePlayerReady}
              onLocalPlay={(time) => {
                const now = Date.now();
                if (now - lastLocalActionRef.current < 350) return;
                lastLocalActionRef.current = now;
                setIsPlaying(true);
                playerRef.current?.setPlaybackRate(1);
                socket.emit('play', { roomId, currentTime: time, timestamp: now });
              }}
              onLocalPause={(time) => {
                const now = Date.now();
                if (now - lastLocalActionRef.current < 350) return;
                lastLocalActionRef.current = now;
                setIsPlaying(false);
                playerRef.current?.setPlaybackRate(1);
                socket.emit('pause', { roomId, currentTime: time, timestamp: now });
              }}
              onLocalSeek={(time) => {
                timelineRef.current.anchorPosition = time;
                timelineRef.current.anchorServerTime = getServerNow();
                if (playerRef.current) {
                  playerRef.current.seekTo(time);
                  playerRef.current.setPlaybackRate(1);
                }
                socket.emit('seek', { roomId, time });
              }}
              onTogglePlay={handleTogglePlay}
              onOpenChangeVideo={() => setIsChangeVideoOpen(true)}
              onEnded={handleVideoEnded}
            />
          </div>

          {/* Right Column: Chat, Participants & Requests Sidebar (Identical to original on desktop, 60% height on mobile) */}
          <div className="w-full lg:w-[340px] xl:w-[365px] 2xl:w-[380px] shrink-0 h-full min-h-0 flex flex-col overflow-hidden max-lg:flex-1 max-lg:min-h-0">
            <RoomSidebar
              messages={messages}
              participants={participants}
              currentSocketId={socketId}
              isHost={isHost}
              isModerator={isModerator}
              chatInput={chatInput}
              onChatInputChange={setChatInput}
              onSendMessage={handleSendMessage}
              onSendReaction={handleSendReaction}
              onAssignRole={handleAssignRole}
              onTransferHost={handleTransferHost}
              onRemoveUser={handleRemoveUser}
              onOpenModal={() => setIsParticipantsOpen(true)}
              chatBottomRef={chatBottomRef}
              requests={requests}
              queue={queue}
              onRequestVideo={handleRequestVideo}
              onResolveRequest={handleResolveRequest}
              onCopyRoomLink={copyRoomLink}
              copied={copied}
              onLeaveRoom={() => router.push('/')}
              hostName={hostParticipant?.username || 'Host'}
              roomId={roomId}
              typingUsers={typingUsers}
              onTypingStart={() => socket.emit('typing_start', { roomId })}
              onTypingStop={() => socket.emit('typing_stop', { roomId })}
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
        isModerator={isModerator}
        onAssignRole={handleAssignRole}
        onRemoveUser={handleRemoveUser}
      />

      {/* Modal: Set Username Popover for default/unnamed users joining via link */}
      <SetUsernameModal
        isOpen={isNameModalOpen}
        currentUsername={username}
        onSave={handleSaveUsername}
        onClose={() => setIsNameModalOpen(false)}
      />
    </div>
  );
}
