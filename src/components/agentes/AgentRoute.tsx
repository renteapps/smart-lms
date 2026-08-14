"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { buttonVariants, EmptyState, Skeleton } from "@heroui/react";
import { AgentWorkspace } from "@/components/agentes/AgentWorkspace";
import { useAgentCatalog } from "@/contexts/AgentCatalogContext";

/**
 * Resolve o agente pelo catálogo do navegador.
 *
 * O slug vem do servidor, mas quem sabe se o agente existe é o cliente — um
 * agente publicado no admin não está no bundle. Daí os três estados.
 */
export function AgentRoute({ slug }: { slug: string }) {
  const { getAgentBySlug, isLoaded } = useAgentCatalog();
  const agent = getAgentBySlug(slug);

  /*
   * A ordem importa: enquanto o catálogo não foi lido, um slug criado no admin
   * ainda não existe — dizer "não encontrado" aqui seria mentira por um frame.
   */
  if (!agent && !isLoaded) return <AgentWorkspaceSkeleton />;
  if (!agent) return <AgentNotFound />;

  return <AgentWorkspace agent={agent} />;
}

/** Mesma moldura do workspace, para a troca não empurrar o layout. */
function AgentWorkspaceSkeleton() {
  return (
    <div className="flex h-[100dvh] flex-col pt-[76px] lg:flex-row" aria-busy="true">
      <aside className="hidden w-72 shrink-0 overflow-hidden border-r border-hairline bg-background-secondary lg:block">
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-hairline px-4 py-3 sm:px-6">
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center">
          <span className="sr-only">Carregando agente…</span>
        </div>
      </div>
    </div>
  );
}

function AgentNotFound() {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center pt-[76px]">
      <EmptyState className="gap-5 px-6">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
          <Bot className="size-7" aria-hidden="true" />
        </span>
        <div className="max-w-md text-center">
          <p className="display-3 text-foreground">Este agente não está mais aqui</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Ele pode ter sido removido ou renomeado pelo admin do curso. O histórico das suas
            conversas continua salvo.
          </p>
        </div>
        {/* Link com aparência de botão: `<button>` dentro de `<a>` não é HTML válido. */}
        <Link href="/agentes" className={buttonVariants({ variant: "secondary" })}>
          Ver todos os agentes
        </Link>
      </EmptyState>
    </div>
  );
}
