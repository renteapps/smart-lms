"use client";

import { AgentCatalogProvider } from "@/contexts/AgentCatalogContext";
import { AgentChatProvider } from "@/contexts/AgentChatContext";
import type { Agent } from "@/types/agente";

export function AgentProviders({ children, agents, withChat = false }: {
  children: React.ReactNode;
  agents: Agent[];
  withChat?: boolean;
}) {
  const content = <AgentCatalogProvider initialAgents={agents}>{children}</AgentCatalogProvider>;
  return withChat ? <AgentChatProvider>{content}</AgentChatProvider> : content;
}
