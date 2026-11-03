'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize, Sliders } from 'lucide-react';
import { YouTubePlayerRef } from '@/components/YouTubePlayer';

interface VideoPlayerControlsProps {
  playerRef: React.RefObject<YouTubePlayerRef | null>;
  videoContainerRef: React.RefObject<HTMLDivElement | null>;
  isPlaying: boolean;
  canControl: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onOpenChangeVideo?: () => void;
  style?: React.CSSProperties;
  className?: string;
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
  onOpenChangeVideo,
  style,
  className = '',
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
    <div
      style={style}
      className={`w-full glass-white-card rounded-2xl p-2.5 sm:p-3 shadow-xl flex items-center justify-between gap-3 sm:gap-4 mt-3 select-none shrink-0 ${className}`}
    >
      {/* Left: Play/Pause, Progress, Time, Volume, Speed, Fullscreen */}
      <div className="flex-1 flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Play / Pause button */}
        <button
          onClick={onTogglePlay}
          disabled={!canControl}
          className="text-white hover:scale-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 p-1"
          title={canControl ? (isPlaying ? 'Pause' : 'Play') : 'Only Host/Mod can control playback'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white" />
          ) : (
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white ml-0.5" />
          )}
        </button>

        {/* Volume / Mute button */}
        <button
          onClick={toggleMute}
          className="text-white/80 hover:text-white transition-colors cursor-pointer p-0.5 shrink-0"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Seekable Progress Bar */}
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          className={`relative h-1.5 flex-1 bg-white/25 hover:h-2 rounded-full overflow-hidden transition-all ${
            canControl ? 'cursor-pointer group' : 'cursor-default'
          }`}
          title={canControl ? 'Seek video' : ''}
        >
          <div
            className="absolute top-0 bottom-0 left-0 bg-[#F05A65] rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(240,90,101,0.6)]"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>

        {/* Duration timestamp: 12:34 / 22:17 */}
        <span className="text-[11px] sm:text-xs font-mono font-medium text-white shrink-0 tabular-nums">
          <span className="text-white font-bold">{formatDuration(currentTime)}</span>
          <span className="text-white/50 mx-1">/</span>
          <span className="text-white/80">{formatDuration(duration)}</span>
        </span>
      </div>

      {/* Right: Settings, Fullscreen, and Room Settings button */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Settings button */}
        <div className="relative">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="text-white/80 hover:text-white transition-colors cursor-pointer p-1"
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
              <div className="absolute right-0 bottom-full mb-2 z-40 w-36 rounded-2xl bg-black/85 border border-white/20 p-2 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-100 text-xs">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider px-2 py-1">
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
                        ? 'bg-[#F05A65]/30 text-white font-bold'
                        : 'text-white/80 hover:bg-white/[0.08]'
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

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          className="text-white/80 hover:text-white transition-colors cursor-pointer p-1"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Room Settings / Add Video button matching screenshot */}
        {onOpenChangeVideo && (
          <button
            onClick={onOpenChangeVideo}
            title="Room settings & video URL"
            className="glass-white-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white transition-all cursor-pointer shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Room Settings</span>
          </button>
        )}
      </div>
    </div>
  );
}
