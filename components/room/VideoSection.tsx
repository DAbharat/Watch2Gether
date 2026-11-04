'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Maximize2 } from 'lucide-react';
import { YouTubePlayer, YouTubePlayerRef } from '@/components/YouTubePlayer';
import { VideoPlayerControls } from '@/components/room/VideoPlayerControls';

interface VideoSectionProps {
  playerRef: React.RefObject<YouTubePlayerRef | null>;
  videoId: string;
  isPlaying: boolean;
  canControl: boolean;
  onLocalPlay: (time: number) => void;
  onLocalPause: (time: number) => void;
  onLocalSeek: (time: number) => void;
  onTogglePlay: () => void;
  onOpenChangeVideo?: () => void;
  onPlayerReady?: () => void;
  onEnded?: () => void;
}

export function VideoSection({
  playerRef,
  videoId,
  isPlaying,
  canControl,
  onLocalPlay,
  onLocalPause,
  onLocalSeek,
  onTogglePlay,
  onOpenChangeVideo,
  onPlayerReady,
  onEnded,
}: VideoSectionProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [videoWidth, setVideoWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = videoContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setVideoWidth(Math.round(rect.width));
      }
    };

    updateWidth();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setVideoWidth(Math.round(entry.contentRect.width));
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const elementStyle: React.CSSProperties | undefined = videoWidth
    ? { width: `${videoWidth}px`, maxWidth: '100%' }
    : undefined;

  return (
    <div className="w-full h-full flex flex-col items-center justify-between min-h-0 min-w-0 max-lg:justify-center">
      {/* 1. YouTube Video Container */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
        <div
          ref={videoContainerRef}
          className="w-full h-full aspect-video max-h-full max-w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-black/95 shadow-2xl relative flex items-center justify-center border border-white/20"
        >
          {/* Subtle expand icon in top-right matching screenshot */}
          <div className="absolute top-3.5 right-3.5 z-20 pointer-events-none text-white/60">
            <Maximize2 className="w-4 h-4" />
          </div>

          <YouTubePlayer
            ref={playerRef}
            videoId={videoId}
            canControl={canControl}
            onReady={onPlayerReady}
            onEnded={onEnded}
            onLocalPlay={onLocalPlay}
            onLocalPause={onLocalPause}
            onLocalSeek={onLocalSeek}
          />

          {/* MOBILE ONLY: Progress bar / controls appended within the video itself */}
          <div className="lg:hidden absolute bottom-2 left-2 right-2 z-30 pointer-events-auto">
            <VideoPlayerControls
              playerRef={playerRef}
              videoContainerRef={videoContainerRef}
              isPlaying={isPlaying}
              canControl={canControl}
              onTogglePlay={onTogglePlay}
              onSeek={onLocalSeek}
              onOpenChangeVideo={onOpenChangeVideo}
              isAttached={true}
            />
          </div>
        </div>
      </div>

      {/* 2. DESKTOP ONLY: Controls Bar directly below video in separate card (100% UNTOUCHED ORIGINAL DESKTOP DESIGN) */}
      <VideoPlayerControls
        playerRef={playerRef}
        videoContainerRef={videoContainerRef}
        isPlaying={isPlaying}
        canControl={canControl}
        onTogglePlay={onTogglePlay}
        onSeek={onLocalSeek}
        onOpenChangeVideo={onOpenChangeVideo}
        style={elementStyle}
        className="hidden lg:flex"
      />
    </div>
  );
}
