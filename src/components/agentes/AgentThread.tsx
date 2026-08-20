"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BookmarkPlus, Copy, CornerDownLeft, Send, Sparkles, Wrench } from "lucide-react";
import { Alert, Button, Label, TextArea, TextField, toast } from "@heroui/react";
import { AgentAvatar } from "@/components/agentes/AgentAvatar";
import { AgentMarkdown } from "@/components/agentes/AgentMarkdown";
import { saveAgentNote } from "@/lib/agentNotes";
import type { Agent, AgentConversation } from "@/types/agente";
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

export function AgentThread({ agent, conversation, isTyping, onSend, credits, lastCreditsCharged }: AgentThreadProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const isUnavailable = agent.status === "Em manutenção";
  const messages = conversation?.messages ?? [];
  const isEmpty = messages.length === 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
  }, [conversation?.id, messages.length, isTyping, reduceMotion]);

  const send = (text: string) => {
    if (isUnavailable || !text.trim() || (credits !== null && credits <= 0)) return;
    onSend(text);
    setDraft("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envia; Shift+Enter continua sendo quebra de linha.
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    send(draft);
  };

  const handleSaveNote = (text: string) => {
    const saved = saveAgentNote(agent.id, `Conversa com ${agent.name} · ${agent.role}`, text);
    if (saved) {
      toast.success("Salvo nas suas anotações", { description: "Você encontra em Anotações." });
      return;
    }
    toast.danger("Não consegui salvar", { description: "Seu navegador bloqueou o armazenamento local." });
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
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
              <AgentAvatar avatar={agent.avatar} size="lg" isMuted={isUnavailable} />
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

              {messages.map((message) =>
                message.author === "agent" ? (
                  <AgentMessage
                    key={message.id}
                    agent={agent}
                    text={message.text}
                    onCopy={handleCopy}
                    onSaveNote={handleSaveNote}
                  />
                ) : (
                  <p
                    key={message.id}
                    className="ml-auto max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-sm bg-accent px-4 py-3 text-sm leading-6 text-accent-foreground shadow-elev-1"
                  >
                    {message.text}
                  </p>
                ),
              )}
            </>
          )}

          {isTyping && (
            <div className="flex items-end gap-3" aria-live="polite">
              <AgentAvatar avatar={agent.avatar} size="sm" className="mb-1" />
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

      <div className="border-t border-hairline bg-background/85 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex items-end gap-2">
            <TextField value={draft} onChange={setDraft} isDisabled={isUnavailable || (credits !== null && credits <= 0)} fullWidth className="flex-1">
              <Label className="sr-only">Mensagem para {agent.name}</Label>
              <TextArea
                rows={2}
                placeholder={isUnavailable ? "Agente em manutenção" : (credits !== null && credits <= 0) ? "Sem créditos de IA suficientes" : `Escreva para ${agent.name}…`}
                onKeyDown={handleKeyDown}
              />
            </TextField>
            <Button
              isIconOnly
              aria-label="Enviar mensagem"
              onClick={() => send(draft)}
              isDisabled={isUnavailable || !draft.trim() || (credits !== null && credits <= 0)}
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
              {credits !== null && (
                <span className={cn("font-semibold", credits > 0 ? "text-accent" : "text-danger")}>
                  {credits} {credits === 1 ? "crédito" : "créditos"} de IA
                </span>
              )}
              {lastCreditsCharged !== null && (
                <span>Última resposta: {lastCreditsCharged} {lastCreditsCharged === 1 ? "crédito" : "créditos"}</span>
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
};

function AgentMessage({ agent, text, onCopy, onSaveNote }: AgentMessageProps) {
  const hasActions = Boolean(onCopy || onSaveNote);

  return (
    <div className="group/message flex items-start gap-3">
      <AgentAvatar avatar={agent.avatar} size="sm" className="mt-1" />
      <div className="min-w-0 max-w-[85%]">
        {/* Bolha opaca de propósito: texto longo sobre material perde contraste. */}
        <div className="rounded-2xl rounded-tl-sm border border-hairline bg-surface px-4 py-3 text-sm text-foreground shadow-elev-1">
          <AgentMarkdown text={text} />
        </div>

        {hasActions && (
          <div
            className={cn(
              "mt-1 flex flex-wrap items-center gap-1 transition-opacity",
              "md:opacity-0 md:group-hover/message:opacity-100 md:group-focus-within/message:opacity-100",
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
          </div>
        )}
      </div>
    </div>
  );
}
