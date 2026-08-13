"use client";

import { useMemo, useState } from "react";
import { Bot, MessageCircle, ShieldCheck, SlidersHorizontal } from "lucide-react";
import {
  Button,
  EmptyState,
  Label,
  SearchField,
  Separator,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import AgentCard from "@/components/agentes/AgentCard";
import { Rise } from "@/components/ui/Rise";
import { useAgentChat } from "@/contexts/AgentChatContext";
import { AGENT_CATEGORIES, AGENTS } from "@/lib/mocks/agenteMocks";
import { normalizeText } from "@/lib/agentChat";

const availableCount = AGENTS.filter((agent) => agent.status !== "Em manutenção").length;

export default function AgentesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const { conversationsForAgent } = useAgentChat();

  const filteredAgents = useMemo(() => {
    const normalized = normalizeText(query.trim());
    return AGENTS.filter((agent) => {
      const matchesCategory = category === "Todos" || agent.category === category;
      const haystack = normalizeText(
        `${agent.name} ${agent.role} ${agent.description} ${agent.category} ${agent.courseTitle} ${agent.skills.join(" ")}`,
      );
      return matchesCategory && (!normalized || haystack.includes(normalized));
    });
  }, [category, query]);

  const isFiltered = query.trim().length > 0 || category !== "Todos";

  const clearFilters = () => {
    setQuery("");
    setCategory("Todos");
  };

  return (
    <div className="pt-[76px]">
      <section className="border-b border-hairline">
        <div className="editorial-container section-rhythm">
          <Rise>
            <p className="eyebrow">Agentes da escola</p>
            <h1 className="display-1 mt-3 max-w-4xl text-foreground">
              Assistentes treinados pelos professores dos seus cursos.
            </h1>
            <p className="lede mt-6">
              Cada agente foi publicado por um admin de curso com o roteiro daquele conteúdo. Traga o caso real —
              a conversa difícil, a vaga que você precisa abrir, a semana que não fecha — e resolva junto.
            </p>
          </Rise>

          <Rise delay={80}>
            <dl className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                  <Bot className="size-4.5" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-xs font-semibold text-muted">Agentes ativos</dt>
                  <dd className="font-display font-bold text-foreground" data-numeric>
                    {availableCount}
                  </dd>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-success-soft text-success-soft-foreground">
                  <MessageCircle className="size-4.5" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-xs font-semibold text-muted">Conversas por mês</dt>
                  <dd className="font-display font-bold text-foreground" data-numeric>
                    7.980
                  </dd>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-default text-default-foreground">
                  <ShieldCheck className="size-4.5" aria-hidden="true" />
                </span>
                <div>
                  <dt className="text-xs font-semibold text-muted">Privacidade</dt>
                  <dd className="font-display font-bold text-foreground">Conversas não viram avaliação</dd>
                </div>
              </div>
            </dl>
          </Rise>
        </div>
      </section>

      <section className="editorial-container py-10 sm:py-14">
        {/* Painel de filtros em acrílico: a malha do RouteShell passa por trás. */}
        <div className="material-thick mb-8 grid gap-4 rounded-2xl p-4 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
          <SearchField value={query} onChange={setQuery}>
            <Label className="sr-only">Buscar agentes</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Busque por tema, curso ou o que você precisa resolver" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar lg:pb-0">
            <SlidersHorizontal className="mr-1 size-4 shrink-0 text-muted" aria-hidden="true" />
            <ToggleButtonGroup
              aria-label="Filtrar agentes por categoria"
              selectionMode="single"
              disallowEmptySelection
              isDetached
              selectedKeys={[category]}
              onSelectionChange={(keys) => {
                const [next] = Array.from(keys);
                if (next !== undefined) setCategory(String(next));
              }}
            >
              {AGENT_CATEGORIES.map((item) => (
                <ToggleButton key={item} id={item} className="shrink-0">
                  {item}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
        </div>

        <div className="mb-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-sm text-muted" aria-live="polite" data-numeric>
            <strong className="font-bold text-foreground">{filteredAgents.length}</strong>{" "}
            {filteredAgents.length === 1 ? "agente encontrado" : "agentes encontrados"}
            {category !== "Todos" && <span className="text-muted"> · {category}</span>}
          </p>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs font-semibold text-muted sm:block">
              Publicados pelos admins dos seus cursos
            </p>
            {isFiltered && (
              <>
                <Separator orientation="vertical" className="hidden h-4 sm:block" />
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              </>
            )}
          </div>
        </div>

        {filteredAgents.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredAgents.map((agent, index) => (
              <Rise key={agent.id} className="min-w-0" delay={Math.min(index, 5) * 60}>
                <AgentCard
                  agent={agent}
                  conversationCount={conversationsForAgent(agent.id).length}
                  featured={index === 0}
                />
              </Rise>
            ))}
          </div>
        ) : (
          <EmptyState className="gap-5 py-24">
            <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
              <Bot className="size-7" aria-hidden="true" />
            </span>
            <div className="max-w-md text-center">
              <p className="display-3 text-foreground">Nenhum agente para essa busca</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                Tente outro termo ou remova o filtro. Se faltar um agente para o seu caso, peça ao admin do curso.
              </p>
            </div>
            <Button variant="secondary" onClick={clearFilters}>
              Limpar busca e filtros
            </Button>
          </EmptyState>
        )}
      </section>
    </div>
  );
}
