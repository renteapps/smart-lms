"use client";

import { Toast } from "@heroui/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { GlobalMiniPlayer } from "@/components/audio/GlobalMiniPlayer";

export function MarketingProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AudioPlayerProvider>
        <NotificationProvider>
          {children}
          <GlobalMiniPlayer />
          <Toast.Provider placement="bottom end" />
        </NotificationProvider>
      </AudioPlayerProvider>
    </AuthProvider>
  );
}
