'use client';

import { Toast } from '@heroui/react';
import { AudioPlayerProvider } from '@/contexts/AudioPlayerContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AutomationProvider } from '@/contexts/AutomationContext';
import { AgentChatProvider } from '@/contexts/AgentChatContext';
import { GlobalMiniPlayer } from '@/components/audio/GlobalMiniPlayer';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AudioPlayerProvider>
      <NotificationProvider>
        <AutomationProvider>
          <AgentChatProvider>
            {children}
            <GlobalMiniPlayer />
            <Toast.Provider placement="bottom end" />
          </AgentChatProvider>
        </AutomationProvider>
      </NotificationProvider>
    </AudioPlayerProvider>
  );
}
