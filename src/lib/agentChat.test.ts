import { describe, expect, it } from 'vitest';
import { getAgentReply, matchScriptedReply, normalizeText } from './agentChat';
import { deriveConversationTitle } from './agentChatStorage';
import { AGENTS } from './seed/agents';
import { Agent } from '@/types/agente';

const agent: Agent = {
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
  skills: [],
  conversationsCount: 0,
  rating: 5,
  avgMinutes: 1,
  greeting: 'Oi',
  starters: [],
  replies: [
    { id: 'generico', keywords: ['plano'], text: 'Resposta genérica' },
    { id: 'especifico', keywords: ['plano de desenvolvimento'], text: 'Resposta específica' },
    { id: 'atraso', keywords: ['atrasado', 'recuperar'], text: 'Resposta de atraso' },
  ],
  fallbacks: ['Primeiro fallback', 'Segundo fallback'],
};

describe('normalizeText', () => {
  it('remove acento e caixa para a comparação não depender da digitação', () => {
    expect(normalizeText('Está ATRASADO')).toBe('esta atrasado');
  });
});

describe('matchScriptedReply', () => {
  it('prefere a palavra-chave mais específica quando as duas casam', () => {
    expect(matchScriptedReply(agent, 'quero montar meu plano de desenvolvimento')?.id).toBe('especifico');
  });

  it('cai na resposta genérica quando só ela casa', () => {
    expect(matchScriptedReply(agent, 'preciso de um plano')?.id).toBe('generico');
  });

  it('soma palavras-chave repetidas da mesma resposta', () => {
    expect(matchScriptedReply(agent, 'estou atrasado, como recuperar?')?.id).toBe('atraso');
  });

  it('ignora acento escrito pelo aluno', () => {
    expect(matchScriptedReply(agent, 'estou atrasadó')?.id).toBe('atraso');
  });

  it('devolve nulo quando nada casa', () => {
    expect(matchScriptedReply(agent, 'boa tarde')).toBeNull();
  });
});

describe('getAgentReply', () => {
  it('usa o roteiro quando há correspondência', () => {
    expect(getAgentReply(agent, 'estou atrasado')).toBe('Resposta de atraso');
  });

  it('alterna os fallbacks para a conversa não repetir a mesma frase', () => {
    expect(getAgentReply(agent, 'oi', 0)).toBe('Primeiro fallback');
    expect(getAgentReply(agent, 'oi', 1)).toBe('Segundo fallback');
    expect(getAgentReply(agent, 'oi', 2)).toBe('Primeiro fallback');
  });

  it('responde mesmo sem roteiro publicado', () => {
    const semRoteiro: Agent = { ...agent, replies: [], fallbacks: [] };
    expect(getAgentReply(semRoteiro, 'oi')).toBeTruthy();
  });
});

describe('deriveConversationTitle', () => {
  it('usa a primeira mensagem inteira quando ela é curta', () => {
    expect(deriveConversationTitle('  Preciso dar um feedback  ')).toBe('Preciso dar um feedback');
  });

  it('corta na palavra inteira quando a mensagem é longa', () => {
    const title = deriveConversationTitle(
      'Preciso dar um feedback difícil para alguém do meu time e não sei por onde começar',
    );
    expect(title.length).toBeLessThanOrEqual(53);
    expect(title.endsWith('…')).toBe(true);
    expect(title).not.toContain('  ');
  });

  it('não deixa a thread sem nome', () => {
    expect(deriveConversationTitle('   ')).toBe('Nova conversa');
  });
});

describe('agentes publicados', () => {
  it('mantém id, slug e nome únicos por agente', () => {
    expect(new Set(AGENTS.map((item) => item.id)).size).toBe(AGENTS.length);
    expect(new Set(AGENTS.map((item) => item.slug)).size).toBe(AGENTS.length);
  });

  it('publica slug utilizável em /agentes/[slug]', () => {
    for (const item of AGENTS) {
      expect(item.slug, item.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('garante que todo agente disponível tem saudação, sugestões e fallback', () => {
    for (const item of AGENTS.filter((entry) => entry.status !== 'Em manutenção')) {
      expect(item.greeting.length, item.id).toBeGreaterThan(0);
      expect(item.starters.length, item.id).toBeGreaterThan(0);
      expect(item.fallbacks.length, item.id).toBeGreaterThan(0);
    }
  });

  it('responde a cada sugestão de partida com o roteiro, nunca com fallback', () => {
    for (const item of AGENTS) {
      for (const starter of item.starters) {
        expect(matchScriptedReply(item, starter.message), `${item.id}/${starter.id}`).not.toBeNull();
      }
    }
  });
});
