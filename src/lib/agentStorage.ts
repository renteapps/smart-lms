import { Agent } from '@/types/agente';

export const AGENT_CATALOG_STORAGE_KEY = '@smartlms:agents:v1';

/**
 * O que o admin mexeu — não o catálogo inteiro.
 *
 * As sementes continuam vivendo em `agenteMocks.ts`: guardar só o diff mantém o
 * mock como linha de base canônica (é o que `agentChat.test.ts` afirma), deixa
 * edições no código-fonte chegarem a quem já tem storage, e torna a exclusão de
 * uma semente expressável sem mutar um array congelado.
 */
export interface AgentCatalogSnapshot {
  /** Agentes criados no admin E versões editadas de sementes — ambos pelo id. */
  overrides: Agent[];
  /** Sementes excluídas. O mock não sai do código; some por tombstone. */
  deletedSeedIds: string[];
}

export const EMPTY_AGENT_CATALOG: AgentCatalogSnapshot = { overrides: [], deletedSeedIds: [] };

/** Segmento de URL a partir do nome: sem acento, sem símbolo, hifenizado. */
export function slugifyAgentName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Slug livre a partir de uma base: feedback → feedback-2 → feedback-3. */
export function ensureUniqueSlug(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base;
  let suffix = 2;
  while (taken.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Categorias em uso, para o filtro da vitrine. 'Todos' sempre primeiro. */
export function deriveAgentCategories(agents: Agent[]): string[] {
  return ['Todos', ...Array.from(new Set(agents.map((agent) => agent.category)))];
}

/**
 * Catálogo efetivo: sementes com o diff do admin aplicado por cima.
 *
 * Um agente editado sai **na posição da semente** — editar não pode reembaralhar
 * a grade pública. Criações do admin entram no fim, na ordem em que nasceram.
 */
export function mergeAgentCatalog(seeds: Agent[], snapshot: AgentCatalogSnapshot): Agent[] {
  const deleted = new Set(snapshot.deletedSeedIds);
  const overrideById = new Map(snapshot.overrides.map((agent) => [agent.id, agent]));
  const seedIds = new Set(seeds.map((agent) => agent.id));

  const merged = seeds
    .filter((agent) => !deleted.has(agent.id))
    .map((agent) => overrideById.get(agent.id) ?? agent);

  // Criados no admin: tudo que não corresponde a uma semente. O tombstone vence
  // o override, então um id excluído não volta por aqui.
  const created = snapshot.overrides.filter(
    (agent) => !seedIds.has(agent.id) && !deleted.has(agent.id),
  );

  return [...merged, ...created];
}

function isAgent(value: unknown): value is Agent {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Partial<Agent>;
  return (
    typeof item.id === 'string' &&
    typeof item.slug === 'string' &&
    typeof item.name === 'string' &&
    Array.isArray(item.starters) &&
    Array.isArray(item.replies) &&
    Array.isArray(item.fallbacks)
  );
}

export function readAgentCatalog(): AgentCatalogSnapshot {
  if (typeof window === 'undefined') return EMPTY_AGENT_CATALOG;

  try {
    const raw = window.localStorage.getItem(AGENT_CATALOG_STORAGE_KEY);
    if (!raw) return EMPTY_AGENT_CATALOG;

    const parsed = JSON.parse(raw) as Partial<AgentCatalogSnapshot>;
    return {
      overrides: Array.isArray(parsed?.overrides) ? parsed.overrides.filter(isAgent) : [],
      deletedSeedIds: Array.isArray(parsed?.deletedSeedIds)
        ? parsed.deletedSeedIds.filter((id): id is string => typeof id === 'string')
        : [],
    };
  } catch {
    // Catálogo corrompido cai para as sementes: o aluno continua com agentes.
    return EMPTY_AGENT_CATALOG;
  }
}

/**
 * Grava e diz se conseguiu.
 *
 * Diferente de `saveAgentConversations`, que engole a falha em silêncio: um
 * admin que acha que publicou e não publicou é pior que um recado perdido.
 */
export function saveAgentCatalog(snapshot: AgentCatalogSnapshot): boolean {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(
      AGENT_CATALOG_STORAGE_KEY,
      JSON.stringify({ formatVersion: 1, ...snapshot }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Volta ao catálogo original apagando o diff inteiro. */
export function clearAgentCatalog(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(AGENT_CATALOG_STORAGE_KEY);
  } catch {
    // Sem storage não há o que limpar.
  }
}
