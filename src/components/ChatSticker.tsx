"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, X } from "lucide-react";
import { Button, Input, Label, Popover, Separator, TextField } from "@heroui/react";
import { SparkIcon } from "@/components/ui/AnimatedIcon";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { cn } from "@/lib/utils";

export default function ChatSticker() {
  const { state: { article } } = useAudioPlayer();
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<{role: 'ai' | 'user', text: string}[]>([
    { role: 'ai', text: 'Olá! Sou a assistente de IA da plataforma. Como posso ajudar você hoje?' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'ai', text: 'Entendi! Posso ajudar com suas dúvidas sobre nossos cursos ou com a navegação da plataforma.' }]);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    /*
     * O gatilho é o único elemento fixo; o painel é um Popover do HeroUI, que
     * já resolve posicionamento, foco, Escape e clique fora — três coisas que
     * um overlay caseiro erraria em silêncio. O estado da conversa vive aqui
     * fora, então fechar e reabrir não perde nada do que foi escrito.
     */
    <div
      className="fixed right-4 z-40 flex flex-col items-end transition-[bottom] duration-[var(--duration-md)] sm:right-6"
      style={{ bottom: article ? "calc(5.75rem + env(safe-area-inset-bottom))" : "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <Popover.Root isOpen={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger
          aria-label={isOpen ? "Fechar assistente" : "Abrir assistente de IA"}
          /*
           * Fica sólido de propósito: é a ação primária flutuante e vidro aqui
           * sumiria sobre o fundo claro. O que ele herda da linguagem é a
           * forma — cápsula, como a pílula do menu e o player.
           */
          className="press grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-elev-4 transition-[background-color,transform] duration-[var(--duration-md)] hover:bg-accent-hover"
        >
          {isOpen ? (
            <X className="size-6" aria-hidden="true" />
          ) : (
            <MessageSquare className="size-6" aria-hidden="true" />
          )}
        </Popover.Trigger>

        <Popover.Content
          placement="top end"
          className="liquid-glass h-[min(32rem,calc(100vh-9rem))] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl p-0"
        >
          <Popover.Dialog aria-label="Assistente de IA" className="flex h-full flex-col p-0">
            <header className="flex items-center gap-3 px-5 py-4">
              <span className="icon-draw grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                <SparkIcon size={20} />
              </span>
              <div className="min-w-0">
                <Popover.Heading className="font-display text-base font-extrabold tracking-tight text-foreground">
                  Assistente IA
                </Popover.Heading>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                  Online agora
                </p>
              </div>
            </header>

            <Separator />

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn("flex items-end gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  {msg.role === "ai" && (
                    <span
                      aria-hidden="true"
                      className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-soft-foreground"
                    >
                      <SparkIcon size={14} />
                    </span>
                  )}

                  {/*
                   * As bolhas são opacas de propósito: o painel é vidro e
                   * texto longo sobre material perde contraste.
                   */}
                  <p
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-elev-1",
                      msg.role === "user"
                        ? "rounded-br-sm bg-accent text-accent-foreground"
                        : "rounded-bl-sm border border-hairline bg-surface text-foreground",
                    )}
                  >
                    {msg.text}
                  </p>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-end gap-2" aria-live="polite">
                  <span
                    aria-hidden="true"
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-soft-foreground"
                  >
                    <SparkIcon size={14} />
                  </span>
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-hairline bg-surface px-4 py-4 shadow-elev-1">
                    <span className="sr-only">Assistente digitando</span>
                    {[0, 0.2, 0.4].map((delay) => (
                      <motion.span
                        key={delay}
                        aria-hidden="true"
                        className="size-1.5 rounded-full bg-accent"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <Separator />

            <footer className="px-5 py-4">
              <div className="flex items-end gap-2">
                <TextField value={input} onChange={setInput} fullWidth className="flex-1">
                  <Label className="sr-only">Mensagem para a assistente</Label>
                  <Input
                    placeholder="Mensagem para a IA..."
                    onKeyDown={handleKeyPress}
                  />
                </TextField>
                <Button
                  isIconOnly
                  aria-label="Enviar mensagem"
                  onClick={handleSend}
                  isDisabled={!input.trim()}
                  className="size-11 shrink-0"
                >
                  <Send className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <p className="mt-3 text-center text-xs text-muted">
                A IA pode cometer erros. Verifique informações importantes.
              </p>
            </footer>
          </Popover.Dialog>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
