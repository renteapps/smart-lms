"use client";

import { Toast } from "@heroui/react";
import { AuthProvider } from "@/contexts/AuthContext";

export function AuthPageProviders({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}<Toast.Provider placement="bottom end" /></AuthProvider>;
}
