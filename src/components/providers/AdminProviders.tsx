"use client";

import { Toast } from "@heroui/react";
import { NotificationProvider } from "@/contexts/NotificationContext";

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}<Toast.Provider placement="bottom end" /></NotificationProvider>;
}
