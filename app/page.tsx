'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Users, Shield, Sparkles, ArrowRight, Video, MessageSquare } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('wtg_username');
    if (saved) setUsername(saved);
  }, []);

  const saveUsername = (name: string) => {
    const clean = name.trim();
    if (clean) {
      localStorage.setItem('wtg_username', clean);
    }
    return clean;
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = saveUsername(username) || `User_${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem('wtg_username', finalName);

    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/room/${randomCode}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomCode.trim()) {
      setError('Please enter a room code or link');
      return;
    }

    const finalName = saveUsername(username) || `User_${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem('wtg_username', finalName);

    let code = joinRoomCode.trim();
    if (code.includes('/room/')) {
      code = code.split('/room/')[1].split('?')[0].split('#')[0];
    }
    code = code.replace(/[^a-zA-Z0-9_-]/g, '');

    if (!code) {
      setError('Invalid room code');
      return;
    }

    router.push(`/room/${code}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-pink-600/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[450px] h-[350px] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between border-b border-zinc-900/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              Watch2Gether
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-medium text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Real-time Sync Active
        </div>
      </header>

      <main className="relative z-10 max-w-4xl w-full mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-4 h-4" /> YouTube Watch Party System
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight max-w-2xl text-white leading-tight mb-4">
          Watch YouTube together in <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">perfect sync</span>.
        </h1>
        <p className="text-zinc-400 text-base sm:text-lg max-w-xl mb-10 leading-relaxed">
          Create a room, share the link with friends, and enjoy synchronized playback with role-based controls and live reactions.
        </p>

        <div className="w-full max-w-md mb-8">
          <label className="block text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Your Display Name
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Alex, Sam..."
            maxLength={25}
            className="w-full px-4 py-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-12">
          <div className="flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 border border-zinc-800/80 shadow-xl text-left hover:border-zinc-700 transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <Video className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Create a Room</h2>
              <p className="text-xs text-zinc-400 mb-6">
                You become the <span className="text-indigo-400 font-semibold">Host</span> with full control to play, seek, promote moderators, or change videos.
              </p>
            </div>
            <button
              onClick={handleCreateRoom}
              className="w-full py-3.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              Start New Room <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-900/40 border border-zinc-800/80 shadow-xl text-left hover:border-zinc-700 transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Join a Room</h2>
              <p className="text-xs text-zinc-400 mb-4">
                Have an invite code or link? Paste it below to join the party immediately.
              </p>
              <input
                type="text"
                value={joinRoomCode}
                onChange={(e) => {
                  setJoinRoomCode(e.target.value);
                  setError('');
                }}
                placeholder="Enter room code or link..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
              />
              {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}
            </div>
            <button
              onClick={handleJoinRoom}
              className="w-full py-3.5 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.99] text-white font-semibold flex items-center justify-center gap-2 border border-zinc-700 transition-all"
            >
              Join Watch Party <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl pt-8 border-t border-zinc-900">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50 text-left">
            <Play className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-zinc-200">Instant Video Sync</p>
              <p className="text-[11px] text-zinc-500">Play, pause & seek together</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50 text-left">
            <Shield className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-zinc-200">Role-Based Access</p>
              <p className="text-[11px] text-zinc-500">Host, Moderator & Viewer</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50 text-left">
            <MessageSquare className="w-5 h-5 text-pink-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-zinc-200">Live Chat & Reactions</p>
              <p className="text-[11px] text-zinc-500">In-room chat & emojis</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 border-t border-zinc-900 text-center text-xs text-zinc-500">
        Watch2Gether &copy; 2026 &bull; Built with Next.js, Express & Socket.IO
      </footer>
    </div>
  );
}
