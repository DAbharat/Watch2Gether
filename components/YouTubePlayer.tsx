'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

export interface YouTubePlayerRef {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number) => void;
  loadVideo: (videoId: string) => void;
  getCurrentTime: () => number;
}

interface YouTubePlayerProps {
  videoId: string;
  canControl: boolean;
  onLocalPlay: (currentTime: number) => void;
  onLocalPause: (currentTime: number) => void;
  onLocalSeek: (time: number) => void;
}

export const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(({
  videoId,
  canControl,
  onLocalPlay,
  onLocalPause,
  onLocalSeek,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isRemoteActionRef = useRef<boolean>(false);
  const [isReady, setIsReady] = useState(false);

  useImperativeHandle(ref, () => ({
    playVideo: () => {
      if (!playerRef.current?.playVideo) return;
      isRemoteActionRef.current = true;
      playerRef.current.playVideo();
      setTimeout(() => { isRemoteActionRef.current = false; }, 600);
    },
    pauseVideo: () => {
      if (!playerRef.current?.pauseVideo) return;
      isRemoteActionRef.current = true;
      playerRef.current.pauseVideo();
      setTimeout(() => { isRemoteActionRef.current = false; }, 600);
    },
    seekTo: (seconds: number) => {
      if (!playerRef.current?.seekTo) return;
      isRemoteActionRef.current = true;
      playerRef.current.seekTo(seconds, true);
      setTimeout(() => { isRemoteActionRef.current = false; }, 600);
    },
    loadVideo: (newVideoId: string) => {
      if (!playerRef.current?.loadVideoById) return;
      isRemoteActionRef.current = true;
      playerRef.current.loadVideoById(newVideoId);
      setTimeout(() => { isRemoteActionRef.current = false; }, 800);
    },
    getCurrentTime: () => {
      return playerRef.current?.getCurrentTime ? playerRef.current.getCurrentTime() : 0;
    }
  }));

  useEffect(() => {
    let isMounted = true;

    const initializePlayer = () => {
      if (!window.YT || !window.YT.Player || !containerRef.current) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: canControl ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady: () => {
            if (isMounted) setIsReady(true);
          },
          onStateChange: (event: any) => {
            // Ignore programmatically triggered playback changes to prevent circular feedback loops
            if (isRemoteActionRef.current) return;
            if (!canControl) return;

            const currentTime = playerRef.current?.getCurrentTime() || 0;
            if (event.data === 1) {
              onLocalPlay(currentTime);
            } else if (event.data === 2) {
              onLocalPause(currentTime);
            }
          },
        },
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initializePlayer();
      };
    } else {
      initializePlayer();
    }

    return () => {
      isMounted = false;
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [canControl]);

  useEffect(() => {
    if (isReady && playerRef.current?.loadVideoById) {
      const currentUrl = playerRef.current.getVideoUrl?.() || '';
      if (!currentUrl.includes(videoId)) {
        isRemoteActionRef.current = true;
        playerRef.current.loadVideoById(videoId);
        setTimeout(() => { isRemoteActionRef.current = false; }, 800);
      }
    }
  }, [videoId, isReady]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
      <div ref={containerRef} className="w-full h-full" />

      {!canControl && (
        <div 
          className="absolute inset-0 bg-transparent z-10 cursor-not-allowed" 
          title="Playback is controlled by Host and Moderators"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Connecting to YouTube...</p>
        </div>
      )}
    </div>
  );
});

YouTubePlayer.displayName = 'YouTubePlayer';
