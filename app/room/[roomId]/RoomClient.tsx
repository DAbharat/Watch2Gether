'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { YouTubePlayer, YouTubePlayerRef } from '@/components/YouTubePlayer';
import { extractYouTubeId } from '@/lib/youtube';
import { Role, ParticipantData, RoomState, ChatMessage, ReactionData } from '@/lib/types';
import { 
  Play, Pause, RotateCcw, RotateCw, Copy, Check, Users, 
  MessageSquare, Shield, Crown, UserMinus, LogOut, Send, 
  AlertCircle, ExternalLink 
} from 'lucide-react';

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
  const [errorToast, setErrorToast] = useState<string | null>(null);

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
    });

    socket.on('user_joined', (data: any) => {
      setParticipants(data.participants);
    });

    socket.on('user_left', (data: any) => {
      setParticipants(data.participants);
      if (data.hostSocketId) setHostSocketId(data.hostSocketId);
    });

    socket.on('role_assigned', (data: any) => {
      setParticipants(data.participants);
      if (data.hostSocketId) setHostSocketId(data.hostSocketId);
    });

    socket.on('participant_removed', (data: any) => {
      setParticipants(data.participants);
    });

    socket.on('kicked', () => {
      setKickedMessage('You have been removed from the room by the host.');
    });

    socket.on('error_message', (data: { message: string }) => {
      setErrorToast(data.message);
      setTimeout(() => setErrorToast(null), 4000);
    });

    socket.on('new_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('new_reaction', (reaction: { emoji: string; username: string }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setFloatingReactions((prev) => [...prev, { id, emoji: reaction.emoji, username: reaction.username }]);
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
      setErrorToast('Please enter a valid YouTube video URL or ID.');
      setTimeout(() => setErrorToast(null), 3000);
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
    if (confirm('Are you sure you want to remove this participant?')) {
      socket.emit('remove_participant', { roomId, userId: targetUserId });
    }
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
  };

  if (kickedMessage) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-zinc-100">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Removed from Room</h1>
        <p className="text-zinc-400 max-w-sm mb-6">{kickedMessage}</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-lg transition-all"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {errorToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-rose-600/90 text-white text-sm font-medium shadow-2xl backdrop-blur flex items-center gap-2 animate-bounce">
          <AlertCircle className="w-4 h-4" />
          {errorToast}
        </div>
      )}

      <div className="fixed bottom-24 right-8 pointer-events-none z-40 flex flex-col gap-2 items-end">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-700/80 shadow-2xl text-lg animate-fade-in-up"
          >
            <span>{r.emoji}</span>
            <span className="text-xs text-zinc-400">{r.username}</span>
          </div>
        ))}
      </div>

      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm font-bold text-zinc-200 hover:text-white transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
            </div>
            <span>Watch2Gether</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
            <span>Room: {roomId}</span>
            <button
              onClick={copyRoomLink}
              title="Copy room invite link"
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="hidden sm:inline">{isConnected ? 'Connected' : 'Connecting...'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-zinc-900 border border-zinc-800">
            {isHost && (
              <>
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300">Host</span>
              </>
            )}
            {isModerator && (
              <>
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-indigo-300">Moderator</span>
              </>
            )}
            {!isHost && !isModerator && (
              <>
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-400">Viewer</span>
              </>
            )}
          </div>

          <button
            onClick={() => router.push('/')}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
            title="Leave room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="w-full">
            <YouTubePlayer
              ref={playerRef}
              videoId={videoId}
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
            />
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleTogglePlay}
                disabled={!canControl}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  canControl
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 active:scale-95'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
                title={canControl ? (isPlaying ? 'Pause' : 'Play') : 'Restricted to Host/Moderator'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={() => handleSeekOffset(-10)}
                disabled={!canControl}
                className={`p-2.5 rounded-xl border border-zinc-800 transition-all ${
                  canControl ? 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                }`}
                title="Rewind 10 seconds"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSeekOffset(10)}
                disabled={!canControl}
                className={`p-2.5 rounded-xl border border-zinc-800 transition-all ${
                  canControl ? 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                }`}
                title="Forward 10 seconds"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-zinc-400 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{isPlaying ? 'Syncing Playback' : 'Paused for everyone'}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" /> Change Video (Paste YouTube URL or ID)
            </h3>
            <form onSubmit={handleChangeVideo} className="flex gap-2">
              <input
                type="text"
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                disabled={!canControl}
                placeholder={canControl ? 'Paste YouTube link (e.g. https://youtu.be/...)' : 'Playback is locked by Host'}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!canControl || !newVideoUrl.trim()}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm text-white transition-all flex items-center gap-1.5"
              >
                Load Video
              </button>
            </form>
            {!canControl && (
              <p className="text-[11px] text-zinc-500 mt-2">
                🔒 You are a <strong>Viewer</strong>. Only the Host and Moderators can change the video or control playback.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col h-[580px] rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden shadow-2xl">
          <div className="flex border-b border-zinc-800 bg-zinc-950/60">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'chat'
                  ? 'border-indigo-500 text-indigo-400 bg-zinc-900/40'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat ({messages.length})
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'participants'
                  ? 'border-indigo-500 text-indigo-400 bg-zinc-900/40'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Participants ({participants.length})
            </button>
          </div>

          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
                    <MessageSquare className="w-6 h-6 mb-2 opacity-40" />
                    <p>No messages yet.</p>
                    <p className="text-[11px] text-zinc-600">Be the first to say hello!</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="flex flex-col gap-0.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-200">{m.username}</span>
                        {m.role === 'host' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-medium">
                            Host
                          </span>
                        )}
                        {m.role === 'moderator' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                            Mod
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-zinc-300 bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/60 break-words">
                        {m.text}
                      </p>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              <div className="px-3 py-2 border-t border-zinc-800/80 bg-zinc-950/40 flex items-center justify-around">
                {['🔥', '❤️', '😂', '👏', '🚀'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="p-1 hover:scale-125 transition-transform text-base"
                    title={`Send ${emoji} reaction`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 flex gap-2 bg-zinc-950/80">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={200}
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {activeTab === 'participants' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">
                Active Participants ({participants.length})
              </div>

              {participants.map((p) => {
                const isMe = p.socketId === socketId;
                return (
                  <div
                    key={p.socketId}
                    className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {p.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-200 truncate flex items-center gap-1.5">
                          {p.username} {isMe && <span className="text-[10px] text-zinc-500">(You)</span>}
                        </p>
                        <span className="text-[10px] capitalize text-zinc-400">
                          {p.role === 'host' ? '👑 Host' : p.role === 'moderator' ? '🛡️ Moderator' : '👁️ Viewer'}
                        </span>
                      </div>
                    </div>

                    {isHost && !isMe && (
                      <div className="flex items-center gap-1">
                        {p.role === 'participant' ? (
                          <button
                            onClick={() => handleAssignRole(p.socketId, 'moderator')}
                            className="px-2 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-medium transition-colors"
                            title="Promote to Moderator"
                          >
                            + Mod
                          </button>
                        ) : p.role === 'moderator' ? (
                          <button
                            onClick={() => handleAssignRole(p.socketId, 'participant')}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium transition-colors"
                            title="Demote to Viewer"
                          >
                            - Demote
                          </button>
                        ) : null}

                        <button
                          onClick={() => handleRemoveUser(p.socketId)}
                          className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Remove user from room"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
