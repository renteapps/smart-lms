"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@heroui/react";
import { typingDelay } from "@/lib/agentChat";
import { deriveConversationTitle } from "@/lib/data/agents";
import {
  deleteConversation as deleteConversationAction,
  listMyConversationSummaries,
  loadMyConversation,
  setMessageFeedback as setMessageFeedbackAction,
} from "@/app/actions/agentChat";
import { getAiCredits } from "@/app/actions/agents";
import type { Agent, AgentConversation, AgentMessageFeedback } from "@/types/agente";

interface AgentChatContextData {
  isLoaded: boolean;
  conversations: AgentConversation[];
  typingConversationId: string | null;
  credits: number | null;
  lastCreditsCharged: number | null;
  nextCursor: string | null;
  failedMessageIds: Set<string>;
  conversationsForAgent: (agentId: string) => AgentConversation[];
  loadConversation: (conversationId: string) => Promise<void>;
  loadMoreConversations: () => Promise<void>;
  sendMessage: (agent: Agent, conversationId: string | null, text: string) => string;
  retryMessage: (agent: Agent, conversationId: string, messageId: string, text: string) => void;
  regenerateMessage: (agent: Agent, conversationId: string) => void;
  editAndResend: (agent: Agent, conversationId: string, messageId: string, text: string) => void;
  setFeedback: (conversationId: string, messageId: string, feedback: AgentMessageFeedback | null) => void;
  deleteConversation: (conversationId: string) => void;
}

type AgentChatResponse = {
  success?: boolean;
  error?: string;
  conversationId?: string;
  text?: string;
  creditsRemaining?: number;
  creditsCharged?: number;
  userMessage?: { id: string; author: "student"; text: string };
  assistantMessage?: { id: string; author: "agent"; text: string };
};

type ExchangeRequestBody = {
  agentId: string;
  conversationId: string | null;
  message?: string;
  regenerate?: boolean;
  editMessageId?: string;
};

type ExchangeOptions = {
  /** Texto usado para calcular o delay cosmético de "digitando" — normalmente a pergunta enviada. */
  delayBasis: (body: AgentChatResponse) => string;
  onUserMessagePersisted?: (realId: string, text: string) => void;
  applySuccess: (body: AgentChatResponse) => void;
  onFailure?: () => void;
};

const AgentChatContext = createContext<AgentChatContextData>({} as AgentChatContextData);

