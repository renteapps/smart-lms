"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { toast } from "@heroui/react";
import { AssistantPanel } from "@/components/platform-assistant/AssistantPanel";
import { AssistantAvatar, getContrastText } from "@/components/platform-assistant/AssistantAvatar";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { assistantStarters, scopeFromPath, scopeKey, scopeQuery } from "@/lib/platformAssistantWidget";
import { reachFor } from "@/types/platformAssistant";
import type {
  AssistantMessage,
  AssistantReach,
  PlatformAssistantGetResponse,
  PlatformAssistantConfigResponse,
  PlatformAssistantPostResponse,
  PlatformAssistantPublicConfig,
} from "@/types/platformAssistant";
import { usePathname } from "next/navigation";

const FALLBACK_CONFIG: PlatformAssistantPublicConfig = {
  enabled: true,
  displayName: "Assistente IA",
  avatarType: "icon",
  iconKey: "sparkles",
  primaryColor: "#3157B7",
  welcomeMessage: "Olá! Como posso ajudar você hoje?",
  knowledgeMode: "adaptive",
};

const REACH_LABELS: Record<AssistantReach, string> = {
  course: "Contexto deste curso",
  course_first: "Este curso + plataforma",
  platform: "Toda a plataforma",
};

export default function ChatSticker() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    state: { article },
  } = useAudioPlayer();
  const scope = useMemo(() => scopeFromPath(pathname), [pathname]);
  const contextKey = scopeKey(scope);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [config, setConfig] = useState<PlatformAssistantPublicConfig | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [lastCharge, setLastCharge] = useState<{ charged: number; remaining: number } | null>(null);
  const [serverReach, setServerReach] = useState<AssistantReach | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const currentContextRef = useRef(contextKey);
  const keyboardInset = useKeyboardInset(isOpen);

  useEffect(() => {
    currentContextRef.current = contextKey;
  }, [contextKey]);

  const loadConversation = async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    setFailedMessage(null);
    try {
      const response = await fetch(`/api/ai/platform-assistant?${scopeQuery(scope)}`, {
        cache: "no-store",
        signal,
      });
      const body = (await response.json()) as PlatformAssistantGetResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível carregar o assistente.");
      setConfig(body.config);
      setMessages(body.conversation?.messages ?? []);
      setServerReach(body.reach ?? null);
      setCredits(body.credits ?? null);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setConfig((current) => current ?? FALLBACK_CONFIG);
      setMessages([]);
      setServerReach(null);
      setError(loadError instanceof Error ? loadError.message : "O assistente está indisponível.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  };

  const loadConfig = async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/ai/platform-assistant?mode=config", {
        cache: "no-store",
        signal,
      });
      const body = (await response.json()) as PlatformAssistantConfigResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível carregar o assistente.");
      setConfig(body.config);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setConfig(FALLBACK_CONFIG);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      return;
    }
    const controller = new AbortController();
    // A chamada é assíncrona; o primeiro setState só ocorre após a resposta HTTP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConfig(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (!isOpen || isAuthLoading || !isAuthenticated) return;
    const controller = new AbortController();
    // O histórico só é necessário depois que o aluno abre o painel.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConversation(controller.signal);
    return () => controller.abort();
    // contextKey representa curso/aula e invalida somente uma conversa aberta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, isOpen, isAuthenticated, isAuthLoading]);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || isSending || message.length > 4_000) return;
    const requestContext = contextKey;
    const optimistic: AssistantMessage = {
      id: `pending-${crypto.randomUUID()}`,
      author: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setError(null);
    setFailedMessage(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/platform-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, scope }),
      });
      const body = (await response.json()) as PlatformAssistantPostResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível enviar a mensagem.");
      if (requestContext !== currentContextRef.current) return;
      setMessages((current) => [
        ...current.filter((item) => item.id !== optimistic.id),
        body.userMessage,
        body.assistantMessage,
      ]);
      setLastCharge({ charged: body.creditsCharged, remaining: body.creditsRemaining });
      setCredits(body.creditsRemaining);
    } catch (sendError) {
      // A pergunta que falhou sai da lista e volta como "tentar novamente":
      // deixá-la na conversa daria a impressão de que ela foi entregue.
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
      setError(sendError instanceof Error ? sendError.message : "O assistente está indisponível.");
      setFailedMessage(message);
    } finally {
      setIsSending(false);
    }
  };

  const clearHistory = async () => {
    setIsClearing(true);
    try {
      const response = await fetch(`/api/ai/platform-assistant?${scopeQuery(scope)}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error || "Não foi possível limpar a conversa.");
      }
      setMessages([]);
      setError(null);
      setFailedMessage(null);
      setLastCharge(null);
      toast.success("Conversa limpa", { description: "O assistente começa do zero nesta tela." });
    } catch (clearError) {
      toast.danger("Não foi possível limpar", {
        description: clearError instanceof Error ? clearError.message : "Tente novamente em instantes.",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  if (isAuthLoading || !isAuthenticated || !config?.enabled) return null;

  const foreground = getContrastText(config.primaryColor);
  /*
   * O tocador de áudio ocupa a base da tela quando há um artigo tocando; o
   * gatilho sobe para não cobri-lo, e o painel se ancora nesse mesmo ponto.
   */
  const anchorBottom = article
    ? "calc(5.75rem + env(safe-area-inset-bottom))"
    : "max(1rem, env(safe-area-inset-bottom))";

  return (
    <>
      <div className="fixed right-4 z-40 flex flex-col items-end sm:right-6" style={{ bottom: anchorBottom }}>
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? `Fechar ${config.displayName}` : `Abrir ${config.displayName}`}
          onClick={() => (isOpen ? close() : setIsOpen(true))}
          className="press grid size-14 place-items-center overflow-hidden rounded-full shadow-elev-4 transition-transform duration-[var(--duration-md)]"
          style={{ backgroundColor: config.primaryColor, color: foreground }}
        >
          {isOpen ? (
            <X className="size-6" aria-hidden="true" />
          ) : (
            <AssistantAvatar config={config} className="size-full" iconClassName="size-6" />
          )}
        </button>
      </div>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <AssistantPanel
            config={config}
            reachLabel={REACH_LABELS[serverReach ?? reachFor(config.knowledgeMode, scope.kind)]}
            messages={messages}
            starters={assistantStarters(scope)}
            isLoading={isLoading}
            isSending={isSending}
            isClearing={isClearing}
            error={error}
            failedMessage={failedMessage}
            credits={credits}
            lastCharge={lastCharge}
            anchorBottom={anchorBottom}
            keyboardInset={keyboardInset}
            onClose={close}
            onSend={(text) => void sendMessage(text)}
            onClearHistory={() => void clearHistory()}
          />,
          document.body,
        )}
    </>
  );
}
