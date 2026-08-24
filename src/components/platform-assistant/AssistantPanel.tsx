"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  Check,
  Copy,
  CornerDownLeft,
  Eraser,
  Maximize2,
  Minimize2,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { AlertDialog, Button, Label, Separator, TextArea, TextField } from "@heroui/react";
import { AgentMarkdown } from "@/components/agentes/AgentMarkdown";
import { AssistantAvatar, colorWithAlpha, getContrastText } from "@/components/platform-assistant/AssistantAvatar";
import { formatAiCredits } from "@/lib/aiCredits";
import { ASSISTANT_MAX_MESSAGE_CHARS } from "@/lib/platformAssistantContext";
import { cn } from "@/lib/utils";
import type { AssistantMessage, PlatformAssistantPublicConfig } from "@/types/platformAssistant";

/** Altura máxima do campo antes de rolar internamente (~5 linhas). */
const MAX_COMPOSER_HEIGHT = 132;
/** Distância do fim, em px, ainda considerada "perto o bastante" para auto-rolar. */
const NEAR_BOTTOM_THRESHOLD = 96;

export type AssistantPanelProps = {
  config: PlatformAssistantPublicConfig;
  reachLabel: string;
  messages: AssistantMessage[];
  starters: string[];
  isLoading: boolean;
  isSending: boolean;
  isClearing: boolean;
  error: string | null;
  /** Última mensagem que falhou, para oferecer "tentar novamente". */
  failedMessage: string | null;
  credits: number | null;
  lastCharge: { charged: number; remaining: number } | null;
  /** Distância do gatilho até a base da janela — o painel se ancora acima dele. */
  anchorBottom: string;
  /** Altura do teclado virtual: levanta a folha do celular para acima dele. */
  keyboardInset: number;
  onClose: () => void;
  onSend: (text: string) => void;
  onClearHistory: () => void;
};

