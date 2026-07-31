'use client';

import { AudioPlayerProvider } from '@/contexts/AudioPlayerContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AutomationProvider } from '@/contexts/AutomationContext';
import { GlobalMiniPlayer } from '@/components/audio/GlobalMiniPlayer';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AudioPlayerProvider>
      <NotificationProvider>
        <AutomationProvider>
          {children}
          <GlobalMiniPlayer />
        </AutomationProvider>
      </NotificationProvider>
    </AudioPlayerProvider>
  );
}
