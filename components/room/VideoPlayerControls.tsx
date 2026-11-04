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

  // YouTube-like Scrubbing & Timeline Swipe State
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const isScrubbingRef = useRef<boolean>(false);
  const [scrubTime, setScrubTime] = useState<number>(0);
  const [hoverTime, setHoverTime] = useState<number>(0);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const lastPreviewSeekRef = useRef<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Poll current time and duration smoothly (disabled during active user scrubbing)
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && !isScrubbingRef.current) {
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

  const getFractionFromPointer = (clientX: number): number => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const offsetX = clientX - rect.left;
    return Math.max(0, Math.min(1, offsetX / rect.width));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canControl || !duration || !progressBarRef.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setIsScrubbing(true);
    isScrubbingRef.current = true;
    const fraction = getFractionFromPointer(e.clientX);
    const targetSeconds = fraction * duration;
    setScrubTime(targetSeconds);
    setHoverTime(targetSeconds);
    setIsHovering(true);

    // Immediate local frame preview
    playerRef.current?.seekTo(targetSeconds);
    lastPreviewSeekRef.current = Date.now();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) return;
    const fraction = getFractionFromPointer(e.clientX);
    const targetSeconds = fraction * duration;
    setHoverTime(targetSeconds);

    if (isScrubbingRef.current) {
      setScrubTime(targetSeconds);
      // Throttled local video seek for smooth real-time scrubbing
      const now = Date.now();
      if (now - lastPreviewSeekRef.current > 100) {
        lastPreviewSeekRef.current = now;
        playerRef.current?.seekTo(targetSeconds);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    const fraction = getFractionFromPointer(e.clientX);
    const finalSeconds = fraction * duration;

    setIsScrubbing(false);
    isScrubbingRef.current = false;
    setCurrentTime(finalSeconds);

    // Commit final seek to player and broadcast to party
    playerRef.current?.seekTo(finalSeconds);
    onSeek(finalSeconds);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbingRef.current) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
      setIsScrubbing(false);
      isScrubbingRef.current = false;
      setIsHovering(false);
    }
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

  const effectiveTime = isScrubbing ? scrubTime : currentTime;
  const effectivePercent = duration > 0 ? (effectiveTime / duration) * 100 : 0;
  const hoverPercent = duration > 0 ? (hoverTime / duration) * 100 : 0;

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

        {/* YouTube-like Swipeable / Seekable Progress Bar with Tooltip & Thumb */}
        <div
          ref={progressBarRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerEnter={() => canControl && setIsHovering(true)}
          onPointerLeave={() => !isScrubbingRef.current && setIsHovering(false)}
          className={`relative flex items-center h-7 flex-1 touch-none select-none ${
            canControl ? 'cursor-pointer group' : 'cursor-not-allowed opacity-80'
          }`}
          title={canControl ? 'Swipe or click to seek video' : 'Playback is controlled by Host and Moderators'}
        >
          {/* Floating YouTube-style timestamp preview tooltip */}
          {canControl && isHovering && duration > 0 && (
            <div
              className="absolute -top-7 pointer-events-none -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/85 text-white text-[10px] font-mono font-semibold shadow-xl backdrop-blur-md border border-white/20 whitespace-nowrap z-30 transition-all duration-75"
              style={{ left: `${Math.max(4, Math.min(96, hoverPercent))}%` }}
            >
              {formatDuration(hoverTime)}
            </div>
          )}

          {/* Progress Bar Track */}
          <div className="relative w-full h-1.5 group-hover:h-2 transition-all rounded-full bg-white/25 overflow-hidden">
            {/* Ghost hover bar showing target position */}
            {canControl && isHovering && (
              <div
                className="absolute top-0 bottom-0 left-0 bg-white/20 rounded-full pointer-events-none"
                style={{ width: `${Math.min(100, Math.max(effectivePercent, hoverPercent))}%` }}
              />
            )}
            {/* Active played progress */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-[#F05A65] rounded-full shadow-[0_0_8px_rgba(240,90,101,0.6)]"
              style={{ width: `${Math.min(100, effectivePercent)}%` }}
            />
          </div>

          {/* YouTube-style Red/Coral Scrubber Pin (Thumb) */}
          {canControl && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#F05A65] border-2 border-white shadow-md pointer-events-none transition-transform duration-100 ${
                isScrubbing || isHovering
                  ? 'scale-100 opacity-100'
                  : 'scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100'
              }`}
              style={{ left: `${Math.min(100, effectivePercent)}%` }}
            />
          )}
        </div>

        {/* Duration timestamp: 00:39 / 11:00 (updates dynamically during swipe) */}
        <span className="text-[11px] sm:text-xs font-mono font-medium text-white shrink-0 tabular-nums">
          <span className="text-white font-bold">{formatDuration(effectiveTime)}</span>
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
