'use client';

import { Toast } from '@heroui/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { AudioPlayerProvider } from '@/contexts/AudioPlayerContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AutomationProvider } from '@/contexts/AutomationContext';
import { AgentCatalogProvider } from '@/contexts/AgentCatalogContext';
import { AgentChatProvider } from '@/contexts/AgentChatContext';
import { CardTransitionProvider } from '@/contexts/CardTransitionContext';
import { CardExpandOverlay } from '@/components/transitions/CardExpandOverlay';
import { GlobalMiniPlayer } from '@/components/audio/GlobalMiniPlayer';
import type { Agent } from '@/types/agente';

export function AppProviders({
  children,
  agents = [],
}: {
  children: React.ReactNode;
  /** Catálogo lido do Supabase no layout — o provider não busca sozinho. */
  agents?: Agent[];
}) {
  return (
    <AuthProvider>
      <AudioPlayerProvider>
        <NotificationProvider>
          <AutomationProvider>
            {/* O catálogo envolve o chat: quem conversa precisa do agente resolvido. */}
            <AgentCatalogProvider initialAgents={agents}>
              <AgentChatProvider>
                <CardTransitionProvider>
                  {children}
                  <CardExpandOverlay />
                  <GlobalMiniPlayer />
                  <Toast.Provider placement="bottom end" />
                </CardTransitionProvider>
              </AgentChatProvider>
            </AgentCatalogProvider>
          </AutomationProvider>
        </NotificationProvider>
      </AudioPlayerProvider>
    </AuthProvider>
  );
}
