import { Suspense, use } from 'react';
import RoomClient from './RoomClient';

interface PageProps {
  params: Promise<{ roomId: string }>;
}

function RoomContent({ params }: PageProps) {
  const { roomId } = use(params);
  return <RoomClient roomId={roomId} />;
}

export default function RoomPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Entering Watch Party...</p>
        </div>
      }
    >
      <RoomContent params={params} />
    </Suspense>
  );
}
