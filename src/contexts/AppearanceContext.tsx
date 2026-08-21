"use client";

import React, { createContext, useContext } from "react";
import type { AppearanceConfig } from "@/types/appearance";
import { DEFAULT_APPEARANCE } from "@/types/appearance";

const AppearanceContext = createContext<AppearanceConfig>(DEFAULT_APPEARANCE);

export function AppearanceProvider({
  value,
  children,
}: {
  value?: Partial<AppearanceConfig>;
  children: React.ReactNode;
}) {
  const merged: AppearanceConfig = {
    ...DEFAULT_APPEARANCE,
    ...value,
  };

  return (
    <AppearanceContext.Provider value={merged}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  return useContext(AppearanceContext);
}
