"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "@heroui/react";
import {
  AGENT_CATALOG_STORAGE_KEY,
  type AgentCatalogSnapshot,
  clearAgentCatalog,
  deriveAgentCategories,
  EMPTY_AGENT_CATALOG,
  ensureUniqueSlug,
  mergeAgentCatalog,
  readAgentCatalog,
  saveAgentCatalog,
} from "@/lib/agentStorage";
import { AGENTS } from "@/lib/mocks/agenteMocks";
import type { Agent, AgentFormPayload } from "@/types/agente";

interface AgentCatalogContextData {
  /** Falso até o catálogo local ser lido. O admin espera; a vitrine não. */
  isLoaded: boolean;
  agents: Agent[];
  /** Categorias em uso, com 'Todos' na frente. */
  categories: string[];
  getAgentBySlug: (slug: string) => Agent | undefined;
  /** Há diff sobre as sementes — habilita o "restaurar catálogo original". */
  hasLocalChanges: boolean;
  /** Cria ou atualiza pelo id do payload. */
  saveAgent: (payload: AgentFormPayload) => void;
  duplicateAgent: (id: string) => void;
  deleteAgent: (id: string) => void;
  resetCatalog: () => void;
}

const AgentCatalogContext = createContext<AgentCatalogContextData>({} as AgentCatalogContextData);

/** Ids das sementes: o que não está aqui nasceu no admin. */
const SEED_IDS = new Set(AGENTS.map((agent) => agent.id));

export function AgentCatalogProvider({ children }: { children: React.ReactNode }) {
  /*
   * Começa no diff vazio — ou seja, exatamente nas sementes. O servidor produz
   * o mesmo HTML, então não há descasamento de hidratação; o localStorage só é
   * lido no efeito abaixo, nunca durante o render.
   */
  const [snapshot, setSnapshot] = useState<AgentCatalogSnapshot>(EMPTY_AGENT_CATALOG);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSnapshot(readAgentCatalog());
    setIsLoaded(true);
  }, []);

  // Só grava depois da leitura inicial: senão o diff vazio apagaria o catálogo.
  useEffect(() => {
    if (!isLoaded) return;
    if (!saveAgentCatalog(snapshot)) {
      toast.danger("Não foi possível salvar o catálogo neste navegador.");
    }
  }, [snapshot, isLoaded]);

  /*
   * Publicar numa aba precisa aparecer na outra: é o cenário real do admin
   * revisando o site com as duas abertas lado a lado.
   */
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AGENT_CATALOG_STORAGE_KEY) return;
      setSnapshot(readAgentCatalog());
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const agents = useMemo(() => mergeAgentCatalog(AGENTS, snapshot), [snapshot]);
  const categories = useMemo(() => deriveAgentCategories(agents), [agents]);

  const hasLocalChanges = snapshot.overrides.length > 0 || snapshot.deletedSeedIds.length > 0;

  const getAgentBySlug = useCallback(
    (slug: string) => agents.find((agent) => agent.slug === slug),
    [agents],
  );

  const saveAgent = useCallback((payload: AgentFormPayload) => {
    setSnapshot((current) => {
      const currentAgents = mergeAgentCatalog(AGENTS, current);

      if (payload.id) {
        const existing = currentAgents.find((agent) => agent.id === payload.id);
        // Métricas de uso sobrevivem à edição: o formulário não as escreve.
        const updated: Agent = {
          ...payload,
          id: payload.id,
          conversationsCount: existing?.conversationsCount ?? 0,
          rating: existing?.rating ?? 0,
        };

        const overrides = current.overrides.some((agent) => agent.id === payload.id)
          ? current.overrides.map((agent) => (agent.id === payload.id ? updated : agent))
          : [...current.overrides, updated];

        return { ...current, overrides };
      }

      const created: Agent = {
        ...payload,
        id: `ag-${Date.now()}`,
        conversationsCount: 0,
        rating: 0,
      };

      return { ...current, overrides: [...current.overrides, created] };
    });

    if (payload.id) {
      toast.success(`${payload.name} atualizado.`);
      return;
    }
    toast.success(
      payload.status === "Disponível"
        ? `${payload.name} publicado em /agentes/${payload.slug}.`
        : `${payload.name} criado como ${payload.status.toLocaleLowerCase("pt-BR")}.`,
    );
  }, []);

  const duplicateAgent = useCallback((id: string) => {
    setSnapshot((current) => {
      const currentAgents = mergeAgentCatalog(AGENTS, current);
      const original = currentAgents.find((agent) => agent.id === id);
      if (!original) return current;

      const duplicated: Agent = {
        ...original,
        id: `ag-${Date.now()}`,
        slug: ensureUniqueSlug(
          `${original.slug}-copia`,
          currentAgents.map((agent) => agent.slug),
        ),
        name: `${original.name} (Cópia)`,
        // A cópia entra fora do ar: roteiro clonado precisa de revisão.
        status: "Em manutenção",
        unavailableNote: "Cópia em preparação. Revise o roteiro antes de publicar.",
        conversationsCount: 0,
        rating: 0,
      };

      return { ...current, overrides: [...current.overrides, duplicated] };
    });

    toast.success("Agente duplicado em manutenção. Revise o roteiro antes de publicar.");
  }, []);

  const deleteAgent = useCallback((id: string) => {
    setSnapshot((current) => {
      // Semente não sai do código-fonte: some por tombstone. O override é
      // descartado junto para a edição não ressuscitar depois.
      const overrides = current.overrides.filter((agent) => agent.id !== id);
      if (!SEED_IDS.has(id)) return { ...current, overrides };

      return {
        overrides,
        deletedSeedIds: current.deletedSeedIds.includes(id)
          ? current.deletedSeedIds
          : [...current.deletedSeedIds, id],
      };
    });
  }, []);

  const resetCatalog = useCallback(() => {
    clearAgentCatalog();
    setSnapshot(EMPTY_AGENT_CATALOG);
    toast.success("Catálogo original restaurado.");
  }, []);

  const value = useMemo(
    () => ({
      isLoaded,
      agents,
      categories,
      getAgentBySlug,
      hasLocalChanges,
      saveAgent,
      duplicateAgent,
      deleteAgent,
      resetCatalog,
    }),
    [
      isLoaded,
      agents,
      categories,
      getAgentBySlug,
      hasLocalChanges,
      saveAgent,
      duplicateAgent,
      deleteAgent,
      resetCatalog,
    ],
  );

  return <AgentCatalogContext.Provider value={value}>{children}</AgentCatalogContext.Provider>;
}

export function useAgentCatalog() {
  return useContext(AgentCatalogContext);
}
