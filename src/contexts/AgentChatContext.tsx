"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@heroui/react";
import { typingDelay } from "@/lib/agentChat";
import { deriveConversationTitle } from "@/lib/data/agents";
import {
  deleteConversation as deleteConversationAction,
  listMyConversationSummaries,
  loadMyConversation,
} from "@/app/actions/agentChat";
import { getAiCredits } from "@/app/actions/agents";
import type { Agent, AgentConversation } from "@/types/agente";

interface AgentChatContextData {
  isLoaded: boolean;
  conversations: AgentConversation[];
  typingConversationId: string | null;
  credits: number | null;
  nextCursor: string | null;
  conversationsForAgent: (agentId: string) => AgentConversation[];
  loadConversation: (conversationId: string) => Promise<void>;
  loadMoreConversations: () => Promise<void>;
  sendMessage: (agent: Agent, conversationId: string | null, text: string) => string;
  deleteConversation: (conversationId: string) => void;
}

type AgentChatResponse = {
  success?: boolean;
  error?: string;
  conversationId?: string;
  text?: string;
  creditsRemaining?: number;
  userMessage?: { id: string; author: "student"; text: string };
  assistantMessage?: { id: string; author: "agent"; text: string };
};

const AgentChatContext = createContext<AgentChatContextData>({} as AgentChatContextData);

export function AgentChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [typingConversationId, setTypingConversationId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const timers = useRef(new Map<string, Set<number>>());
  // Mantém o id otimista estável na UI enquanto registra o UUID real no banco.
  const persistedIds = useRef(new Map<string, string>());

  useEffect(() => {
    let active = true;
    void Promise.all([listMyConversationSummaries(), getAiCredits()]).then(([page, currentCredits]) => {
      if (!active) return;
      setConversations(page.items);
      setNextCursor(page.nextCursor);
      setCredits(currentCredits);
      setIsLoaded(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((items) => items.forEach((timer) => window.clearTimeout(timer)));
      pending.clear();
    };
  }, []);

  const trackTimer = useCallback((conversationId: string, timer: number) => {
    const conversationTimers = timers.current.get(conversationId) ?? new Set<number>();
    conversationTimers.add(timer);
    timers.current.set(conversationId, conversationTimers);
  }, []);

  const loadConversation = useCallback(async (conversationId: string) => {
    const current = conversations.find((item) => item.id === conversationId);
    if (!current || current.messagesLoaded !== false) return;
    const loaded = await loadMyConversation(conversationId);
    if (!loaded) return;
    setConversations((items) => items.map((item) => item.id === conversationId ? loaded : item));
  }, [conversations]);

  const loadMoreConversations = useCallback(async () => {
    if (!nextCursor) return;
    const page = await listMyConversationSummaries(nextCursor);
    setConversations((current) => {
      const known = new Set(current.map((item) => item.id));
      return [...current, ...page.items.filter((item) => !known.has(item.id))];
    });
    setNextCursor(page.nextCursor);
  }, [nextCursor]);

  const sendMessage = useCallback((agent: Agent, conversationId: string | null, text: string) => {
    const message = text.trim();
    const now = new Date().toISOString();
    const targetId = conversationId ?? `draft-${crypto.randomUUID()}`;
    const optimisticId = `pending-${crypto.randomUUID()}`;

    setConversations((current) => {
      const existing = current.find((item) => item.id === targetId);
      const studentMessage = { id: optimisticId, author: "student" as const, text: message };
      if (!existing) {
        return [{
          id: targetId,
          agentId: agent.id,
          title: deriveConversationTitle(message),
          messages: [studentMessage],
          createdAt: now,
          updatedAt: now,
          messagesLoaded: true,
          messageCount: 1,
        }, ...current];
      }
      return current.map((item) => item.id === targetId ? {
        ...item,
        messages: [...item.messages, studentMessage],
        updatedAt: now,
        messagesLoaded: true,
        messageCount: (item.messageCount ?? item.messages.length) + 1,
      } : item);
    });
    setTypingConversationId(targetId);

    const startedAt = Date.now();
    void fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: agent.id,
        conversationId: conversationId ? (persistedIds.current.get(conversationId) ?? conversationId) : null,
        message,
      }),
    }).then(async (response) => {
      const body = (await response.json()) as AgentChatResponse;
      if (!response.ok || !body.success || !body.conversationId || !body.text) {
        if (typeof body.creditsRemaining === "number") setCredits(body.creditsRemaining);
        throw new Error(body.error || "Não foi possível obter a resposta do agente.");
      }

      if (targetId.startsWith("draft-")) persistedIds.current.set(targetId, body.conversationId);
      if (typeof body.creditsRemaining === "number") setCredits(body.creditsRemaining);

      const remainingDelay = Math.max(0, typingDelay(message) - (Date.now() - startedAt));
      const timer = window.setTimeout(() => {
        timers.current.get(targetId)?.delete(timer);
        setConversations((current) => current.map((item) => item.id === targetId ? {
          ...item,
          messages: [
            ...item.messages.map((entry) => entry.id === optimisticId && body.userMessage
              ? { id: body.userMessage.id, author: "student" as const, text: body.userMessage.text }
              : entry),
            { id: body.assistantMessage?.id ?? crypto.randomUUID(), author: "agent" as const, text: body.text! },
          ],
          updatedAt: new Date().toISOString(),
          messageCount: (item.messageCount ?? item.messages.length) + 1,
        } : item));
        setTypingConversationId((current) => current === targetId ? null : current);
      }, remainingDelay);
      trackTimer(targetId, timer);
    }).catch((error: unknown) => {
      setTypingConversationId((current) => current === targetId ? null : current);
      toast.danger("Não foi possível responder", {
        description: error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    });

    return targetId;
  }, [trackTimer]);

  const deleteConversation = useCallback((conversationId: string) => {
    timers.current.get(conversationId)?.forEach((timer) => window.clearTimeout(timer));
    timers.current.delete(conversationId);
    setConversations((current) => current.filter((item) => item.id !== conversationId));
    setTypingConversationId((current) => current === conversationId ? null : current);
    const persistedId = persistedIds.current.get(conversationId) ?? conversationId;
    persistedIds.current.delete(conversationId);
    if (!persistedId.startsWith("draft-")) void deleteConversationAction(persistedId);
  }, []);

  const conversationsForAgent = useCallback((agentId: string) =>
    conversations.filter((item) => item.agentId === agentId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [conversations]);

  const value = useMemo(() => ({
    isLoaded,
    conversations,
    typingConversationId,
    credits,
    nextCursor,
    conversationsForAgent,
    loadConversation,
    loadMoreConversations,
    sendMessage,
    deleteConversation,
  }), [
    isLoaded, conversations, typingConversationId, credits, nextCursor,
    conversationsForAgent, loadConversation, loadMoreConversations, sendMessage, deleteConversation,
  ]);

  return <AgentChatContext.Provider value={value}>{children}</AgentChatContext.Provider>;
}

export function useAgentChat() {
  return useContext(AgentChatContext);
}
