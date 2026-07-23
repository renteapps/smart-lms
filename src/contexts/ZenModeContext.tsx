"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ZenModeContextType {
  isZenMode: boolean;
  toggleZenMode: () => void;
}

const ZenModeContext = createContext<ZenModeContextType | undefined>(undefined);

export function ZenModeProvider({ children }: { children: ReactNode }) {
  const [isZenMode, setIsZenMode] = useState(false);

  const toggleZenMode = () => setIsZenMode((prev) => !prev);

  return (
    <ZenModeContext.Provider value={{ isZenMode, toggleZenMode }}>
      {children}
    </ZenModeContext.Provider>
  );
}

export function useZenMode() {
  const context = useContext(ZenModeContext);
  if (context === undefined) {
    throw new Error("useZenMode must be used within a ZenModeProvider");
  }
  return context;
}
