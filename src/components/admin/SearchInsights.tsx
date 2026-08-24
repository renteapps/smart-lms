import { Card, EmptyState } from "@heroui/react";
import { MousePointerClick, SearchX, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

/**
 * O que os alunos procuram na `/busca` — as duas perguntas que a tabela
 * `search_events` existe para responder.
 *
 * Servidor puro, e as duas views são `security_invoker`: a RLS de
 * `search_events` só libera leitura para admin, então esta seção fica vazia
 * para qualquer outra pessoa mesmo que a rota vaze.
 */

interface Gap {
  termo: string;
  exemplo: string | null;
  buscas: number;
  pessoas: number;
}

interface Miss {
  termo: string;
  exemplo: string | null;
  buscas: number;
  cliques: number;
  taxa_de_clique: number | null;
}

export async function SearchInsights() {
  const supabase = await createClient();

  const [gapsResult, missesResult] = await Promise.all([
    supabase
      .from("v_search_gaps")
      .select("termo, exemplo, buscas, pessoas")
      .order("buscas", { ascending: false })
      .limit(10),
    supabase
      .from("v_search_misses")
      .select("termo, exemplo, buscas, cliques, taxa_de_clique")
      .order("taxa_de_clique", { ascending: true })
      .limit(10),
  ]);

  const gaps = (gapsResult.data ?? []) as Gap[];
  const misses = ((missesResult.data ?? []) as Miss[]).filter(
    (row) => (row.taxa_de_clique ?? 0) < 0.3,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center gap-2">
            <SearchX className="size-4 text-warning" aria-hidden="true" />
            Buscas sem resultado
          </Card.Title>
          <Card.Description>
            O que os alunos procuram e a plataforma não tem. Ordenado por demanda.
          </Card.Description>
        </Card.Header>

        {gaps.length === 0 ? (
          <Card.Content>
            <EmptyState className="px-4 py-8 text-center text-sm text-muted">
              Nenhuma busca sem resultado registrada até agora.
            </EmptyState>
          </Card.Content>
        ) : (
          <ul className="divide-y divide-separator">
            {gaps.map((gap) => (
              <li key={gap.termo} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {gap.exemplo || gap.termo}
                  </span>
                  <span className="block text-xs text-muted">
                    {gap.pessoas} {gap.pessoas === 1 ? "pessoa" : "pessoas"}
                  </span>
                </span>
                <span
                  className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-bold text-warning-soft-foreground"
                  data-numeric
                >
                  {gap.buscas}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <Card.Header>
          <Card.Title className="flex items-center gap-2">
            <MousePointerClick className="size-4 text-accent" aria-hidden="true" />
            Resultado que ninguém abre
          </Card.Title>
          <Card.Description>
            Tem conteúdo, mas quase ninguém clica — sinal de ranking ou de título, não de catálogo.
          </Card.Description>
        </Card.Header>

        {misses.length === 0 ? (
          <Card.Content>
            <EmptyState className="px-4 py-8 text-center text-sm text-muted">
              Nada preocupante: os termos buscados estão levando a cliques.
            </EmptyState>
          </Card.Content>
        ) : (
          <ul className="divide-y divide-separator">
            {misses.map((miss) => (
              <li key={miss.termo} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {miss.exemplo || miss.termo}
                  </span>
                  <span className="block text-xs text-muted" data-numeric>
                    {miss.buscas} buscas · {miss.cliques} cliques
                  </span>
                </span>
                <span
                  className="flex shrink-0 items-center gap-1 text-xs font-bold text-muted"
                  data-numeric
                >
                  <TrendingUp className="size-3" aria-hidden="true" />
                  {Math.round((miss.taxa_de_clique ?? 0) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
