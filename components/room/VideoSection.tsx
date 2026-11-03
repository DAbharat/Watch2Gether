'use client';

import React, { useRef } from 'react';
import { YouTubePlayer, YouTubePlayerRef } from '@/components/YouTubePlayer';
import { VideoTitleBar } from '@/components/room/VideoTitleBar';
import { VideoPlayerControls } from '@/components/room/VideoPlayerControls';

interface VideoSectionProps {
  playerRef: React.RefObject<YouTubePlayerRef | null>;
  videoId: string;
  participantCount: number;
  isPlaying: boolean;
  canControl: boolean;
  onLocalPlay: (time: number) => void;
  onLocalPause: (time: number) => void;
  onLocalSeek: (time: number) => void;
  onTogglePlay: () => void;
}

export function VideoSection({
  playerRef,
  videoId,
  participantCount,
  isPlaying,
  canControl,
  onLocalPlay,
  onLocalPause,
  onLocalSeek,
  onTogglePlay,
}: VideoSectionProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full h-full flex flex-col justify-between min-h-0 min-w-0">
      {/* 1. Title Bar: YouTube Video Title on left, Viewers count on right */}
      <VideoTitleBar videoId={videoId} participantCount={participantCount} />

      {/* 2. Middle: YouTube Video - 16:9 aspect ratio, strictly constrained to viewport height */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
        <div
          ref={videoContainerRef}
          className="w-full h-full aspect-video max-h-full max-w-full rounded-2xl overflow-hidden bg-black shadow-2xl relative flex items-center justify-center border border-white/[0.08]"
        >
          <YouTubePlayer
            ref={playerRef}
            videoId={videoId}
            canControl={canControl}
            onLocalPlay={onLocalPlay}
            onLocalPause={onLocalPause}
            onLocalSeek={onLocalSeek}
          />
        </div>
      </div>

      {/* 3. Bottom: Controls Bar directly below video with Play/Pause and duration */}
      <VideoPlayerControls
        playerRef={playerRef}
        videoContainerRef={videoContainerRef}
        isPlaying={isPlaying}
        canControl={canControl}
        onTogglePlay={onTogglePlay}
        onSeek={onLocalSeek}
      />
    </div>
  );
}
