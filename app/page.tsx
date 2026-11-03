'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Play, Users, Shield, ArrowRight, Video, MessageSquare, 
  Radio, Zap, Check, ChevronDown, LogIn, Eye, Sliders, RefreshCw
} from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { SHADCN_AVATARS } from '@/lib/avatars';

interface RevealOnScrollProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

function RevealOnScroll({ children, className = '', delay = 0 }: RevealOnScrollProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsRevealed(true);
          observer.unobserve(node);
        }
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal-on-scroll ${isRevealed ? 'is-revealed' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

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

  const handleJoinRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!joinRoomCode.trim()) {
      toast.add({
        title: 'Room Code Required',
        description: 'Please enter a 6-digit room code or paste an invite link.',
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
    <div className="min-h-screen w-full relative text-white flex flex-col selection:bg-[#F05A65] selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* ──────────────────────────────────────────────────────────────────────────
          CONTINUOUS FULL-PAGE BACKGROUND IMAGE (100% visible, no dark blocks)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <Image
          src="/bg/watch2gether.jpg"
          alt="Watch2Gether Sunset Landscape"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-100 transform-gpu brightness-[0.95] contrast-[1.05]"
        />
        {/* Very light ambient veil for text readability while keeping all sunset colors completely vibrant */}
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[0.5px]" />
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          1. HERO SECTION
          ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen w-full flex flex-col justify-between z-10">
        {/* Top Header Navigation */}
        <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white shadow-lg">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div> */}
            <span className="font-extrabold text-lg tracking-tight text-white drop-shadow-md">
              Watch2Gether
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-white drop-shadow">
            <a href="#sync-engine" className="hover:text-blue-200 transition-colors">Sync Engine</a>
            <a href="#governance" className="hover:text-blue-200 transition-colors">Roles &amp; Approval</a>
            <a href="#experience" className="hover:text-blue-200 transition-colors">Live Chat</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab(activeTab === 'create' ? 'join' : 'create')}
              className="px-4 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-semibold text-white border border-white/30 backdrop-blur-xl transition-all cursor-pointer shadow-md"
            >
              {activeTab === 'create' ? 'Have a room code?' : 'Create room'}
            </button>
          </div>
        </header>

        {/* Hero Center Body */}
        <div className="relative z-20 w-full max-w-4xl mx-auto px-5 my-auto py-12 flex flex-col items-center text-center">
          {/* Top Capsule Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.15] hover:bg-white/[0.22] border border-white/30 backdrop-blur-2xl text-white text-xs font-medium mb-6 shadow-xl transition-all cursor-default">
            <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(96,165,250,0.9)]" />
            <span className="font-semibold text-white">Watch2Gether v1.0</span>
            <span className="text-zinc-100 font-normal">• Real-Time YouTube Synchronization</span>
          </div>

          {/* Bold White Headline */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.05] mb-5 drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
            Radically better <br />
            watch parties
          </h1>

          {/* Clean Subtitle */}
          <p className="text-zinc-100 text-sm sm:text-base max-w-xl mx-auto mb-10 leading-relaxed font-medium drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)]">
            Synchronize YouTube playback across unlimited friends with zero drift. Built-in live chat, host moderation, and instant access without signups.
          </p>

          {/* Center Command Capsule */}
          <div className="w-full max-w-lg">
            <div className="w-full p-2 rounded-full bg-white/[0.15] hover:bg-white/[0.22] border border-white/30 backdrop-blur-2xl shadow-2xl flex items-center justify-between gap-2 transition-all focus-within:border-white/60 focus-within:bg-white/[0.25]">
              {activeTab === 'create' ? (
                <form onSubmit={handleCreateRoom} className="flex-1 flex items-center justify-between w-full">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your nickname (e.g. Alex)..."
                    maxLength={25}
                    className="w-full bg-transparent px-4 py-2 text-sm text-white placeholder-zinc-200 focus:outline-none font-medium"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-[#F05A65] hover:bg-[#FF7180] active:scale-95 text-white font-bold text-xs shadow-lg shadow-white/10 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>Launch Party</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleJoinRoom} className="flex-1 flex items-center justify-between w-full">
                  <input
                    type="text"
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.target.value)}
                    placeholder="Enter 6-digit room code or paste link..."
                    className="w-full bg-transparent px-4 py-2 text-sm text-white placeholder-zinc-200 focus:outline-none font-medium font-mono uppercase"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-[#F05A65] hover:bg-[#FF7180] active:scale-95 text-white font-bold text-xs shadow-lg shadow-white/10 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>Join Room</span>
                    <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </form>
              )}
            </div>

            {/* Quick Toggle pill between Create & Join */}
            <div className="flex items-center justify-center gap-3 mt-4 text-xs drop-shadow">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`font-semibold transition-colors cursor-pointer ${
                  activeTab === 'create' ? 'text-white underline underline-offset-4 decoration-white' : 'text-zinc-200 hover:text-white'
                }`}
              >
                Create Room
              </button>
              <span className="text-zinc-300">•</span>
              <button
                type="button"
                onClick={() => setActiveTab('join')}
                className={`font-semibold transition-colors cursor-pointer ${
                  activeTab === 'join' ? 'text-white underline underline-offset-4 decoration-white' : 'text-zinc-200 hover:text-white'
                }`}
              >
                Join with Code
              </button>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="relative z-20 pb-8 flex flex-col items-center gap-1 text-zinc-100 text-xs font-semibold drop-shadow">
          <a href="#sync-engine" className="flex flex-col items-center hover:text-white transition-colors cursor-pointer">
            <span>Scroll to explore features</span>
            <ChevronDown className="w-4 h-4 animate-bounce mt-1" />
          </a>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. FEATURES SECTION (NO DARK CARDS: Light translucent frosted glass language)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full pt-16 pb-28 px-5">
        <div className="max-w-6xl mx-auto space-y-28">

          {/* Feature 1: Sub-Second Playback Engine with Drift Correction */}
          <section id="sync-engine" className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <RevealOnScroll className="lg:col-span-5 text-left" delay={0}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.15] border border-white/30 backdrop-blur-xl text-white text-xs font-mono font-semibold uppercase tracking-wider mb-4 shadow-md">
                <Radio className="w-3.5 h-3.5 text-white" />
                <span>Sync Protocol</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4 drop-shadow-[0_2px_14px_rgba(0,0,0,0.7)]">
                Sub-second synchronization without buffer drift
              </h2>
              <p className="text-zinc-100 text-sm leading-relaxed mb-6 font-normal drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
                When network hiccups or background tab throttling cause a viewer to slip behind, Watch2Gether actively measures drift against the authoritative host clock. If client divergence exceeds 1.5 seconds, the player silently seeks to the correct frame.
              </p>
              <div className="space-y-3 text-xs text-zinc-100 font-medium">
                <div className="flex items-center gap-2.5 drop-shadow">
                  <div className="w-5 h-5 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </div>
                  <span>Event-driven Socket.IO broadcasts for play, pause, seek, and URL swaps</span>
                </div>
                <div className="flex items-center gap-2.5 drop-shadow">
                  <div className="w-5 h-5 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </div>
                  <span>Echo-loop prevention flags local user inputs from incoming server state</span>
                </div>
              </div>
            </RevealOnScroll>

            {/* Visual Timeline Comparison (Tinted Dark Glass with Gradient Border) */}
            <RevealOnScroll className="lg:col-span-7" delay={120}>
              <div className="card-tinted p-6 sm:p-8">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
                  <span className="text-xs font-mono text-white/90 font-semibold">Drift Correction Visualizer</span>
                  <span className="text-[11px] font-mono font-bold text-white bg-white/20 px-2.5 py-0.5 rounded-full shadow-sm">
                    AUTHORITY: HOST
                  </span>
                </div>

                {/* Host Stream */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-2">
                      Host Player
                    </span>
                    <span className="font-mono text-card-secondary font-medium">02:15.40</span>
                  </div>
                  <div className="h-2.5 w-full bg-white/[0.08] rounded-full overflow-hidden border border-white/[0.08]">
                    <div className="h-full bg-blue-500 rounded-full w-[65%]" />
                  </div>
                </div>

                {/* Participant Stream with Sync Lock */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-2">
                      Viewer Stream (Recovered)
                    </span>
                    <span className="font-mono text-white font-medium">02:15.40 &bull; [0.00s drift]</span>
                  </div>
                  <div className="h-2.5 w-full bg-white/[0.08] rounded-full overflow-hidden border border-white/[0.08]">
                    <div className="h-full bg-emerald-400 rounded-full w-[65%]" />
                  </div>
                </div>

                <div className="card-inner p-4 text-xs text-white flex items-start gap-3">
                  <RefreshCw className="w-4 h-4 text-white shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-card-secondary font-normal">
                    Automatic seek triggers instantly whenever playback timestamps diverge beyond 1.5 seconds, ensuring seamless lockstep across all devices.
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          </section>

          {/* Feature 2: Role Governance & Participant Approval Flow */}
          <section id="governance" className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Visual RBAC Permission Matrix & Request Toast (Tinted Dark Glass with Gradient Border) */}
            <RevealOnScroll className="lg:col-span-7 order-2 lg:order-1" delay={120}>
              <div className="card-tinted p-6 sm:p-8">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
                  <span className="text-xs font-mono text-white/90 font-semibold">Participant Approval System</span>
                </div>

                {/* Approval Toast (Inner Element) */}
                <div className="card-inner p-4 mb-6 shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-[#FF9B80] shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                        <span className="text-xs font-bold text-white">Action Request Received</span>
                      </div>
                      <p className="text-xs text-card-secondary font-normal">
                        <strong className="text-white font-medium">Jordan (Viewer)</strong> requested to change video to:
                        <span className="block font-mono text-[11px] text-card-secondary mt-0.5">https://youtu.be/dQw4w9WgXcQ</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button className="px-3.5 py-1.5 rounded-lg bg-[#F05A65] hover:bg-[#FF7180] text-white text-xs font-bold cursor-pointer transition-colors shadow-sm">
                        Approve
                      </button>
                      <button className="px-3.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold cursor-pointer transition-colors border border-white/[0.1]">
                        Deny
                      </button>
                    </div>
                  </div>
                </div>

                {/* Roles Breakdown (Host / Moderator / Participant Role Boxes) */}
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="card-inner p-3.5">
                    <span className="font-bold text-white block mb-0.5">Host</span>
                    <span className="text-[11px] text-card-secondary leading-tight block font-normal">Full control, transfer host, manage roles</span>
                  </div>
                  <div className="card-inner p-3.5">
                    <span className="font-bold text-white block mb-0.5">Moderator</span>
                    <span className="text-[11px] text-card-secondary leading-tight block font-normal">Play, pause, seek, and approve actions</span>
                  </div>
                  <div className="card-inner p-3.5">
                    <span className="font-bold text-white block mb-0.5">Participant</span>
                    <span className="text-[11px] text-card-secondary leading-tight block font-normal">Sync playback, chat, and request actions</span>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            {/* Explanation on right */}
            <RevealOnScroll className="lg:col-span-5 order-1 lg:order-2 text-left" delay={0}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.15] border border-white/30 backdrop-blur-xl text-white text-xs font-mono font-semibold uppercase tracking-wider mb-4 shadow-md">
                <Shield className="w-3.5 h-3.5 text-white" />
                <span>Governance</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4 drop-shadow-[0_2px_14px_rgba(0,0,0,0.7)]">
                No accidental desyncs. Real host moderation.
              </h2>
              <p className="text-zinc-100 text-sm leading-relaxed mb-6 font-normal drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
                In group calls, uncontrolled playback commands cause chaos. Watch2Gether validates every mutation on the server. Viewers cannot accidentally pause or scrub the video; instead, their requests trigger an instant one-click approval prompt for Hosts and Moderators.
              </p>
              <div className="space-y-3 text-xs text-zinc-100 font-medium">
                <div className="flex items-center gap-2.5 drop-shadow">
                  <div className="w-5 h-5 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </div>
                  <span>Server determines role from socket session ID, never from client payload</span>
                </div>
                <div className="flex items-center gap-2.5 drop-shadow">
                  <div className="w-5 h-5 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </div>
                  <span>Automatic host failover to the next active moderator if host leaves</span>
                </div>
              </div>
            </RevealOnScroll>
          </section>

          {/* Feature 3: Live Synchronized Side-Chat & Reactions */}
          <section id="experience" className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <RevealOnScroll className="lg:col-span-5 text-left" delay={0}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.15] border border-white/30 backdrop-blur-xl text-white text-xs font-mono font-semibold uppercase tracking-wider mb-4 shadow-md">
                <MessageSquare className="w-3.5 h-3.5 text-white" />
                <span>Interactive Chat</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4 drop-shadow-[0_2px_14px_rgba(0,0,0,0.7)]">
                Live conversation built right beside the screen
              </h2>
              <p className="text-zinc-100 text-sm leading-relaxed mb-6 font-normal drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
                React to dramatic movie scenes or music videos in real time. Floating emoji reactions burst across the screen, messages display avatars allocated automatically in join order, and full conversation history persists for the entire session.
              </p>
              <div className="space-y-3 text-xs text-zinc-100 font-medium">
                <div className="flex items-center gap-2.5 drop-shadow">
                  <div className="w-5 h-5 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </div>
                  <span>Floating reaction pills (`😡 😋 😱 😂`) for zero-typing reactions</span>
                </div>
                <div className="flex items-center gap-2.5 drop-shadow">
                  <div className="w-5 h-5 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center font-bold text-[10px]">
                    ✓
                  </div>
                  <span>Join-order avatar allocation with cycling illustrated avatar sets</span>
                </div>
              </div>
            </RevealOnScroll>

            {/* Chat Preview Model (Tinted Dark Glass with Gradient Border) */}
            <RevealOnScroll className="lg:col-span-7" delay={120}>
              <div className="card-tinted p-6 sm:p-8">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
                  <span className="text-xs font-mono text-white/90 font-semibold">Integrated Theater Chat</span>
                  <span className="text-[11px] font-mono text-white/90 bg-white/[0.08] px-2.5 py-0.5 rounded-full border border-white/[0.12] font-bold">4 PARTICIPANTS</span>
                </div>

                {/* Chat messages */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 shadow shrink-0">
                      <img src={SHADCN_AVATARS[0]} alt="avatar" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="card-inner px-3.5 py-2 text-xs text-white font-normal shadow-sm">
                        The audio is perfectly in sync!
                      </div>
                      <span className="text-[10px] text-card-secondary mt-0.5 block font-medium">Lub Feltov</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 flex-row-reverse justify-start w-full">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-blue-400 shadow shrink-0">
                      <img src={SHADCN_AVATARS[1]} alt="avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="px-3.5 py-2 rounded-2xl bg-[#F05A65]/80 text-xs text-white font-medium shadow-sm">
                        Yeah, zero latency on seeking too!
                      </div>
                      <span className="text-[10px] text-card-secondary mt-0.5 block font-medium">You (Host)</span>
                    </div>
                  </div>
                </div>

                {/* Floating Reaction Pill */}
                <div className="flex justify-end pt-3 border-t border-white/[0.08]">
                  <div className="card-inner inline-flex items-center gap-2 px-3.5 py-1.5 shadow-md">
                    <span className="text-sm">😡</span>
                    <span className="text-sm">😋</span>
                    <span className="text-sm">😱</span>
                    <span className="text-sm">😂</span>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </section>

          {/* Bottom Launch Banner (Tinted Dark Glass with Gradient Border) */}
          <RevealOnScroll className="w-full" delay={0}>
            <div className="card-tinted p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
                Ready to start your watch party?
              </h2>
              <p className="text-card-secondary text-xs sm:text-sm max-w-md mx-auto mb-6 font-normal">
                No accounts, passwords, or installations. Choose a display name and launch a shared room in seconds.
              </p>
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-7 py-3 rounded-full bg-[#F05A65] hover:bg-[#FF7180] active:scale-95 text-white font-bold text-xs transition-all inline-flex items-center gap-2 shadow-xl shadow-white/10 cursor-pointer"
              >
                <span>Back to Top &amp; Start Party</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </RevealOnScroll>

        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. MINIMAL TRANSLUCENT FOOTER
          ────────────────────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full border-t border-white/20 bg-white/[0.08] backdrop-blur-xl py-6 text-xs text-zinc-100">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-semibold text-white drop-shadow">Watch2Gether &bull; Real-time synchronized streaming.</span>
          <div className="flex items-center gap-6 text-white font-semibold drop-shadow">
            <a href="#sync-engine" className="hover:text-blue-200 transition-colors">Sync Engine</a>
            <a href="#governance" className="hover:text-blue-200 transition-colors">Governance</a>
            <a href="#experience" className="hover:text-blue-200 transition-colors">Live Chat</a>
          </div>
        </div>
      </footer>
    </div>
  );
}