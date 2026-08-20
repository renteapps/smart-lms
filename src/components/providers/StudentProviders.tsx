"use client";

import { Toast } from "@heroui/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { CardTransitionProvider } from "@/contexts/CardTransitionContext";
import { CardExpandOverlay } from "@/components/transitions/CardExpandOverlay";
import { GlobalMiniPlayer } from "@/components/audio/GlobalMiniPlayer";

export function StudentProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AudioPlayerProvider>
        <NotificationProvider>
          <CardTransitionProvider>
            {children}
            <CardExpandOverlay />
            <GlobalMiniPlayer />
            <Toast.Provider placement="bottom end" />
          </CardTransitionProvider>
        </NotificationProvider>
      </AudioPlayerProvider>
    </AuthProvider>
  );
}
