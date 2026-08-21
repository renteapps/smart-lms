"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw, Send, X } from "lucide-react";
import { Button, Label, Popover, Separator, TextArea, TextField } from "@heroui/react";
import { AgentMarkdown } from "@/components/agentes/AgentMarkdown";
import { AssistantAvatar, colorWithAlpha, getContrastText } from "@/components/platform-assistant/AssistantAvatar";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type {
  AssistantMessage,
  AssistantScope,
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
};

function scopeFromPath(pathname: string): AssistantScope {
  const match = pathname.match(/^\/courses\/([^/]+)(?:\/lessons\/([^/]+))?/);
  if (!match) return { kind: "platform" };
  return {
    kind: "course",
    courseId: decodeURIComponent(match[1]),
    lessonId: match[2] ? decodeURIComponent(match[2]) : undefined,
  };
}

function scopeKey(scope: AssistantScope): string {
  return scope.kind === "platform" ? "platform" : `course:${scope.courseId}:${scope.lessonId ?? "overview"}`;
}

function scopeQuery(scope: AssistantScope): string {
  const params = new URLSearchParams({ kind: scope.kind });
  if (scope.kind === "course") {
    params.set("courseId", scope.courseId);
    if (scope.lessonId) params.set("lessonId", scope.lessonId);
  }
  return params.toString();
}

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
  const [config, setConfig] = useState<PlatformAssistantPublicConfig | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [lastCharge, setLastCharge] = useState<{ charged: number; remaining: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentContextRef = useRef(contextKey);

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
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setConfig((current) => current ?? FALLBACK_CONFIG);
      setMessages([]);
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
    // O histórico só é necessário depois que o aluno abre o popover.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConversation(controller.signal);
    return () => controller.abort();
    // contextKey representa curso/aula e invalida somente uma conversa aberta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKey, isOpen, isAuthenticated, isAuthLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isSending, error]);

  const sendMessage = async (rawMessage = input) => {
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
    setInput("");
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
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "O assistente está indisponível.");
      setFailedMessage(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void sendMessage();
  };

  if (isAuthLoading || !isAuthenticated || !config?.enabled) return null;

  const foreground = getContrastText(config.primaryColor);
  const virtualMessages: AssistantMessage[] = messages.length
    ? messages
    : [
        {
          id: "welcome",
          author: "assistant",
          content: config.welcomeMessage,
          createdAt: "",
        },
      ];

  return (
    <div
      className="fixed right-4 z-40 flex flex-col items-end transition-[bottom] duration-[var(--duration-md)] sm:right-6"
      style={{
        bottom: article
          ? "calc(5.75rem + env(safe-area-inset-bottom))"
          : "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <Popover.Root isOpen={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger
          aria-label={isOpen ? `Fechar ${config.displayName}` : `Abrir ${config.displayName}`}
          className="press grid size-14 place-items-center overflow-hidden rounded-full shadow-elev-4 transition-transform duration-[var(--duration-md)]"
          style={{ backgroundColor: config.primaryColor, color: foreground }}
        >
          {isOpen ? (
            <X className="size-6" aria-hidden="true" />
          ) : (
            <AssistantAvatar config={config} className="size-full" iconClassName="size-6" />
          )}
        </Popover.Trigger>

        <Popover.Content
          placement="top end"
          className="h-[min(36rem,calc(100vh-8rem))] w-[min(25rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface p-0 shadow-elev-4"
        >
          <Popover.Dialog aria-label={config.displayName} className="flex h-full flex-col p-0">
            <header className="flex items-center gap-3 px-5 py-4">
              <AssistantAvatar config={config} className="size-10 rounded-xl" />
              <div className="min-w-0">
                <Popover.Heading className="truncate font-display text-base font-extrabold tracking-tight text-foreground">
                  {config.displayName}
                </Popover.Heading>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                  {scope.kind === "course" ? "Contexto deste curso" : "Assistente da plataforma"}
                </p>
              </div>
            </header>

            <Separator />

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5" aria-live="polite">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                  Carregando conversa…
                </div>
              ) : (
                virtualMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-end gap-2",
                      message.author === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    {message.author === "assistant" && (
                      <AssistantAvatar config={config} className="size-7 rounded-full" />
                    )}
                    {message.author === "assistant" ? (
                      <div className="min-w-0 max-w-[82%] rounded-2xl rounded-bl-sm border border-hairline bg-surface px-4 py-3 text-sm text-foreground shadow-elev-1">
                        <AgentMarkdown text={message.content} />
                      </div>
                    ) : (
                      <p
                        className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-6 shadow-elev-1"
                        style={{ backgroundColor: config.primaryColor, color: foreground }}
                      >
                        {message.content}
                      </p>
                    )}
                  </div>
                ))
              )}

              {isSending && (
                <div className="flex items-end gap-2">
                  <AssistantAvatar config={config} className="size-7 rounded-full" />
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-hairline bg-surface px-4 py-4 shadow-elev-1">
                    <span className="sr-only">Assistente digitando</span>
                    {[0, 0.2, 0.4].map((delay) => (
                      <motion.span
                        key={delay}
                        aria-hidden="true"
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: config.primaryColor }}
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div
                  className="rounded-xl border px-3 py-3 text-xs leading-5"
                  style={{ borderColor: colorWithAlpha(config.primaryColor, 0.25), background: colorWithAlpha(config.primaryColor, 0.08) }}
                >
                  <p className="flex items-start gap-2 text-foreground">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {error}
                  </p>
                  {failedMessage && (
                    <button
                      type="button"
                      onClick={() => void sendMessage(failedMessage)}
                      disabled={isSending}
                      className="mt-2 font-bold underline underline-offset-2 disabled:opacity-50"
                    >
                      Tentar novamente
                    </button>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <Separator />

            <footer className="px-5 py-4">
              <div className="flex items-end gap-2">
                <TextField value={input} onChange={setInput} fullWidth className="flex-1">
                  <Label className="sr-only">Mensagem para {config.displayName}</Label>
                  <TextArea
                    rows={1}
                    maxLength={4_000}
                    placeholder="Digite sua pergunta…"
                    onKeyDown={handleKeyDown}
                    disabled={isSending || isLoading}
                    className="max-h-28 min-h-11 resize-none"
                  />
                </TextField>
                <Button
                  isIconOnly
                  aria-label="Enviar mensagem"
                  onClick={() => void sendMessage()}
                  isDisabled={!input.trim() || isSending || isLoading}
                  className="size-11 shrink-0"
                  style={{ backgroundColor: config.primaryColor, color: foreground }}
                >
                  <Send className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="mt-3 text-center text-[11px] leading-4 text-muted">
                {lastCharge && (
                  <p className="mb-1 font-semibold text-foreground">
                    Última resposta: {lastCharge.charged} créditos · saldo {lastCharge.remaining}
                  </p>
                )}
                <p>A IA pode cometer erros. As conversas ficam armazenadas e podem ser revisadas pelo administrador.</p>
              </div>
            </footer>
          </Popover.Dialog>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
