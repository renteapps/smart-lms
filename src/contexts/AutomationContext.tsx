"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AutomationRule } from "@/types/automation";

interface AutomationContextData {
  automations: AutomationRule[];
  addAutomation: (automation: Omit<AutomationRule, "id" | "createdAt" | "stats" | "status">) => void;
  toggleStatus: (id: string) => void;
  deleteAutomation: (id: string) => void;
}

const AutomationContext = createContext<AutomationContextData>({} as AutomationContextData);

export function AutomationProvider({ children }: { children: React.ReactNode }) {
  const [automations, setAutomations] = useState<AutomationRule[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("@smartlms:automations");
    if (saved) {
      try {
        setAutomations(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing automations", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("@smartlms:automations", JSON.stringify(automations));
  }, [automations]);

  const addAutomation = (automation: Omit<AutomationRule, "id" | "createdAt" | "stats" | "status">) => {
    const newAutomation: AutomationRule = {
      ...automation,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'active',
      stats: {
        triggeredCount: 0,
        views: 0,
        opens: 0,
        clicks: 0,
      }
    };
    setAutomations((prev) => [newAutomation, ...prev]);
  };

  const toggleStatus = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: a.status === 'active' ? 'paused' : 'active' } : a))
    );
  };

  const deleteAutomation = (id: string) => {
    setAutomations((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <AutomationContext.Provider
      value={{
        automations,
        addAutomation,
        toggleStatus,
        deleteAutomation,
      }}
    >
      {children}
    </AutomationContext.Provider>
  );
}

export function useAutomations() {
  const context = useContext(AutomationContext);
  if (!context) {
    throw new Error("useAutomations must be used within an AutomationProvider");
  }
  return context;
}
