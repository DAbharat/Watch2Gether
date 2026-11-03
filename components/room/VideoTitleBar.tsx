'use client';

import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';

interface VideoTitleBarProps {
  videoId: string;
  participantCount: number;
}

export function VideoTitleBar({ videoId, participantCount }: VideoTitleBarProps) {
  const [videoTitle, setVideoTitle] = useState<string>('Loading video...');

  useEffect(() => {
    let isMounted = true;

    async function fetchVideoTitle() {
      if (!videoId) return;
      try {
        const res = await fetch(
          `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
        );
        const data = await res.json();
        if (isMounted && data?.title) {
          setVideoTitle(data.title);
          return;
        }
      } catch (err) {
        // Fallback gracefully
      }
      if (isMounted) {
        setVideoTitle(`YouTube Video (${videoId})`);
      }
    }

    fetchVideoTitle();

    return () => {
      isMounted = false;
    };
  }, [videoId]);

  return (
    <div className="w-full bg-[#1e1f25] border border-white/[0.04] rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 mb-3 shrink-0 shadow-sm">
      {/* Video Title on Left */}
      <h2
        className="text-xs sm:text-sm font-medium text-zinc-200 truncate min-w-0 flex-1 tracking-tight"
        title={videoTitle}
      >
        {videoTitle}
      </h2>

      {/* Participants as Viewer count on Right */}
      <div className="flex items-center gap-2 text-xs text-zinc-400 shrink-0">
        <span className="font-medium text-zinc-400">
          {participantCount} {participantCount === 1 ? 'Viewer' : 'Viewers'}
        </span>
        <Eye className="w-4 h-4 text-zinc-400 stroke-[1.75]" />
      </div>
    </div>
  );
}
