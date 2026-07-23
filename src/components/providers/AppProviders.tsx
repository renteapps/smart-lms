'use client';

import { AudioPlayerProvider } from '@/contexts/AudioPlayerContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { GlobalMiniPlayer } from '@/components/audio/GlobalMiniPlayer';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AudioPlayerProvider>
      <NotificationProvider>
        {children}
        <GlobalMiniPlayer />
      </NotificationProvider>
    </AudioPlayerProvider>
  );
}
