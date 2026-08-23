"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  BookmarkPlus,
  Copy,
  CornerDownLeft,
  Pencil,
  RotateCw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Wrench,
} from "lucide-react";
import { Alert, Button, Label, TextArea, TextField, toast } from "@heroui/react";
import { AgentAvatar } from "@/components/agentes/AgentAvatar";
import { AgentMarkdown } from "@/components/agentes/AgentMarkdown";
import { useAgentChat } from "@/contexts/AgentChatContext";
import { saveAgentNote } from "@/app/actions/notes";
import { formatAiCredits } from "@/lib/aiCredits";
import { AGENT_MESSAGE_MAX_CHARS } from "@/lib/agentChatRequest";
import type { Agent, AgentConversation, AgentMessage as AgentMessageType, AgentMessageFeedback } from "@/types/agente";
import { cn } from "@/lib/utils";

type AgentThreadProps = {
  agent: Agent;
  /** Nulo enquanto a conversa não tem a primeira mensagem. */
  conversation: AgentConversation | null;
  isTyping: boolean;
  onSend: (text: string) => void;
  credits: number | null;
  lastCreditsCharged: number | null;
};

/** Altura máxima do composer antes de rolar internamente (~7 linhas). */
const MAX_COMPOSER_HEIGHT = 168;
/** Distância do fim, em px, ainda considerada "perto o bastante" para auto-rolar. */
const NEAR_BOTTOM_THRESHOLD = 120;

