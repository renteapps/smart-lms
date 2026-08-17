import { describe, expect, it } from 'vitest';
import { collectScriptWarnings } from './agentDraft';
import { AGENTS } from './seed/agents';
import { Agent } from '@/types/agente';

const base: Agent = {
  id: 'ag-teste',
  slug: 'teste',
  name: 'Teste',
  role: 'Agente de teste',
  description: '',
  category: 'Estudo',
  status: 'Disponível',
  avatar: 'tutor',
  createdBy: 'Admin',
  courseTitle: 'Curso',
  skills: ['Habilidade'],
  conversationsCount: 0,
  rating: 0,
  avgMinutes: 5,
  greeting: 'Oi',
  starters: [{ id: 'st-1', label: 'Atraso', message: 'estou atrasado com tudo' }],
  replies: [{ id: 'rp-atraso', keywords: ['atrasado'], text: 'Vamos reorganizar.' }],
  fallbacks: ['Me conta melhor?'],
};

describe('collectScriptWarnings', () => {
  it('não reclama de um roteiro completo e coerente', () => {
    expect(collectScriptWarnings(base)).toEqual([]);
  });

  it('avisa quando a sugestão de partida cai em fallback', () => {
    const agent: Agent = {
      ...base,
      starters: [{ id: 'st-solto', label: 'Solto', message: 'boa tarde, tudo bem?' }],
    };

    const ids = collectScriptWarnings(agent).map((warning) => warning.id);
    expect(ids).toContain('starter-st-solto');
  });

  it('ignora sugestão ainda em branco em vez de acusar quem está digitando', () => {
    const agent: Agent = {
      ...base,
      starters: [...base.starters, { id: 'st-vazio', label: '', message: '   ' }],
    };

    const ids = collectScriptWarnings(agent).map((warning) => warning.id);
    expect(ids).not.toContain('starter-st-vazio');
  });

  it('avisa quando não há resposta roteirizada nem fallback', () => {
    const agent: Agent = { ...base, starters: [], replies: [], fallbacks: [] };
    const ids = collectScriptWarnings(agent).map((warning) => warning.id);

    expect(ids).toContain('sem-respostas');
    expect(ids).toContain('sem-fallback');
  });

  it('avisa quando o card público ficaria sem habilidades', () => {
    const ids = collectScriptWarnings({ ...base, skills: [] }).map((warning) => warning.id);
    expect(ids).toContain('sem-habilidades');
  });

  it('detecta palavra-chave repetida entre duas respostas, ignorando acento e caixa', () => {
    const agent: Agent = {
      ...base,
      starters: [],
      replies: [
        { id: 'rp-a', keywords: ['Atrasado'], text: 'Primeira' },
        { id: 'rp-b', keywords: ['atrasadó'], text: 'Segunda' },
      ],
    };

    const warnings = collectScriptWarnings(agent);
    expect(warnings.some((warning) => warning.id.startsWith('keyword-'))).toBe(true);
    // Quem é acusada é a segunda: a primeira é a que vence o empate.
    expect(warnings.some((warning) => warning.id.endsWith('rp-b'))).toBe(true);
  });

  it('não acusa colisão de uma resposta com ela mesma', () => {
    const agent: Agent = {
      ...base,
      starters: [],
      replies: [{ id: 'rp-a', keywords: ['atrasado', 'atrasado'], text: 'Única' }],
    };

    expect(collectScriptWarnings(agent).some((warning) => warning.id.startsWith('keyword-'))).toBe(
      false,
    );
  });

  it('aprova os agentes já publicados no catálogo semente', () => {
    // Espelha a invariante de `agentChat.test.ts`: nenhum starter das sementes
    // pode cair em fallback. Se um dia cair, os dois testes falham juntos.
    for (const agent of AGENTS) {
      const starterWarnings = collectScriptWarnings(agent).filter((warning) =>
        warning.id.startsWith('starter-'),
      );
      expect(starterWarnings, agent.id).toEqual([]);
    }
  });
});
