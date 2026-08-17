"use client";

import { useState, useEffect } from "react";
import { PanelLeft, SquarePen, Wrench } from "lucide-react";
import { Button, Drawer } from "@heroui/react";
import { AgentAvatar } from "@/components/agentes/AgentAvatar";
import { AgentConversationList } from "@/components/agentes/AgentConversationList";
import { AgentThread } from "@/components/agentes/AgentThread";
import { useAgentChat } from "@/contexts/AgentChatContext";
import { getAiCredits, decrementAiCredits } from "@/app/actions/agents";
import type { Agent } from "@/types/agente";
import { toast } from "@heroui/react";

/**
 * `auto` mostra a conversa mais recente ao chegar pela grade; `new` é o "novo
 * chat" que ainda não existe no histórico. Manter isso como seleção derivada,
 * em vez de sincronizar por efeito, evita o estado piscar entre a leitura do
 * localStorage e o primeiro render.
 */
type ThreadSelection = { mode: "auto" } | { mode: "new" } | { mode: "thread"; id: string };

export function AgentWorkspace({ agent }: { agent: Agent }) {
  const { conversationsForAgent, isLoaded, sendMessage, deleteConversation, typingConversationId } = useAgentChat();
  const [selection, setSelection] = useState<ThreadSelection>({ mode: "auto" });
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    getAiCredits().then(setCredits);
  }, []);

  const conversations = conversationsForAgent(agent.id);
  const activeConversation =
    selection.mode === "thread"
      ? conversations.find((item) => item.id === selection.id) ?? null
      : selection.mode === "new"
        ? null
        : conversations[0] ?? null;

  const isUnavailable = agent.status === "Em manutenção";

  const handleSend = async (text: string) => {
    if (credits !== null && credits <= 0) {
      toast.danger("Créditos insuficientes", { description: "Você não tem mais Créditos de IA para usar agentes." });
      return;
    }

    // Optimistic UI update
    setCredits((prev) => (prev ? prev - 1 : 0));
    const res = await decrementAiCredits();

    if (!res.success) {
      toast.danger("Erro ao usar agente", { description: "Não foi possível debitar seu crédito de IA." });
      getAiCredits().then(setCredits); // rollback
      return;
    }

    setCredits(res.creditsRemaining);
    const conversationId = sendMessage(agent, activeConversation?.id ?? null, text);
    setSelection({ mode: "thread", id: conversationId });
  };

  const handleSelect = (conversationId: string) => {
    setSelection({ mode: "thread", id: conversationId });
    setIsNavOpen(false);
  };

  const handleNewConversation = () => {
    setSelection({ mode: "new" });
    setIsNavOpen(false);
  };

  const listProps = {
    agent,
    conversations,
    activeConversationId: activeConversation?.id ?? null,
    isLoaded,
    onSelect: handleSelect,
    onNewConversation: handleNewConversation,
    onDelete: deleteConversation,
  };

  return (
    /*
     * Altura travada na viewport com o header pago em padding — margem aqui
     * colapsaria para fora do `main` e sobraria uma faixa rolável de 76px.
     */
    <div className="flex h-[100dvh] flex-col pt-[76px] lg:flex-row">
      <aside className="hidden w-72 shrink-0 overflow-hidden border-r border-hairline bg-background-secondary lg:block">
        <AgentConversationList {...listProps} />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-hairline px-4 py-3 sm:px-6">
          <Drawer.Root isOpen={isNavOpen} onOpenChange={setIsNavOpen}>
            <Drawer.Trigger
              aria-label="Abrir conversas"
              className="press grid size-10 shrink-0 place-items-center rounded-xl text-foreground transition-colors hover:bg-surface-hover lg:hidden"
            >
              <PanelLeft className="size-5" aria-hidden="true" />
            </Drawer.Trigger>

            <Drawer.Backdrop>
              <Drawer.Content placement="left" className="w-[min(88vw,320px)]">
                <Drawer.Dialog className="p-0">
                  <Drawer.Heading className="sr-only">Conversas com {agent.name}</Drawer.Heading>
                  <AgentConversationList {...listProps} />
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Backdrop>
          </Drawer.Root>

          <AgentAvatar avatar={agent.avatar} size="sm" isMuted={isUnavailable} className="lg:hidden" />

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-base font-extrabold tracking-[-0.02em] text-foreground">
              {activeConversation?.title ?? "Nova conversa"}
            </h1>
            <p className="truncate text-xs font-semibold text-muted">
              {agent.name} ·{" "}
              {agent.courseTitles && agent.courseTitles.length > 0
                ? agent.courseTitles.join(", ")
                : agent.courseTitle || "Acesso Geral"}
              {agent.planNames && agent.planNames.length > 0 && ` · ${agent.planNames.join(", ")}`}
            </p>
          </div>

          <p className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold text-muted sm:flex">
            {isUnavailable ? (
              <>
                <Wrench className="size-3 text-warning" aria-hidden="true" />
                Em manutenção
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                Disponível agora
              </>
            )}
          </p>

          <Button
            isIconOnly
            variant="ghost"
            aria-label="Nova conversa"
            onClick={handleNewConversation}
            className="shrink-0 lg:hidden"
          >
            <SquarePen className="size-4" aria-hidden="true" />
          </Button>
        </header>

        {/*
         * A thread é remontada a cada troca: rascunho e rolagem pertencem à
         * conversa aberta, não ao painel.
         */}
        <AgentThread
          key={activeConversation?.id ?? "nova"}
          agent={agent}
          conversation={activeConversation}
          isTyping={activeConversation ? typingConversationId === activeConversation.id : false}
          onSend={handleSend}
          credits={credits}
        />
      </div>
    </div>
  );
}
