import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AGENT_CATALOG_STORAGE_KEY,
  deriveAgentCategories,
  ensureUniqueSlug,
  mergeAgentCatalog,
  readAgentCatalog,
  slugifyAgentName,
} from './agentStorage';
import { Agent } from '@/types/agente';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  get length() { return this.values.size; }
}

function makeAgent(overrides: Partial<Agent> & Pick<Agent, 'id' | 'slug'>): Agent {
  return {
    name: 'Agente',
    role: 'Função',
    description: '',
    category: 'Estudo',
    status: 'Disponível',
    avatar: 'tutor',
    createdBy: 'Admin',
    courseTitle: 'Curso',
    skills: [],
    conversationsCount: 0,
    rating: 0,
    avgMinutes: 5,
    greeting: 'Oi',
    starters: [],
    replies: [],
    fallbacks: [],
    ...overrides,
  };
}

const seeds = [
  makeAgent({ id: 'ag-1', slug: 'um', name: 'Um', category: 'Comunicação' }),
  makeAgent({ id: 'ag-2', slug: 'dois', name: 'Dois', category: 'Liderança' }),
  makeAgent({ id: 'ag-3', slug: 'tres', name: 'Três', category: 'Comunicação' }),
];

describe('slugifyAgentName', () => {
  it('remove acento e hifeniza o nome', () => {
    expect(slugifyAgentName('Comunicação Difícil')).toBe('comunicacao-dificil');
  });

  it('colapsa símbolos e repetições num hífen só', () => {
    expect(slugifyAgentName('Feedback  ///  que transforma!')).toBe('feedback-que-transforma');
  });

  it('não deixa hífen sobrando nas bordas', () => {
    expect(slugifyAgentName('  ...Bea...  ')).toBe('bea');
  });

  it('nunca produz slug que a rota pública rejeitaria', () => {
    const nomes = [
      'Bea',
      'Comunicação Difícil',
      'Reuniões 1:1',
      'Análise & Estratégia',
      'ÀÉÎÕÜ',
      'agente---2',
      '  espaços  ',
    ];

    for (const nome of nomes) {
      const slug = slugifyAgentName(nome);
      // Mesma regex que `agentChat.test.ts` exige dos agentes publicados.
      expect(slug, nome).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('devolve vazio quando não sobra nada utilizável', () => {
    expect(slugifyAgentName('🙂 !!! ---')).toBe('');
  });
});

describe('ensureUniqueSlug', () => {
  it('devolve a base quando ela está livre', () => {
    expect(ensureUniqueSlug('feedback', ['outro'])).toBe('feedback');
  });

  it('numera a partir de 2 quando a base está tomada', () => {
    expect(ensureUniqueSlug('feedback', ['feedback'])).toBe('feedback-2');
  });

  it('pula os sufixos já usados', () => {
    expect(ensureUniqueSlug('feedback', ['feedback', 'feedback-2'])).toBe('feedback-3');
  });
});

describe('mergeAgentCatalog', () => {
  it('devolve as sementes intactas quando não houve edição', () => {
    const result = mergeAgentCatalog(seeds, { overrides: [], deletedSeedIds: [] });
    expect(result).toEqual(seeds);
  });

  it('aplica a edição na posição da semente, sem reembaralhar a grade', () => {
    const editado = makeAgent({ id: 'ag-2', slug: 'dois', name: 'Dois editado' });
    const result = mergeAgentCatalog(seeds, { overrides: [editado], deletedSeedIds: [] });

    expect(result).toHaveLength(3);
    expect(result[1].name).toBe('Dois editado');
    expect(result.map((agent) => agent.id)).toEqual(['ag-1', 'ag-2', 'ag-3']);
  });

  it('anexa os agentes criados no admin depois das sementes', () => {
    const criado = makeAgent({ id: 'ag-novo', slug: 'novo', name: 'Novo' });
    const result = mergeAgentCatalog(seeds, { overrides: [criado], deletedSeedIds: [] });

    expect(result).toHaveLength(4);
    expect(result[3].id).toBe('ag-novo');
  });

  it('remove a semente excluída', () => {
    const result = mergeAgentCatalog(seeds, { overrides: [], deletedSeedIds: ['ag-2'] });
    expect(result.map((agent) => agent.id)).toEqual(['ag-1', 'ag-3']);
  });

  it('faz o tombstone vencer o override do mesmo id', () => {
    const editado = makeAgent({ id: 'ag-2', slug: 'dois', name: 'Dois editado' });
    const result = mergeAgentCatalog(seeds, { overrides: [editado], deletedSeedIds: ['ag-2'] });

    expect(result.map((agent) => agent.id)).toEqual(['ag-1', 'ag-3']);
  });

  it('não duplica id nem slug ao misturar edição e criação', () => {
    const editado = makeAgent({ id: 'ag-1', slug: 'um', name: 'Um editado' });
    const criado = makeAgent({ id: 'ag-novo', slug: 'novo' });
    const result = mergeAgentCatalog(seeds, { overrides: [editado, criado], deletedSeedIds: [] });

    expect(new Set(result.map((agent) => agent.id)).size).toBe(result.length);
    expect(new Set(result.map((agent) => agent.slug)).size).toBe(result.length);
  });
});

describe('deriveAgentCategories', () => {
  it('põe Todos primeiro e não repete categoria', () => {
    expect(deriveAgentCategories(seeds)).toEqual(['Todos', 'Comunicação', 'Liderança']);
  });
});

describe('readAgentCatalog', () => {
  let localStorage: MemoryStorage;

  beforeEach(() => {
    localStorage = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage } });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('devolve catálogo vazio quando nunca houve edição', () => {
    expect(readAgentCatalog()).toEqual({ overrides: [], deletedSeedIds: [] });
  });

  it('não lança nem apaga o valor original quando o JSON está corrompido', () => {
    localStorage.setItem(AGENT_CATALOG_STORAGE_KEY, '{not-json');

    expect(readAgentCatalog()).toEqual({ overrides: [], deletedSeedIds: [] });
    expect(localStorage.getItem(AGENT_CATALOG_STORAGE_KEY)).toBe('{not-json');
  });

  it('descarta registros que não são agentes e mantém os válidos', () => {
    const valido = makeAgent({ id: 'ag-ok', slug: 'ok' });
    localStorage.setItem(
      AGENT_CATALOG_STORAGE_KEY,
      JSON.stringify({ overrides: [valido, { foo: 1 }], deletedSeedIds: ['ag-2', 42] }),
    );

    const snapshot = readAgentCatalog();
    expect(snapshot.overrides).toHaveLength(1);
    expect(snapshot.overrides[0].id).toBe('ag-ok');
    expect(snapshot.deletedSeedIds).toEqual(['ag-2']);
  });

  it('ignora um envelope com overrides que não é lista', () => {
    localStorage.setItem(AGENT_CATALOG_STORAGE_KEY, JSON.stringify({ overrides: 'nada' }));
    expect(readAgentCatalog()).toEqual({ overrides: [], deletedSeedIds: [] });
  });

  it('preserva vínculos de múltiplos cursos e planos ao salvar e ler', () => {
    const agenteComVinculos = makeAgent({
      id: 'ag-vinculos',
      slug: 'vinculos',
      name: 'Agente Vinculado',
      courseIds: ['c1', 'c2'],
      courseTitles: ['Curso 1', 'Curso 2'],
      planIds: ['2', '3'],
      planNames: ['Plano Pro', 'Plano Vitalício'],
    });

    localStorage.setItem(
      AGENT_CATALOG_STORAGE_KEY,
      JSON.stringify({ overrides: [agenteComVinculos], deletedSeedIds: [] }),
    );

    const snapshot = readAgentCatalog();
    expect(snapshot.overrides).toHaveLength(1);
    expect(snapshot.overrides[0].courseIds).toEqual(['c1', 'c2']);
    expect(snapshot.overrides[0].planIds).toEqual(['2', '3']);
    expect(snapshot.overrides[0].courseTitles).toEqual(['Curso 1', 'Curso 2']);
    expect(snapshot.overrides[0].planNames).toEqual(['Plano Pro', 'Plano Vitalício']);
  });
});
