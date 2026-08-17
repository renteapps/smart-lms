"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAgentReply, typingDelay } from "@/lib/agentChat";
import { deriveConversationTitle } from "@/lib/data/agents";
import {
  appendAgentMessage,
  deleteConversation as deleteConversationAction,
  listMyConversations,
  startConversation,
} from "@/app/actions/agentChat";
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

  /*
   * O histórico vive no Supabase, então é lido uma vez ao montar. Cada mensagem
   * é gravada assim que existe — não há um "salvar tudo" no fim, que era o que
   * fazia a versão em localStorage perder a conversa quando a aba fechava no
   * meio de uma resposta.
   */
  useEffect(() => {
    let active = true;

    (async () => {
      const loaded = await listMyConversations();
      if (!active) return;
      setConversations(loaded);
      setIsLoaded(true);
    })();

    return () => {
      active = false;
    };
  }, []);

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
      // Id provisório enquanto o servidor não devolve o definitivo: a bolha da
      // pergunta aparece na hora, sem esperar a ida ao banco.
      const targetId = conversationId ?? `draft-${crypto.randomUUID()}`;
      let currentThreadHistory: { id: string; author: "student" | "agent"; text: string }[] = [];

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
          currentThreadHistory = [studentMessage];
          return [created, ...current];
        }

        currentThreadHistory = [...existing.messages, studentMessage];
        return current.map((item) =>
          item.id === targetId
            ? { ...item, messages: currentThreadHistory, updatedAt: now }
            : item,
        );
      });

      setTypingConversationId(targetId);

      /** Id real da thread no banco, resolvido antes de qualquer gravação. */
      const ensurePersistedId = async (): Promise<string | null> => {
        if (conversationId) {
          await appendAgentMessage(conversationId, "student", message);
          return conversationId;
        }

        const created = await startConversation(agent.id, message);
        if (!created.success || !created.conversationId) return null;

        await appendAgentMessage(created.conversationId, "student", message);

        // Troca o id provisório pelo definitivo, preservando as mensagens.
        setConversations((current) =>
          current.map((item) =>
            item.id === targetId ? { ...item, id: created.conversationId! } : item,
          ),
        );
        setTypingConversationId((current) =>
          current === targetId ? created.conversationId! : current,
        );
        return created.conversationId;
      };

      const fetchAiOrFallback = async () => {
        const persistedId = await ensurePersistedId();
        const liveId = persistedId ?? targetId;

        const commitReply = (replyText: string) => {
          setConversations((current) =>
            current.map((item) => {
              if (item.id !== liveId) return item;
              return {
                ...item,
                messages: [
                  ...item.messages,
                  { id: crypto.randomUUID(), author: "agent" as const, text: replyText },
                ],
                updatedAt: new Date().toISOString(),
              };
            }),
          );
          setTypingConversationId((current) => (current === liveId ? null : current));
          if (persistedId) void appendAgentMessage(persistedId, "agent", replyText);
        };

        try {
          const formattedMessages = currentThreadHistory.map((m) => ({
            role: m.author === "student" ? "user" : "assistant",
            content: m.text,
          }));

          const res = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              agentId: agent.id,
              agentName: agent.name,
              systemPrompt: agent.systemPrompt,
              context: agent.context,
              model: agent.aiModel,
              messages: formattedMessages,
            }),
          });

          const data = await res.json();
          if (res.ok && data.success && data.text && !data.simulated) {
            commitReply(data.text);
            return;
          }
        } catch (e) {
          console.warn("Fallback para roteiro após erro de IA:", e);
        }

        // Fallback para o roteiro escrito pelo admin.
        const timer = window.setTimeout(() => {
          timers.current.get(liveId)?.delete(timer);

          setConversations((current) => {
            const thread = current.find((item) => item.id === liveId);
            const turn = thread?.messages.filter((entry) => entry.author === "agent").length ?? 0;
            const replyText = getAgentReply(agent, message, turn);

            if (persistedId) void appendAgentMessage(persistedId, "agent", replyText);

            return current.map((item) =>
              item.id === liveId
                ? {
                    ...item,
                    messages: [
                      ...item.messages,
                      { id: crypto.randomUUID(), author: "agent" as const, text: replyText },
                    ],
                    updatedAt: new Date().toISOString(),
                  }
                : item,
            );
          });

          setTypingConversationId((current) => (current === liveId ? null : current));
        }, typingDelay(message));

        trackTimer(liveId, timer);
      };

      fetchAiOrFallback();
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

    if (!conversationId.startsWith("draft-")) {
      void deleteConversationAction(conversationId);
    }
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
