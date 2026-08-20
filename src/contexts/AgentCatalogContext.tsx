"use client";

import React, { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { deriveAgentCategories, ensureUniqueSlug } from "@/lib/data/agents";
import { deleteAgent as deleteAgentAction, saveAgent as saveAgentAction } from "@/app/actions/admin/content";
import type { Agent, AgentFormPayload } from "@/types/agente";

interface AgentCatalogContextData {
  /** Falso enquanto uma mutação está em voo — o admin espera; a vitrine não. */
  isLoaded: boolean;
  agents: Agent[];
  /** Categorias em uso, com 'Todos' na frente. */
  categories: string[];
  getAgentBySlug: (slug: string) => Agent | undefined;
  /** Cria ou atualiza pelo id do payload. */
  saveAgent: (payload: AgentFormPayload) => Promise<{ success: boolean; message?: string; data?: { id: string } }>;
  duplicateAgent: (id: string) => void;
  deleteAgent: (id: string) => void;
}

const AgentCatalogContext = createContext<AgentCatalogContextData>({} as AgentCatalogContextData);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (val?: string | null): val is string => Boolean(val && UUID_REGEX.test(val));

/**
 * Catálogo de agentes.
 *
 * Antes o catálogo era um diff em localStorage aplicado sobre sementes no
 * código — o que significava que um agente publicado pelo admin existia apenas
 * no navegador dele, e o servidor nunca o enxergava (nem para gerar o `<title>`
 * da página do agente). Agora a lista vem do Supabase pelo layout, e as
 * mutações são Server Actions.
 */
export function AgentCatalogProvider({
  children,
  initialAgents = [],
}: {
  children: React.ReactNode;
  initialAgents?: Agent[];
}) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [syncedFrom, setSyncedFrom] = useState<Agent[]>(initialAgents);
  const [isPending, startMutation] = useTransition();
  const router = useRouter();

  /*
   * Ajuste durante o render, não em efeito: quando o servidor manda um catálogo
   * novo (depois de `router.refresh()`), ele substitui o estado otimista sem
   * provocar um segundo render em cascata.
   */
  if (syncedFrom !== initialAgents) {
    setSyncedFrom(initialAgents);
    setAgents(initialAgents);
  }

  const categories = useMemo(() => deriveAgentCategories(agents), [agents]);

  const getAgentBySlug = useCallback(
    (slug: string) => agents.find((agent) => agent.slug === slug),
    [agents],
  );

  const saveAgent = useCallback(
    (payload: AgentFormPayload): Promise<{ success: boolean; message?: string; data?: { id: string } }> => {
      return new Promise((resolve) => {
        startMutation(async () => {
          const result = await saveAgentAction(payload);

          if (!result.success) {
            toast.danger(result.message ?? "Não foi possível salvar o agente.");
            resolve(result);
            return;
          }

          if (isUuid(payload.id)) {
            toast.success(`${payload.name} atualizado.`);
          } else {
            toast.success(
              payload.status === "Disponível"
                ? `${payload.name} publicado em /agentes.`
                : `${payload.name} criado como ${payload.status.toLocaleLowerCase("pt-BR")}.`,
            );
          }

          router.refresh();
          resolve(result);
        });
      });
    },
    [router],
  );

  const duplicateAgent = useCallback(
    (id: string) => {
      const original = agents.find((agent) => agent.id === id);
      if (!original) return;

      const rest: AgentFormPayload = {
        slug: original.slug,
        name: original.name,
        role: original.role,
        description: original.description,
        category: original.category,
        status: original.status,
        avatar: original.avatar,
        createdBy: original.createdBy,
        courseTitle: original.courseTitle,
        skills: original.skills,
        avgMinutes: original.avgMinutes,
        greeting: original.greeting,
        starters: original.starters,
        replies: original.replies,
        fallbacks: original.fallbacks,
        files: original.files,
        systemPrompt: original.systemPrompt,
        aiModel: original.aiModel,
        context: original.context,
      };

      startMutation(async () => {
        const result = await saveAgentAction({
          ...rest,
          slug: ensureUniqueSlug(
            `${original.slug}-copia`,
            agents.map((agent) => agent.slug),
          ),
          name: `${original.name} (Cópia)`,
          // A cópia entra fora do ar: roteiro clonado precisa de revisão.
          status: "Em manutenção",
          unavailableNote: "Cópia em preparação. Revise o roteiro antes de publicar.",
        });

        if (result.success) {
          toast.success("Agente duplicado em manutenção. Revise o roteiro antes de publicar.");
          router.refresh();
        } else {
          toast.danger(result.message ?? "Não foi possível duplicar o agente.");
        }
      });
    },
    [agents, router],
  );

  const deleteAgent = useCallback(
    (id: string) => {
      // Some da lista na hora; o servidor confirma em seguida.
      setAgents((current) => current.filter((agent) => agent.id !== id));

      startMutation(async () => {
        const result = await deleteAgentAction(id);
        if (!result.success) {
          toast.danger(result.message ?? "Não foi possível excluir o agente.");
        }
        router.refresh();
      });
    },
    [router],
  );

  const value = useMemo(
    () => ({
      isLoaded: !isPending,
      agents,
      categories,
      getAgentBySlug,
      saveAgent,
      duplicateAgent,
      deleteAgent,
    }),
    [isPending, agents, categories, getAgentBySlug, saveAgent, duplicateAgent, deleteAgent],
  );

  return <AgentCatalogContext.Provider value={value}>{children}</AgentCatalogContext.Provider>;
}

export function useAgentCatalog() {
  return useContext(AgentCatalogContext);
}
