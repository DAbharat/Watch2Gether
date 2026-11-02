'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Play, Users, Shield, Sparkles, ArrowRight, Video, MessageSquare, 
  Radio, Zap, Lock, Copy, Check, ChevronRight, Activity, Globe, Cpu
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { RoleIcon } from '@/lib/roles';

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [isJoinOpen, setIsJoinOpen] = useState(false);

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

  const handleCreateRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = saveUsername(username) || `User_${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem('wtg_username', finalName);

    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/room/${randomCode}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomCode.trim()) {
      toast.add({
        title: 'Room Code Required',
        description: 'Please enter a room code or paste an invite link.',
        type: 'warning'
      });
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
      toast.add({
        title: 'Invalid Room Code',
        description: 'Could not extract a valid room code from your input.',
        type: 'error'
      });
      return;
    }

    router.push(`/room/${code}`);
  };

  return (
    <div className="min-h-screen bg-[#05090a] text-zinc-100 flex flex-col justify-between selection:bg-teal-400 selection:text-black font-sans antialiased relative">
      {/* Top spotlight green radial glow & subtle vertical texture lines */}
      <div className="absolute inset-x-0 top-0 h-[620px] overflow-hidden pointer-events-none z-0">
        {/* Semi-circular arc spotlight glow */}
        <div 
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-[75vw] max-w-[1200px] h-[560px] blur-[60px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 75% 550px at 50% 0%, rgba(20, 90, 80, 0.38) 0%, rgba(15, 61, 56, 0.22) 35%, rgba(5, 20, 18, 0.08) 65%, transparent 80%)'
          }}
        />

        {/* 4 faint vertical texture lines running down the hero section */}
        <div className="relative max-w-6xl w-full h-full mx-auto">
          <div 
            className="hidden sm:block absolute top-0 bottom-0 w-px"
            style={{
              left: 'calc(50% - 400px)',
              background: 'linear-gradient(to bottom, rgba(45, 212, 191, 0.05) 0%, rgba(255, 255, 255, 0.03) 25%, transparent 90%)',
            }}
          />
          <div 
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: 'calc(50% - 140px)',
              background: 'linear-gradient(to bottom, rgba(45, 212, 191, 0.06) 0%, rgba(255, 255, 255, 0.04) 25%, transparent 90%)',
            }}
          />
          <div 
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: 'calc(50% + 140px)',
              background: 'linear-gradient(to bottom, rgba(45, 212, 191, 0.06) 0%, rgba(255, 255, 255, 0.04) 25%, transparent 90%)',
            }}
          />
          <div 
            className="hidden sm:block absolute top-0 bottom-0 w-px"
            style={{
              left: 'calc(50% + 400px)',
              background: 'linear-gradient(to bottom, rgba(45, 212, 191, 0.05) 0%, rgba(255, 255, 255, 0.03) 25%, transparent 90%)',
            }}
          />
        </div>
      </div>

      <header className="relative z-30 max-w-7xl w-full mx-auto px-6 py-5 flex items-center justify-between border-b border-white/[0.06] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Play className="w-4 h-4 text-black fill-black ml-0.5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white">
            Watch<span className="text-teal-400">2</span>Gether
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
          <a href="#engine" className="hover:text-zinc-200 transition-colors">Sync Engine</a>
          <a href="#governance" className="hover:text-zinc-200 transition-colors">Role Governance</a>
          <a href="#architecture" className="hover:text-zinc-200 transition-colors">Architecture</a>
          <a href="#stats" className="hover:text-zinc-200 transition-colors">Performance</a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsJoinOpen(true)}
            className="hidden sm:inline-flex px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-zinc-300 border border-white/[0.08] transition-all"
          >
            Join with Code
          </button>
          <button
            onClick={() => handleCreateRoom()}
            className="px-5 py-2 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 hover:brightness-110 active:scale-95 text-black font-bold text-xs shadow-md shadow-teal-500/20 transition-all flex items-center gap-1.5"
          >
            <span>Launch Party</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl w-full mx-auto px-6 pt-16 pb-24 flex-1 flex flex-col items-center text-center">
        {/* <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-medium tracking-wide mb-8">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Verve-Class Architecture &bull; Ultra-Low Latency WebSocket Protocol</span>
        </div> */}

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.08] mb-6">
          Deliver an Enterprise Quality <br className="hidden sm:inline" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-300 via-emerald-200 to-cyan-300">
            Watch Party in Minutes
          </span>
        </h1>

        <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mb-10 leading-relaxed font-normal">
          Synchronize YouTube playback across unlimited participants with zero drift, granular host governance, and interactive live reactions.
        </p>

        <div className="w-full max-w-md mb-6">
          <div className="flex items-center gap-2 p-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl shadow-2xl focus-within:border-teal-400/50 transition-all">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your display name (e.g. Alex)..."
              maxLength={25}
              className="flex-1 px-4 py-2.5 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
            />
            <button
              onClick={() => handleCreateRoom()}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 hover:brightness-110 active:scale-95 text-black font-bold text-xs shadow-md shadow-teal-500/20 transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-zinc-500 mb-16">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_#2dd4bf]" /> No registration required
          </span>
          <span>&bull;</span>
          <span>Instant Room Code</span>
          <span>&bull;</span>
          <button 
            onClick={() => setIsJoinOpen(true)}
            className="text-teal-400 hover:underline font-medium"
          >
            Have a room code?
          </button>
        </div>

        {isJoinOpen && (
          <div className="w-full max-w-md mb-12 p-5 rounded-2xl bg-[#090d16] border border-teal-500/30 text-left animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">Join Existing Room</span>
              <button 
                onClick={() => setIsJoinOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Cancel
              </button>
            </div>
            <form onSubmit={handleJoinRoom} className="flex gap-2">
              <input
                type="text"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value)}
                placeholder="Enter 6-digit code or paste invite link..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-teal-400 text-black font-bold text-xs hover:bg-teal-300 transition-all"
              >
                Join Party
              </button>
            </form>
          </div>
        )}

        <div className="w-full max-w-5xl p-2 rounded-3xl bg-gradient-to-b from-white/[0.12] to-white/[0.02] shadow-2xl mb-24">
          <div className="rounded-[22px] bg-[#090d16] border border-white/[0.08] overflow-hidden text-left p-6 sm:p-8">
            <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="h-4 w-px bg-white/10 mx-2" />
                <span className="text-xs font-mono text-zinc-400">watch2gether.live/room/VRV-9420</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 inline-flex items-center gap-1.5 align-middle">
                  <RoleIcon role="host" size={14} strokeWidth={2} />
                  <span>Host Session</span>
                </span>
                <span className="text-[11px] font-mono text-zinc-500">4 Watching</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
              <div className="lg:col-span-2 rounded-2xl bg-black/70 border border-white/[0.06] p-5 flex flex-col justify-between aspect-video relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/10 text-[11px] text-zinc-300 font-medium">
                    <Radio className="w-3 h-3 text-teal-400 animate-pulse" />
                    Synchronized 1080p Stream
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">04:18 / 15:00</span>
                </div>

                <div className="flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-teal-400 text-black flex items-center justify-center shadow-lg shadow-teal-400/40">
                    <Play className="w-6 h-6 fill-black ml-0.5" />
                  </div>
                </div>

                <div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
                    <div className="w-[42%] h-full bg-gradient-to-r from-teal-400 to-emerald-400" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Sub-Millisecond Playback Engine</span>
                    <span className="text-teal-400 font-mono font-semibold">0.00s Drift</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center justify-between">
                    <span>Active Governance</span>
                    <span className="text-teal-400 text-[10px]">RBAC Active</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-400 text-black font-bold text-[10px] flex items-center justify-center">A</div>
                        <span className="text-xs font-medium text-zinc-200">Alex (Creator)</span>
                      </div>
                      <span className="text-[10px] text-amber-300 font-mono inline-flex items-center gap-1 align-middle">
                        <RoleIcon role="host" size={14} strokeWidth={2} />
                        <span>Host</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-teal-400 text-black font-bold text-[10px] flex items-center justify-center">T</div>
                        <span className="text-xs font-medium text-zinc-200">Taylor</span>
                      </div>
                      <span className="text-[10px] text-teal-300 font-mono inline-flex items-center gap-1 align-middle">
                        <RoleIcon role="moderator" size={14} strokeWidth={2} />
                        <span>Mod</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-700 text-white font-bold text-[10px] flex items-center justify-center">J</div>
                        <span className="text-xs font-medium text-zinc-400">Jordan</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono inline-flex items-center gap-1 align-middle">
                        <RoleIcon role="participant" size={14} strokeWidth={2} />
                        <span>Viewer</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-300">
                  <div className="font-semibold mb-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Role Enforcement
                  </div>
                  Playback commands from Viewers are validated and discarded on backend.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-4xl mb-24">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-8">
            Engineered for high-concurrency real-time streaming architectures
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 items-center justify-center opacity-70">
            <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs font-semibold tracking-wider font-mono">
              <Activity className="w-4 h-4 text-teal-400" /> SOCKET.IO
            </div>
            <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs font-semibold tracking-wider font-mono">
              <Cpu className="w-4 h-4 text-emerald-400" /> NODE.JS
            </div>
            <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs font-semibold tracking-wider font-mono">
              <Zap className="w-4 h-4 text-cyan-400" /> REACT 19
            </div>
            <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs font-semibold tracking-wider font-mono">
              <Globe className="w-4 h-4 text-teal-400" /> NEXT.JS 16
            </div>
            <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs font-semibold tracking-wider font-mono">
              <Lock className="w-4 h-4 text-emerald-400" /> TYPESCRIPT
            </div>
          </div>
        </div>

        <div id="stats" className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-4xl py-12 border-y border-white/[0.08] mb-24">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-1">&lt; 15ms</div>
            <div className="text-xs text-zinc-400 font-medium">Broadcast Sync Latency</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-teal-400 tracking-tight mb-1">3 Roles</div>
            <div className="text-xs text-zinc-400 font-medium">Granular RBAC Hierarchy</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-1">100%</div>
            <div className="text-xs text-zinc-400 font-medium">In-Memory OOP State</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight mb-1">Zero Drift</div>
            <div className="text-xs text-zinc-400 font-medium">Automated Time Resync</div>
          </div>
        </div>

        <div id="architecture" className="w-full max-w-5xl mb-24 text-left">
          <div className="max-w-xl mb-12">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">System Design</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2 mb-4">
              Discover a synchronous streaming solution built for scale.
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Designed from the ground up to solve the circular echo problem, drift accumulation, and unauthorized state mutations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:border-teal-500/30 transition-all flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-teal-400 mb-2 font-bold">01</div>
                <h3 className="text-lg font-bold text-white mb-3">Sub-Second Playback Sync</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  When a host plays, pauses, or scrubs, state events propagate through room channels. Programmatic actions are flagged to eliminate circular feedback loops.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:border-teal-500/30 transition-all flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-teal-400 mb-2 font-bold">02</div>
                <h3 className="text-lg font-bold text-white mb-3">Role-Based Access Control</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Rooms enforce Host, Moderator, and Viewer roles. Only Hosts and assigned Moderators can trigger playback mutations or swap video URLs.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:border-teal-500/30 transition-all flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-teal-400 mb-2 font-bold">03</div>
                <h3 className="text-lg font-bold text-white mb-3">OOP Room State Engine</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Encapsulated Room and Participant domain models maintain state in memory. Lookup complexity is O(1) with automatic host failover.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-5xl p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-teal-950/40 via-emerald-950/20 to-zinc-950 border border-teal-500/30 text-center relative overflow-hidden glow-card">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-teal-500/20 blur-[80px] pointer-events-none" />
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4 relative z-10">
            Ready to start your next watch party?
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto mb-8 relative z-10">
            Launch a room in seconds, invite your friends with a single click, and experience YouTube in perfect synchronization.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
            <button
              onClick={() => handleCreateRoom()}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 hover:brightness-110 active:scale-95 text-black font-bold text-sm shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Create Watch Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsJoinOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white/[0.05] hover:bg-white/[0.09] text-zinc-200 font-semibold text-sm border border-white/[0.1] transition-all"
            >
              Join with Code
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-8 border-t border-white/[0.06] text-center text-xs text-zinc-500">
        Watch2Gether &bull; Built with Next.js, Express &amp; Socket.IO
      </footer>
    </div>
  );
}
