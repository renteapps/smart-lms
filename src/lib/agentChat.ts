import { Agent, AgentScriptedReply } from '@/types/agente';

/**
 * Normaliza para comparação: sem acento e em minúsculas. O aluno escreve
 * "atrasado" ou "atrasadó", "1:1" ou "um a um" — a resposta roteirizada não
 * pode depender de o acento ter sido digitado.
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

/**
 * Escolhe a resposta roteirizada mais específica para a mensagem.
 *
 * Cada palavra-chave encontrada pontua pelo número de palavras que tem, então
 * "plano de desenvolvimento" ganha de "plano" quando as duas casam — sem isso,
 * a primeira resposta genérica do roteiro sequestraria todas as perguntas.
 * Empate mantém a ordem escrita pelo admin.
 */
export function matchScriptedReply(agent: Agent, message: string): AgentScriptedReply | null {
  const normalized = normalizeText(message);
  let best: AgentScriptedReply | null = null;
  let bestScore = 0;

  for (const reply of agent.replies) {
    const score = reply.keywords.reduce((total, keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword || !normalized.includes(normalizedKeyword)) return total;
      return total + normalizedKeyword.split(/\s+/).length;
    }, 0);

    if (score > bestScore) {
      best = reply;
      bestScore = score;
    }
  }

  return best;
}

/**
 * Resposta do agente para uma mensagem. Sem correspondência, devolve um
 * fallback — que pergunta em vez de improvisar conteúdo que o admin não
 * escreveu. `turn` faz os fallbacks alternarem, para a conversa não repetir a
 * mesma frase três vezes seguidas.
 */
export function getAgentReply(agent: Agent, message: string, turn = 0): string {
  const match = matchScriptedReply(agent, message);
  if (match) return match.text;

  if (agent.fallbacks.length === 0) {
    return 'Ainda não tenho uma resposta preparada para isso. Pode reformular?';
  }

  const index = Math.abs(Math.trunc(turn)) % agent.fallbacks.length;
  return agent.fallbacks[index];
}

/** Delay simulado da digitação: mensagem maior demora um pouco mais. */
export function typingDelay(message: string): number {
  return 700 + Math.min(message.trim().length * 12, 900);
}