export function AssistantPanel({
  config,
  reachLabel,
  messages,
  starters,
  isLoading,
  isSending,
  isClearing,
  error,
  failedMessage,
  credits,
  lastCharge,
  anchorBottom,
  keyboardInset,
  onClose,
  onSend,
  onClearHistory,
}: AssistantPanelProps) {
  const [draft, setDraft] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const nearBottomRef = useRef(true);
  const hasSettledRef = useRef(false);
  const reduceMotion = useReducedMotion();

  const foreground = getContrastText(config.primaryColor);
  const isEmpty = messages.length === 0;
  const isOverLimit = draft.length > ASSISTANT_MAX_MESSAGE_CHARS;
  const hasNoCredits = credits !== null && credits <= 0;
  const isBusy = isSending || isLoading || isClearing;

  /*
   * Rolagem só do container.
   *
   * `scrollIntoView` sobe por todos os ancestrais roláveis — como o painel vive
   * num portal no `body`, ele arrastava a *página* junto e a deixava presa no
   * rodapé a cada mensagem nova. `scrollTo` no próprio container não toca no
   * documento.
   */
  const scrollToBottom = (behavior: ScrollBehavior) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior });
    setShowJumpToBottom(false);
  };

  const updateNearBottom = () => {
    const list = listRef.current;
    if (!list) return;
    nearBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < NEAR_BOTTOM_THRESHOLD;
    setShowJumpToBottom(!nearBottomRef.current);
  };

  useEffect(() => {
    // Só puxa pro fim quem já estava lá — quem subiu pra reler continua onde está.
    if (nearBottomRef.current) {
      // A primeira ida ao fim é posicionamento, não movimento: nunca é animada.
      scrollToBottom(reduceMotion || !hasSettledRef.current ? "auto" : "smooth");
      hasSettledRef.current = true;
    } else {
      setShowJumpToBottom(true);
    }
  }, [messages.length, isSending, isLoading, reduceMotion]);

  useEffect(() => {
    const field = composerRef.current;
    if (!field) return;
    if (!draft) {
      /*
       * Campo vazio volta para a altura natural de uma linha em vez de ser
       * medido: no primeiro render, antes de o CSS assentar, `scrollHeight`
       * chega a devolver a altura de uma caixa esticada — e o campo em branco
       * nascia ocupando o máximo.
       */
      field.style.height = "";
      return;
    }
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  }, [draft]);

  useEffect(() => {
    // O teclado encurta a folha: sem isto a última mensagem ficaria escondida
    // logo depois de o aluno tocar no campo.
    if (nearBottomRef.current) scrollToBottom("auto");
  }, [keyboardInset]);

  useEffect(() => {
    // No celular o foco automático abriria o teclado por cima da conversa antes
    // de o aluno decidir escrever.
    if (!window.matchMedia("(min-width: 640px)").matches) return;
    composerRef.current?.focus();
  }, []);

  const send = (text: string) => {
    const message = text.trim();
    if (!message || isBusy || message.length > ASSISTANT_MAX_MESSAGE_CHARS || hasNoCredits) return;
    onSend(message);
    setDraft("");
    nearBottomRef.current = true;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    send(draft);
  };

  return (
    <>
      {/*
       * Painel próprio em vez de Popover/Drawer: os dois travam a rolagem da
       * página enquanto abertos (e o Popover ainda fecha sozinho ao rolar), o
       * que prendia a leitura da aula. Aqui a conversa é deliberadamente
       * não-modal no desktop — dá pra rolar e clicar a aula com ela aberta — e
       * vira folha inteira no celular. Esc e devolução de foco ficam por conta
       * do widget.
       */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] sm:hidden"
      />

      <section
        role="dialog"
        aria-label={config.displayName}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          onClose();
        }}
        style={
          {
            "--assistant-anchor": anchorBottom,
            "--assistant-keyboard": `${keyboardInset}px`,
          } as CSSProperties
        }
        className={cn(
          "fixed inset-x-0 top-0 z-50 flex flex-col overflow-hidden bg-surface shadow-elev-4",
          "bottom-[var(--assistant-keyboard)] pt-[env(safe-area-inset-top)]",
          "duration-[var(--duration-md)] animate-in fade-in slide-in-from-bottom-4",
          "sm:inset-x-auto sm:top-auto sm:right-6 sm:rounded-3xl sm:border sm:border-hairline sm:pt-0",
          "sm:bottom-[calc(var(--assistant-anchor)+4.25rem)]",
          isExpanded
            ? "sm:h-[min(44rem,calc(100dvh-10rem))] sm:w-[min(32rem,calc(100vw-3rem))]"
            : "sm:h-[min(36rem,calc(100dvh-10rem))] sm:w-[min(25rem,calc(100vw-3rem))]",
        )}
      >
        <header className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <AssistantAvatar config={config} className="size-10 rounded-xl" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-base font-extrabold tracking-tight text-foreground">
              {config.displayName}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              <span className="truncate">{reachLabel}</span>
            </p>
          </div>

          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            aria-label="Limpar histórico desta conversa"
            onClick={() => setIsConfirmingClear(true)}
            isDisabled={isEmpty || isBusy}
            className="text-muted"
          >
            <Eraser className="size-4" aria-hidden="true" />
          </Button>
          <Button
            isIconOnly
            variant="ghost"
            size="sm"
            aria-label={isExpanded ? "Reduzir o assistente" : "Ampliar o assistente"}
            onClick={() => setIsExpanded((current) => !current)}
            className="hidden text-muted sm:inline-flex"
          >
            {isExpanded ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
          </Button>
          <Button isIconOnly variant="ghost" size="sm" aria-label="Fechar assistente" onClick={onClose} className="text-muted">
            <X className="size-4" aria-hidden="true" />
          </Button>
        </header>

        <Separator />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={listRef}
            onScroll={updateNearBottom}
            aria-live="polite"
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                Carregando conversa…
              </div>
            ) : isEmpty ? (
              <div className="flex flex-1 flex-col justify-end gap-4">
                <AssistantBubble config={config}>
                  <AgentMarkdown text={config.welcomeMessage} />
                </AssistantBubble>
                {starters.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {starters.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => send(starter)}
                        disabled={isBusy || hasNoCredits}
                        className="group flex items-center gap-2 self-end rounded-2xl border border-hairline bg-surface px-3.5 py-2.5 text-left text-xs font-semibold text-foreground shadow-elev-1 transition-colors hover:bg-surface-hover disabled:opacity-50"
                      >
                        <Sparkles className="size-3.5 shrink-0" style={{ color: config.primaryColor }} aria-hidden="true" />
                        {starter}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((message) =>
                message.author === "assistant" ? (
                  <AssistantBubble key={message.id} config={config} copyText={message.content}>
                    <AgentMarkdown text={message.content} />
                  </AssistantBubble>
                ) : (
                  <p
                    key={message.id}
                    className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-6 shadow-elev-1"
                    style={{ backgroundColor: config.primaryColor, color: foreground }}
                  >
                    {message.content}
                  </p>
                ),
              )
            )}

            {isSending && (
              <div className="flex items-end gap-2">
                <AssistantAvatar config={config} className="size-7 rounded-full" />
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-hairline bg-surface px-4 py-4 shadow-elev-1">
                  <span className="sr-only">{config.displayName} está escrevendo</span>
                  {[0, 0.2, 0.4].map((delay) => (
                    <motion.span
                      key={delay}
                      aria-hidden="true"
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: config.primaryColor }}
                      animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border px-3 py-3 text-xs leading-5"
                style={{
                  borderColor: colorWithAlpha(config.primaryColor, 0.25),
                  background: colorWithAlpha(config.primaryColor, 0.08),
                }}
              >
                <p className="flex items-start gap-2 text-foreground">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {error}
                </p>
                {failedMessage && (
                  <button
                    type="button"
                    onClick={() => onSend(failedMessage)}
                    disabled={isBusy}
                    className="mt-2 font-bold underline underline-offset-2 disabled:opacity-50"
                  >
                    Tentar novamente
                  </button>
                )}
              </div>
            )}
          </div>

          {showJumpToBottom && (
            <button
              type="button"
              onClick={() => scrollToBottom(reduceMotion ? "auto" : "smooth")}
              className="absolute inset-x-0 bottom-3 mx-auto flex w-fit items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-2 text-xs font-semibold text-foreground shadow-elev-2 transition-colors hover:bg-surface-hover"
            >
              <ArrowDown className="size-3.5" aria-hidden="true" />
              Ir para o fim
            </button>
          )}
        </div>

        <Separator />

        <footer className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-4">
          <div className="flex items-end gap-2">
            <TextField
              value={draft}
              onChange={setDraft}
              isDisabled={hasNoCredits || isLoading || isClearing}
              fullWidth
              className="flex-1"
            >
              <Label className="sr-only">Mensagem para {config.displayName}</Label>
              <TextArea
                ref={composerRef}
                rows={1}
                placeholder={hasNoCredits ? "Sem créditos de IA disponíveis" : "Digite sua pergunta…"}
                onKeyDown={handleKeyDown}
                className="resize-none"
                style={{ maxHeight: MAX_COMPOSER_HEIGHT }}
              />
            </TextField>
            <Button
              isIconOnly
              aria-label="Enviar mensagem"
              onClick={() => send(draft)}
              isDisabled={!draft.trim() || isOverLimit || isBusy || hasNoCredits}
              className="size-11 shrink-0"
              style={{ backgroundColor: config.primaryColor, color: foreground }}
            >
              <Send className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] leading-4 text-muted">
            <span className="hidden items-center gap-1.5 sm:flex">
              <CornerDownLeft className="size-3" aria-hidden="true" />
              Enter envia · Shift+Enter quebra linha
            </span>
            <span className="flex items-center gap-3">
              {draft.length > ASSISTANT_MAX_MESSAGE_CHARS * 0.8 && (
                <span className={cn("tabular-nums", isOverLimit && "font-semibold text-danger")}>
                  {draft.length.toLocaleString("pt-BR")}/{ASSISTANT_MAX_MESSAGE_CHARS.toLocaleString("pt-BR")}
                </span>
              )}
              {credits !== null && (
                <span className={cn("font-semibold", credits > 0 ? "text-foreground" : "text-danger")}>
                  {formatAiCredits(credits)} {credits === 1 ? "crédito" : "créditos"} de IA
                </span>
              )}
              {lastCharge && <span>Última: {formatAiCredits(lastCharge.charged)}</span>}
            </span>
          </div>
          <p className="mt-1.5 text-center text-[11px] leading-4 text-muted">
            A IA pode cometer erros. As conversas ficam armazenadas e podem ser revisadas pelo administrador.
          </p>
        </footer>
      </section>

      <AlertDialog.Root isOpen={isConfirmingClear} onOpenChange={setIsConfirmingClear}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container size="md">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </AlertDialog.Icon>
                <AlertDialog.Heading>Limpar esta conversa?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  As mensagens somem do seu chat e deixam de servir de contexto para as próximas respostas. O registro
                  continua disponível para o administrador da plataforma, como já acontece hoje.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="tertiary" onClick={() => setIsConfirmingClear(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  isDisabled={isClearing}
                  onClick={() => {
                    setIsConfirmingClear(false);
                    onClearHistory();
                  }}
                >
                  <Eraser className="size-4" aria-hidden="true" />
                  Limpar conversa
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog.Root>
    </>
  );
}

function AssistantBubble({
  config,
  copyText,
  children,
}: {
  config: PlatformAssistantPublicConfig;
  copyText?: string;
  children: React.ReactNode;
}) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const timer = window.setTimeout(() => setIsCopied(false), 2_000);
    return () => window.clearTimeout(timer);
  }, [isCopied]);

  const copy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <div className="group/bubble flex items-start gap-2">
      <AssistantAvatar config={config} className="mt-1 size-7 rounded-full" />
      <div className="min-w-0 max-w-[85%]">
        <div className="rounded-2xl rounded-tl-sm border border-hairline bg-surface px-4 py-3 text-sm text-foreground shadow-elev-1">
          {children}
        </div>
        {copyText && (
          <button
            type="button"
            onClick={() => void copy()}
            className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted transition-opacity hover:text-foreground pointer-fine:opacity-0 pointer-fine:group-hover/bubble:opacity-100 group-focus-within/bubble:opacity-100"
          >
            {isCopied ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
            {isCopied ? "Copiado" : "Copiar"}
          </button>
        )}
      </div>
    </div>
  );
}
