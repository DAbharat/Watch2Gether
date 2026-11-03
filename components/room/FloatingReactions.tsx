'use client';

import React from 'react';
import { ReactionData } from '@/lib/types';

interface FloatingReactionsProps {
  reactions: ReactionData[];
}

export function FloatingReactions({ reactions }: FloatingReactionsProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-8 pointer-events-none z-40 flex flex-col gap-2 items-end">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#160b24]/90 border border-white/15 text-sm animate-fade-in-up backdrop-blur-md shadow-lg"
        >
          <span>{r.emoji}</span>
          <span className="text-[11px] text-white/80 font-medium">{r.username}</span>
        </div>
      ))}
    </div>
  );
}
