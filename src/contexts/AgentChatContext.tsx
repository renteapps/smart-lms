"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAgentReply, typingDelay } from "@/lib/agentChat";
import { deriveConversationTitle, readAgentConversations, saveAgentConversations } from "@/lib/agentChatStorage";
import type { Agent, AgentConversation } from "@/types/agente";

interface AgentChatContextData {
  /** Falso até o histórico local ser lido — a lista mostra esqueleto nesse intervalo. */
  isLoaded: boolean;
  conversations: AgentConversation[];
  /** Thread que está recebendo resposta agora. */
  typingConversationId: string | null;
  conversationsForAgent: (agentId: string) => AgentConversation[];
  /**
   * Envia a mensagem e devolve o id da thread usada. Com `conversationId` nulo,
   * a thread é criada agora — conversa vazia não entra no histórico, do mesmo
   * jeito que num "novo chat" que ninguém chegou a usar.
   */
  sendMessage: (agent: Agent, conversationId: string | null, text: string) => string;
  deleteConversation: (conversationId: string) => void;
}

const AgentChatContext = createContext<AgentChatContextData>({} as AgentChatContextData);

export function AgentChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [typingConversationId, setTypingConversationId] = useState<string | null>(null);
  const timers = useRef(new Map<string, Set<number>>());

  useEffect(() => {
    setConversations(readAgentConversations());
    setIsLoaded(true);
  }, []);

  // Só grava depois da leitura inicial: senão o estado vazio apagaria o histórico.
  useEffect(() => {
    if (!isLoaded) return;
    saveAgentConversations(conversations);
  }, [conversations, isLoaded]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((conversationTimers) => conversationTimers.forEach((timer) => window.clearTimeout(timer)));
      pending.clear();
    };
  }, []);

  const trackTimer = useCallback((conversationId: string, timer: number) => {
    const conversationTimers = timers.current.get(conversationId) ?? new Set<number>();
    conversationTimers.add(timer);
    timers.current.set(conversationId, conversationTimers);
  }, []);

  const sendMessage = useCallback(
    (agent: Agent, conversationId: string | null, text: string) => {
      const message = text.trim();
      const now = new Date().toISOString();
      const targetId = conversationId ?? crypto.randomUUID();

      setConversations((current) => {
        const existing = current.find((item) => item.id === targetId);
        const studentMessage = { id: crypto.randomUUID(), author: "student" as const, text: message };

        if (!existing) {
          const created: AgentConversation = {
            id: targetId,
            agentId: agent.id,
            title: deriveConversationTitle(message),
            messages: [studentMessage],
            createdAt: now,
            updatedAt: now,
          };
          return [created, ...current];
        }

        return current.map((item) =>
          item.id === targetId
            ? { ...item, messages: [...item.messages, studentMessage], updatedAt: now }
            : item,
        );
      });

      setTypingConversationId(targetId);

      const timer = window.setTimeout(() => {
        timers.current.get(targetId)?.delete(timer);

        setConversations((current) =>
          current.map((item) => {
            if (item.id !== targetId) return item;
            // O turno alterna os fallbacks para o agente não repetir a mesma saída.
            const turn = item.messages.filter((entry) => entry.author === "agent").length;
            return {
              ...item,
              messages: [
                ...item.messages,
                { id: crypto.randomUUID(), author: "agent" as const, text: getAgentReply(agent, message, turn) },
              ],
              updatedAt: new Date().toISOString(),
            };
          }),
        );
        setTypingConversationId((current) => (current === targetId ? null : current));
      }, typingDelay(message));

      trackTimer(targetId, timer);
      return targetId;
    },
    [trackTimer],
  );

  const deleteConversation = useCallback((conversationId: string) => {
    // Cancela a resposta pendente: ela pousaria numa thread que não existe mais.
    timers.current.get(conversationId)?.forEach((timer) => window.clearTimeout(timer));
    timers.current.delete(conversationId);

    setConversations((current) => current.filter((item) => item.id !== conversationId));
    setTypingConversationId((current) => (current === conversationId ? null : current));
  }, []);

  const conversationsForAgent = useCallback(
    (agentId: string) =>
      conversations
        .filter((item) => item.agentId === agentId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [conversations],
  );

  const value = useMemo(
    () => ({
      isLoaded,
      conversations,
      typingConversationId,
      conversationsForAgent,
      sendMessage,
      deleteConversation,
    }),
    [isLoaded, conversations, typingConversationId, conversationsForAgent, sendMessage, deleteConversation],
  );

  return <AgentChatContext.Provider value={value}>{children}</AgentChatContext.Provider>;
}

export function useAgentChat() {
  return useContext(AgentChatContext);
}