export function AgentThread({ agent, conversation, isTyping, onSend, credits, lastCreditsCharged }: AgentThreadProps) {
  const { failedMessageIds, retryMessage, regenerateMessage, editAndResend, setFeedback } = useAgentChat();
  const [draft, setDraft] = useState("");
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nearBottomRef = useRef(true);
  const reduceMotion = useReducedMotion();

  const isUnavailable = agent.status === "Em manutenção";
  const messages = conversation?.messages ?? [];
  const isEmpty = messages.length === 0;
  const isOverLimit = draft.length > AGENT_MESSAGE_MAX_CHARS;
  const lastAgentMessageId = [...messages].reverse().find((item) => item.author === "agent")?.id ?? null;

  const updateNearBottom = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
    setShowJumpToBottom(!nearBottomRef.current);
  };

  const scrollToBottom = (behavior: ScrollBehavior) => {
    endRef.current?.scrollIntoView({ behavior, block: "end" });
    setShowJumpToBottom(false);
  };

  useEffect(() => {
    // Só puxa a tela pro fim se o aluno já estava lá — senão a resposta nova
    // arrancaria a rolagem de quem subiu pra reler o histórico.
    if (nearBottomRef.current) {
      scrollToBottom(reduceMotion ? "auto" : "smooth");
    } else {
      setShowJumpToBottom(true);
    }
  }, [messages.length, isTyping, reduceMotion]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  }, [draft]);

  const send = (text: string) => {
    if (isUnavailable || !text.trim() || text.length > AGENT_MESSAGE_MAX_CHARS || (credits !== null && credits <= 0)) return;
    onSend(text);
    setDraft("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envia; Shift+Enter continua sendo quebra de linha.
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    send(draft);
  };

  const handleSaveNote = async (text: string) => {
    const result = await saveAgentNote(agent.id, `Conversa com ${agent.name} · ${agent.role}`, text);
    if (result.success) {
      toast.success("Salvo nas suas anotações", { description: "Você encontra em Anotações." });
      return;
    }
    toast.danger("Não consegui salvar", { description: result.message || "Erro desconhecido." });
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Resposta copiada");
    } catch {
      toast.danger("Não consegui copiar", { description: "Seu navegador bloqueou a área de transferência." });
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scrollContainerRef} onScroll={updateNearBottom} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
          {isUnavailable && (
            <Alert status="warning">
              <Alert.Indicator>
                <Wrench className="size-4" aria-hidden="true" />
              </Alert.Indicator>
              <Alert.Title>Agente em manutenção</Alert.Title>
              <Alert.Description>{agent.unavailableNote}</Alert.Description>
            </Alert>
          )}

          {isEmpty ? (
            /* Abertura de conversa nova: identidade, saudação e os atalhos do roteiro. */
            <div className="flex flex-col items-center py-6 text-center sm:py-12">
              <AgentAvatar
                avatar={agent.avatar}
                themeColor={agent.themeColor}
                iconSvg={agent.iconSvg}
                photoUrl={agent.photoUrl}
                size="lg"
                isMuted={isUnavailable}
              />
              <h2 className="display-3 mt-5 text-foreground">
                {agent.name}, {agent.role.toLocaleLowerCase("pt-BR")}
              </h2>
              <p className="lede mt-4 text-base">{agent.greeting}</p>

              {!isUnavailable && agent.starters.length > 0 && (
                <div className="mt-9 grid w-full gap-3 text-left sm:grid-cols-2">
                  {agent.starters.map((starter) => (
                    <button
                      key={starter.id}
                      type="button"
                      onClick={() => send(starter.message)}
                      className="lift group flex h-full items-start gap-3 rounded-2xl border border-hairline bg-surface p-4 text-left shadow-elev-1 transition-colors hover:bg-surface-hover"
                    >
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-bold text-foreground">{starter.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted">{starter.message}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* A saudação é roteiro do admin: abre toda thread, sem entrar no histórico. */}
              <AgentMessage agent={agent} text={agent.greeting} />

              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {message.author === "agent" ? (
                    <AgentMessage
                      agent={agent}
                      text={message.text}
                      onCopy={handleCopy}
                      onSaveNote={handleSaveNote}
                      feedback={message.feedback ?? null}
                      onFeedback={conversation
                        ? (value) => setFeedback(conversation.id, message.id, value)
                        : undefined}
                      onRegenerate={conversation && message.id === lastAgentMessageId && !isTyping && !isUnavailable
                        ? () => regenerateMessage(agent, conversation.id)
                        : undefined}
                    />
                  ) : (
                    <StudentMessage
                      message={message}
                      isFailed={failedMessageIds.has(message.id)}
                      canEdit={Boolean(conversation) && !isTyping && !message.id.startsWith("pending-")}
                      onEdit={(id, text) => conversation && editAndResend(agent, conversation.id, id, text)}
                      onRetry={(id, text) => conversation && retryMessage(agent, conversation.id, id, text)}
                    />
                  )}
                </motion.div>
              ))}
            </>
          )}

          {isTyping && (
            <div className="flex items-end gap-3" aria-live="polite">
              <AgentAvatar
                avatar={agent.avatar}
                themeColor={agent.themeColor}
                iconSvg={agent.iconSvg}
                photoUrl={agent.photoUrl}
                size="sm"
                className="mb-1"
              />
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-hairline bg-surface px-4 py-4 shadow-elev-1">
                <span className="sr-only">{agent.name} está escrevendo</span>
                {[0, 0.2, 0.4].map((delay) => (
                  <motion.span
                    key={delay}
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-accent"
                    animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {showJumpToBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom(reduceMotion ? "auto" : "smooth")}
          className="lift absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-2 text-xs font-semibold text-foreground shadow-elev-2 transition-colors hover:bg-surface-hover"
        >
          <ArrowDown className="size-3.5" aria-hidden="true" />
          Novas mensagens
        </button>
      )}

      <div className="border-t border-hairline bg-background/85 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex items-end gap-2">
            <TextField value={draft} onChange={setDraft} isDisabled={isUnavailable || (credits !== null && credits <= 0)} fullWidth className="flex-1">
              <Label className="sr-only">Mensagem para {agent.name}</Label>
              <TextArea
                ref={textareaRef}
                rows={2}
                placeholder={isUnavailable ? "Agente em manutenção" : (credits !== null && credits <= 0) ? "Sem créditos de IA suficientes" : `Escreva para ${agent.name}…`}
                onKeyDown={handleKeyDown}
                className="resize-none"
                style={{ maxHeight: MAX_COMPOSER_HEIGHT }}
              />
            </TextField>
            <Button
              isIconOnly
              aria-label="Enviar mensagem"
              onClick={() => send(draft)}
              isDisabled={isUnavailable || !draft.trim() || isOverLimit || (credits !== null && credits <= 0)}
              className="size-11 shrink-0"
            >
              <Send className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <CornerDownLeft className="size-3" aria-hidden="true" />
              Enter envia · Shift+Enter quebra linha
            </span>
            <div className="flex items-center gap-3">
              {draft.length > AGENT_MESSAGE_MAX_CHARS * 0.8 && (
                <span className={cn("tabular-nums", isOverLimit ? "font-semibold text-danger" : "text-muted")}>
                  {draft.length.toLocaleString("pt-BR")}/{AGENT_MESSAGE_MAX_CHARS.toLocaleString("pt-BR")}
                </span>
              )}
              {credits !== null && (
                <span className={cn("font-semibold", credits > 0 ? "text-accent" : "text-danger")}>
                  {formatAiCredits(credits)} {credits === 1 ? "crédito" : "créditos"} de IA
                </span>
              )}
              {lastCreditsCharged !== null && (
                <span>Última resposta: {formatAiCredits(lastCreditsCharged)} {lastCreditsCharged === 1 ? "crédito" : "créditos"}</span>
              )}
              <span>Respostas seguem o roteiro do curso.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type AgentMessageProps = {
  agent: Agent;
  text: string;
  onCopy?: (text: string) => void;
  onSaveNote?: (text: string) => void;
  feedback?: AgentMessageFeedback | null;
  onFeedback?: (value: AgentMessageFeedback | null) => void;
  onRegenerate?: () => void;
};

function AgentMessage({ agent, text, onCopy, onSaveNote, feedback = null, onFeedback, onRegenerate }: AgentMessageProps) {
  const hasActions = Boolean(onCopy || onSaveNote || onFeedback || onRegenerate);

  return (
    <div className="group/message flex items-start gap-3">
      <AgentAvatar
        avatar={agent.avatar}
        themeColor={agent.themeColor}
        iconSvg={agent.iconSvg}
        photoUrl={agent.photoUrl}
        size="sm"
        className="mt-1"
      />
      <div className="min-w-0 max-w-[85%]">
        {/* Bolha opaca de propósito: texto longo sobre material perde contraste. */}
        <div className="rounded-2xl rounded-tl-sm border border-hairline bg-surface px-4 py-3 text-sm text-foreground shadow-elev-1">
          <AgentMarkdown text={text} />
        </div>

        {hasActions && (
          <div
            className={cn(
              "mt-1 flex flex-wrap items-center gap-1 transition-opacity",
              "pointer-fine:opacity-0 pointer-fine:group-hover/message:opacity-100 group-focus-within/message:opacity-100",
            )}
          >
            {onCopy && (
              <Button variant="ghost" size="sm" className="text-xs text-muted" onClick={() => onCopy(text)}>
                <Copy className="size-3.5" aria-hidden="true" />
                Copiar
              </Button>
            )}
            {onSaveNote && (
              <Button variant="ghost" size="sm" className="text-xs text-muted" onClick={() => onSaveNote(text)}>
                <BookmarkPlus className="size-3.5" aria-hidden="true" />
                Salvar nas anotações
              </Button>
            )}
            {onRegenerate && (
              <Button variant="ghost" size="sm" className="text-xs text-muted" onClick={onRegenerate}>
                <RotateCw className="size-3.5" aria-hidden="true" />
                Regenerar
              </Button>
            )}
            {onFeedback && (
              <>
                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  aria-label="Resposta útil"
                  aria-pressed={feedback === "up"}
                  className={cn(feedback === "up" ? "text-accent" : "text-muted")}
                  onClick={() => onFeedback(feedback === "up" ? null : "up")}
                >
                  <ThumbsUp className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  aria-label="Resposta não ajudou"
                  aria-pressed={feedback === "down"}
                  className={cn(feedback === "down" ? "text-danger" : "text-muted")}
                  onClick={() => onFeedback(feedback === "down" ? null : "down")}
                >
                  <ThumbsDown className="size-3.5" aria-hidden="true" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type StudentMessageProps = {
  message: AgentMessageType;
  isFailed: boolean;
  canEdit: boolean;
  onEdit: (messageId: string, text: string) => void;
  onRetry: (messageId: string, text: string) => void;
};

function StudentMessage({ message, isFailed, canEdit, onEdit, onRetry }: StudentMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);

  if (isEditing) {
    return (
      <div className="ml-auto flex w-full max-w-[85%] flex-col items-end gap-2">
        <TextField value={draft} onChange={setDraft} fullWidth>
          <Label className="sr-only">Editar mensagem</Label>
          <TextArea rows={3} autoFocus />
        </TextField>
        <div className="flex gap-2">
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => {
              setDraft(message.text);
              setIsEditing(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            isDisabled={!draft.trim() || draft.length > AGENT_MESSAGE_MAX_CHARS}
            onClick={() => {
              onEdit(message.id, draft);
              setIsEditing(false);
            }}
          >
            Salvar e reenviar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/message ml-auto flex max-w-[85%] flex-col items-end gap-1">
      <p className="whitespace-pre-line rounded-2xl rounded-br-sm bg-accent px-4 py-3 text-sm leading-6 text-accent-foreground shadow-elev-1">
        {message.text}
      </p>

      {isFailed ? (
        <div className="flex items-center gap-2 text-xs text-danger">
          <span>Falha ao enviar</span>
          <button
            type="button"
            onClick={() => onRetry(message.id, message.text)}
            className="font-semibold underline underline-offset-2 hover:text-danger/80"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        canEdit && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-xs text-muted opacity-0 transition-opacity hover:text-foreground pointer-fine:group-hover/message:opacity-100 group-focus-within/message:opacity-100"
          >
            <Pencil className="size-3" aria-hidden="true" />
            Editar
          </button>
        )
      )}
    </div>
  );
}