export function AgentChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [typingConversationId, setTypingConversationId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [lastCreditsCharged, setLastCreditsCharged] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [failedMessageIds, setFailedMessageIds] = useState<Set<string>>(new Set());
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

  /**
   * Miolo comum a envio, regeneração e edição: dispara o POST, aplica o
   * cooldown "digitando" e resolve créditos/erro do mesmo jeito nos três
   * casos. Cada chamador só decide o corpo da requisição e como a resposta
   * se reflete nas mensagens locais.
   */
  const performExchange = useCallback((
    targetId: string,
    requestBody: ExchangeRequestBody,
    options: ExchangeOptions,
  ) => {
    setTypingConversationId(targetId);
    const startedAt = Date.now();

    void fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }).then(async (response) => {
      const body = (await response.json()) as AgentChatResponse;

      // A rota pode ter persistido a pergunta antes de o provedor falhar.
      // Mantemos o rascunho ligado ao UUID real e trocamos o id otimista para
      // que uma nova tentativa continue na mesma conversa.
      if (body.conversationId && targetId.startsWith("draft-")) {
        persistedIds.current.set(targetId, body.conversationId);
      }
      if (body.userMessage) {
        options.onUserMessagePersisted?.(body.userMessage.id, body.userMessage.text);
      }

      if (!response.ok || !body.success || !body.conversationId || !body.text) {
        if (typeof body.creditsRemaining === "number") setCredits(body.creditsRemaining);
        throw new Error(body.error || "Não foi possível obter a resposta do agente.");
      }

      if (typeof body.creditsRemaining === "number") setCredits(body.creditsRemaining);
      if (typeof body.creditsCharged === "number") setLastCreditsCharged(body.creditsCharged);

      const remainingDelay = Math.max(0, typingDelay(options.delayBasis(body)) - (Date.now() - startedAt));
      const timer = window.setTimeout(() => {
        timers.current.get(targetId)?.delete(timer);
        options.applySuccess(body);
        setTypingConversationId((current) => current === targetId ? null : current);
      }, remainingDelay);
      trackTimer(targetId, timer);
    }).catch((error: unknown) => {
      setTypingConversationId((current) => current === targetId ? null : current);
      options.onFailure?.();
      toast.danger("Não foi possível responder", {
        description: error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    });
  }, [trackTimer]);

  /**
   * Insere a mensagem otimista e dispara a troca. Compartilhado por envio
   * normal e retry — o que muda entre os dois é só como `targetId` (a
   * conversa local) e `requestConversationId` (o que vai pro servidor) são
   * resolvidos, então essa resolução fica de fora, a cargo de cada chamador.
   */
  const dispatchStudentMessage = useCallback((
    agent: Agent,
    targetId: string,
    requestConversationId: string | null,
    message: string,
  ) => {
    const now = new Date().toISOString();
    const optimisticId = `pending-${crypto.randomUUID()}`;
    let currentMessageId = optimisticId;

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

    performExchange(targetId, { agentId: agent.id, conversationId: requestConversationId, message }, {
      delayBasis: () => message,
      onUserMessagePersisted: (realId, realText) => {
        currentMessageId = realId;
        setConversations((current) => current.map((item) => item.id === targetId ? {
          ...item,
          messages: item.messages.map((entry) => entry.id === optimisticId
            ? { id: realId, author: "student" as const, text: realText }
            : entry),
        } : item));
      },
      applySuccess: (body) => {
        setConversations((current) => current.map((item) => item.id === targetId ? {
          ...item,
          messages: [...item.messages, { id: body.assistantMessage?.id ?? crypto.randomUUID(), author: "agent" as const, text: body.text! }],
          updatedAt: new Date().toISOString(),
          messageCount: (item.messageCount ?? item.messages.length) + 1,
        } : item));
      },
      onFailure: () => {
        setFailedMessageIds((current) => {
          const next = new Set(current);
          next.add(currentMessageId);
          return next;
        });
      },
    });
  }, [performExchange]);

  const sendMessage = useCallback((agent: Agent, conversationId: string | null, text: string) => {
    const message = text.trim();
    const targetId = conversationId ?? `draft-${crypto.randomUUID()}`;
    const requestConversationId = conversationId ? (persistedIds.current.get(conversationId) ?? conversationId) : null;
    dispatchStudentMessage(agent, targetId, requestConversationId, message);
    return targetId;
  }, [dispatchStudentMessage]);

  /**
   * Descarta a mensagem que falhou e tenta de novo na mesma conversa local.
   *
   * Se a primeira mensagem de uma conversa nova falhar antes de qualquer
   * resposta do servidor, `persistedIds` nunca chega a ser preenchido — nesse
   * caso o id local ainda é só um rascunho, então o pedido ao servidor tem
   * que ir com `conversationId: null` (como um envio novo), não com o
   * rascunho, que o servidor não reconheceria.
   */
  const retryMessage = useCallback((agent: Agent, conversationId: string, messageId: string, text: string) => {
    setConversations((current) => current.map((item) => item.id === conversationId ? {
      ...item,
      messages: item.messages.filter((entry) => entry.id !== messageId),
      messageCount: Math.max(0, (item.messageCount ?? item.messages.length) - 1),
    } : item));
    setFailedMessageIds((current) => {
      if (!current.has(messageId)) return current;
      const next = new Set(current);
      next.delete(messageId);
      return next;
    });
    const persistedId = persistedIds.current.get(conversationId);
    const requestConversationId = persistedId ?? (conversationId.startsWith("draft-") ? null : conversationId);
    dispatchStudentMessage(agent, conversationId, requestConversationId, text.trim());
  }, [dispatchStudentMessage]);

  /** Troca a última resposta do agente por uma nova, sem repetir a pergunta. */
  const regenerateMessage = useCallback((agent: Agent, conversationId: string) => {
    performExchange(conversationId, {
      agentId: agent.id,
      conversationId: persistedIds.current.get(conversationId) ?? conversationId,
      regenerate: true,
    }, {
      delayBasis: (body) => body.text ?? "",
      applySuccess: (body) => {
        setConversations((current) => current.map((item) => {
          if (item.id !== conversationId) return item;
          const withoutLastReply = item.messages.length > 0 && item.messages[item.messages.length - 1].author === "agent"
            ? item.messages.slice(0, -1)
            : item.messages;
          return {
            ...item,
            messages: [...withoutLastReply, { id: body.assistantMessage?.id ?? crypto.randomUUID(), author: "agent" as const, text: body.text! }],
            updatedAt: new Date().toISOString(),
          };
        }));
      },
    });
  }, [performExchange]);

  /** Edita uma pergunta já enviada: descarta tudo depois dela e reenvia. */
  const editAndResend = useCallback((agent: Agent, conversationId: string, messageId: string, text: string) => {
    const message = text.trim();
    if (!message) return;
    const optimisticId = `pending-${crypto.randomUUID()}`;
    let currentMessageId = optimisticId;
    const now = new Date().toISOString();

    setConversations((current) => current.map((item) => {
      if (item.id !== conversationId) return item;
      const index = item.messages.findIndex((entry) => entry.id === messageId);
      const kept = index >= 0 ? item.messages.slice(0, index) : item.messages;
      return {
        ...item,
        messages: [...kept, { id: optimisticId, author: "student" as const, text: message }],
        updatedAt: now,
        messageCount: kept.length + 1,
        title: index === 0 ? deriveConversationTitle(message) : item.title,
      };
    }));

    performExchange(conversationId, {
      agentId: agent.id,
      conversationId: persistedIds.current.get(conversationId) ?? conversationId,
      message,
      editMessageId: messageId,
    }, {
      delayBasis: () => message,
      onUserMessagePersisted: (realId, realText) => {
        currentMessageId = realId;
        setConversations((current) => current.map((item) => item.id === conversationId ? {
          ...item,
          messages: item.messages.map((entry) => entry.id === optimisticId
            ? { id: realId, author: "student" as const, text: realText }
            : entry),
        } : item));
      },
      applySuccess: (body) => {
        setConversations((current) => current.map((item) => item.id === conversationId ? {
          ...item,
          messages: [...item.messages, { id: body.assistantMessage?.id ?? crypto.randomUUID(), author: "agent" as const, text: body.text! }],
          updatedAt: new Date().toISOString(),
          messageCount: (item.messageCount ?? item.messages.length) + 1,
        } : item));
      },
      onFailure: () => {
        setFailedMessageIds((current) => {
          const next = new Set(current);
          next.add(currentMessageId);
          return next;
        });
      },
    });
  }, [performExchange]);

  /** Atualização otimista com reversão silenciosa se o servidor recusar. */
  const setFeedback = useCallback((conversationId: string, messageId: string, feedback: AgentMessageFeedback | null) => {
    let previous: AgentMessageFeedback | null = null;
    setConversations((current) => current.map((item) => {
      if (item.id !== conversationId) return item;
      return {
        ...item,
        messages: item.messages.map((entry) => {
          if (entry.id !== messageId) return entry;
          previous = entry.feedback ?? null;
          return { ...entry, feedback };
        }),
      };
    }));

    void setMessageFeedbackAction(messageId, feedback).then((result) => {
      if (result.success) return;
      setConversations((current) => current.map((item) => item.id === conversationId ? {
        ...item,
        messages: item.messages.map((entry) => entry.id === messageId ? { ...entry, feedback: previous } : entry),
      } : item));
      toast.danger("Não foi possível salvar sua avaliação");
    });
  }, []);

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
    lastCreditsCharged,
    nextCursor,
    failedMessageIds,
    conversationsForAgent,
    loadConversation,
    loadMoreConversations,
    sendMessage,
    retryMessage,
    regenerateMessage,
    editAndResend,
    setFeedback,
    deleteConversation,
  }), [
    isLoaded, conversations, typingConversationId, credits, lastCreditsCharged, nextCursor, failedMessageIds,
    conversationsForAgent, loadConversation, loadMoreConversations, sendMessage, retryMessage,
    regenerateMessage, editAndResend, setFeedback, deleteConversation,
  ]);

  return <AgentChatContext.Provider value={value}>{children}</AgentChatContext.Provider>;
}

export function useAgentChat() {
  return useContext(AgentChatContext);
}
