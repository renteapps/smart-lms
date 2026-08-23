"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, ChevronsUpDown, SquarePen, Trash2 } from "lucide-react";
import { Button, Dropdown, Separator, Skeleton } from "@heroui/react";
import { AgentAvatar } from "@/components/agentes/AgentAvatar";
import { ConversationDeleteDialog } from "@/components/agentes/ConversationDeleteDialog";
import { useAgentCatalog } from "@/contexts/AgentCatalogContext";
import type { Agent, AgentConversation } from "@/types/agente";
import { cn } from "@/lib/utils";

type AgentConversationListProps = {
  agent: Agent;
  conversations: AgentConversation[];
  activeConversationId: string | null;
  isLoaded: boolean;
  onSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  onDelete: (conversationId: string) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
};

export function AgentConversationList({
  agent,
  conversations,
  activeConversationId,
  isLoaded,
  onSelect,
  onNewConversation,
  onDelete,
  hasMore = false,
  onLoadMore,
}: AgentConversationListProps) {
  const router = useRouter();
  const { agents } = useAgentCatalog();
  const otherAgents = agents.filter((item) => item.id !== agent.id && item.status !== "Em manutenção");
  const [conversationToDelete, setConversationToDelete] = useState<AgentConversation | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-4 p-4">
        <Link
          href="/agentes"
          className="flex items-center gap-2 text-xs font-bold text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Todos os agentes
        </Link>

        <div className="flex items-start gap-3">
          <AgentAvatar 
            avatar={agent.avatar}
            themeColor={agent.themeColor}
            iconSvg={agent.iconSvg}
            photoUrl={agent.photoUrl}
          />
          <div className="min-w-0">
            <p className="truncate font-display text-base font-extrabold tracking-[-0.02em] text-foreground">
              {agent.name}
            </p>
            <p className="truncate text-xs font-semibold text-muted">{agent.role}</p>
          </div>
        </div>

        <Button variant="primary" fullWidth onClick={onNewConversation}>
          <SquarePen className="size-4" aria-hidden="true" />
          Nova conversa
        </Button>
      </div>

      <Separator />

      <nav aria-label={`Conversas com ${agent.name}`} className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="eyebrow px-2 pb-2">Suas conversas</p>

        {!isLoaded ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando conversas">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-3 text-xs leading-5 text-muted">
            Nenhuma conversa ainda. Comece por uma das sugestões do {agent.name}.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              return (
                <li key={conversation.id} className="group/thread relative">
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "w-full rounded-xl py-2.5 pl-3 pr-10 text-left transition-colors",
                      isActive
                        ? "bg-accent-soft text-accent-soft-foreground"
                        : "text-foreground hover:bg-surface-hover",
                    )}
                  >
                    <span className="block truncate text-sm font-semibold">{conversation.title}</span>
                    <span className={cn("mt-0.5 block truncate text-xs", isActive ? "opacity-80" : "text-muted")}>
                      {formatDistanceToNow(new Date(conversation.updatedAt), { locale: ptBR, addSuffix: true })}
                    </span>
                  </button>

                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={`Excluir conversa ${conversation.title}`}
                    onClick={() => setConversationToDelete(conversation)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted transition-opacity hover:text-danger pointer-fine:opacity-0 pointer-fine:group-hover/thread:opacity-100 group-focus-within/thread:opacity-100"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {hasMore && onLoadMore && (
          <Button variant="ghost" size="sm" fullWidth onClick={onLoadMore} className="mt-3">
            Carregar conversas anteriores
          </Button>
        )}
      </nav>

      <Separator />

      <div className="p-3">
        {/* Troca de agente sem voltar ao catálogo — o equivalente ao seletor de modelo. */}
        <Dropdown.Root>
          <Dropdown.Trigger
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
            aria-label="Trocar de agente"
          >
            <AgentAvatar 
              avatar={agent.avatar} 
              themeColor={agent.themeColor}
              iconSvg={agent.iconSvg}
              photoUrl={agent.photoUrl}
              size="sm" 
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">Trocar de agente</span>
              <span className="block truncate text-xs text-muted">{agent.courseTitle}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
          </Dropdown.Trigger>

          <Dropdown.Popover placement="top start" className="w-72">
            <Dropdown.Menu
              aria-label="Agentes disponíveis"
              onAction={(key) => router.push(`/agentes/${String(key)}`)}
            >
              {otherAgents.map((item) => (
                <Dropdown.Item key={item.slug} id={item.slug} textValue={item.name}>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <AgentAvatar 
                      avatar={item.avatar} 
                      themeColor={item.themeColor}
                      iconSvg={item.iconSvg}
                      photoUrl={item.photoUrl}
                      size="sm" 
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{item.name}</span>
                      <span className="block truncate text-xs text-muted">{item.role}</span>
                    </span>
                  </span>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>
      </div>

      <ConversationDeleteDialog
        conversation={conversationToDelete}
        onClose={() => setConversationToDelete(null)}
        onConfirm={(id) => {
          onDelete(id);
          setConversationToDelete(null);
        }}
      />
    </div>
  );
}
