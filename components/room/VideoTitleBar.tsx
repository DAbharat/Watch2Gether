'use client';

import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';

interface VideoTitleBarProps {
  videoId: string;
  participantCount: number;
  style?: React.CSSProperties;
  className?: string;
}

export function VideoTitleBar({
  videoId,
  participantCount,
  style,
  className = '',
}: VideoTitleBarProps) {
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
    <div
      style={style}
      className={`w-full card-cinema rounded-2xl px-4 sm:px-5 py-2.5 flex items-center justify-between gap-4 mb-2.5 shrink-0 shadow-lg ${className}`}
    >
      {/* Video Title on Left */}
      <h2
        className="text-xs sm:text-sm font-bold text-white truncate min-w-0 flex-1 tracking-tight"
        title={videoTitle}
      >
        {videoTitle}
      </h2>

      {/* Participants as Viewer count on Right (matching landing page pill badge) */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] border border-white/15 text-xs font-semibold text-white/90 shrink-0 backdrop-blur-md">
        <span>
          {participantCount} {participantCount === 1 ? 'Viewer' : 'Viewers'}
        </span>
        <Eye className="w-3.5 h-3.5 text-blue-400 stroke-[2]" />
      </div>
    </div>
  );
}
