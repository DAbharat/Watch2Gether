'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize } from 'lucide-react';
import { YouTubePlayerRef } from '@/components/YouTubePlayer';

interface VideoPlayerControlsProps {
  playerRef: React.RefObject<YouTubePlayerRef | null>;
  videoContainerRef: React.RefObject<HTMLDivElement | null>;
  isPlaying: boolean;
  canControl: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
}

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec) || sec < 0) return '00:00';
  const totalSeconds = Math.floor(sec);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function VideoPlayerControls({
  playerRef,
  videoContainerRef,
  isPlaying,
  canControl,
  onTogglePlay,
  onSeek,
}: VideoPlayerControlsProps) {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Poll current time and duration smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current) {
        const cur = playerRef.current.getCurrentTime() || 0;
        const dur = playerRef.current.getDuration() || 0;
        setCurrentTime(cur);
        if (dur > 0) setDuration(dur);
        setIsMuted(playerRef.current.isMuted?.() || false);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [playerRef]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canControl || !duration || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = fraction * duration;
    onSeek(targetSeconds);
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const container = videoContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full flex items-center justify-between gap-3 sm:gap-4 mt-2 select-none shrink-0 px-0.5">
      {/* Left: Play / Pause Button */}
      <button
        onClick={onTogglePlay}
        disabled={!canControl}
        className="text-zinc-200 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 p-1"
        title={canControl ? (isPlaying ? 'Pause' : 'Play') : 'Only Host/Mod can control playback'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Middle: Seekable Teal Progress Bar + Time Text */}
      <div className="flex-1 flex items-center gap-3 sm:gap-4 min-w-0">
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          className={`relative h-1.5 flex-1 bg-zinc-700/60 rounded-full overflow-hidden ${
            canControl ? 'cursor-pointer group' : 'cursor-default'
          }`}
          title={canControl ? 'Seek video' : ''}
        >
          {/* Teal progress bar fill (Strictly NO yellow) */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(45,212,191,0.5)]"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>

        {/* Timestamp format: 02:07 / 1:30:45 */}
        <span className="text-[11px] sm:text-xs font-mono tracking-tight shrink-0 tabular-nums">
          <span className="text-teal-400 font-semibold">{formatDuration(currentTime)}</span>
          <span className="text-zinc-500 mx-1">/</span>
          <span className="text-zinc-400">{formatDuration(duration)}</span>
        </span>
      </div>

      {/* Right: The 3 Buttons (Volume, Settings, Fullscreen) */}
      <div className="flex items-center gap-3 shrink-0 text-zinc-400">
        {/* 1. Volume / Mute button */}
        <button
          onClick={toggleMute}
          className="hover:text-zinc-100 transition-colors cursor-pointer p-0.5"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* 2. Settings button */}
        <div className="relative">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="hover:text-zinc-100 transition-colors cursor-pointer p-0.5"
            title="Video settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {isSettingsOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsSettingsOpen(false)}
              />
              <div className="absolute right-0 bottom-full mb-2 z-40 w-36 rounded-xl bg-[#1a1b22] border border-white/10 p-2 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-100 text-xs">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1">
                  Speed
                </p>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => {
                      setPlaybackRate(speed);
                      playerRef.current?.setPlaybackRate(speed);
                      setIsSettingsOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                      playbackRate === speed
                        ? 'bg-teal-500/20 text-teal-300 font-semibold'
                        : 'text-zinc-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span>{speed}x</span>
                    {playbackRate === speed && <span className="text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 3. Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          className="hover:text-zinc-100 transition-colors cursor-pointer p-0.5"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
