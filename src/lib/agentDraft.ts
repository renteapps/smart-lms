import { matchScriptedReply, normalizeText } from '@/lib/agentChat';
import { Agent } from '@/types/agente';

/**
 * Problema de roteiro que não impede publicar, mas degrada a conversa.
 *
 * O que bloqueia (campo em branco, slug repetido) vive na validação do
 * formulário. Aqui ficam os defeitos que só aparecem quando alguém conversa
 * com o agente — o admin precisa vê-los antes do aluno.
 */
export interface AgentScriptWarning {
  id: string;
  message: string;
}

/**
 * Confere o roteiro rodando a engine real contra ele.
 *
 * A primeira regra é a mesma que `agentChat.test.ts` afirma sobre os agentes
 * semente — toda sugestão de partida precisa casar com uma resposta escrita —
 * só que aplicada ao rascunho, antes de virar catálogo.
 */
export function collectScriptWarnings(agent: Agent): AgentScriptWarning[] {
  const warnings: AgentScriptWarning[] = [];

  for (const starter of agent.starters) {
    if (!starter.message.trim()) continue;
    if (matchScriptedReply(agent, starter.message)) continue;

    warnings.push({
      id: `starter-${starter.id}`,
      message: `A sugestão “${starter.label || starter.message}” não casa com nenhuma resposta: o aluno clica e recebe um fallback.`,
    });
  }

  if (agent.replies.length === 0) {
    warnings.push({
      id: 'sem-respostas',
      message: 'Sem respostas por palavra-chave, o agente devolve fallback para tudo.',
    });
  }

  if (agent.fallbacks.length === 0) {
    warnings.push({
      id: 'sem-fallback',
      message:
        'Sem saída de fallback, o aluno recebe uma frase genérica do sistema que você não escreveu.',
    });
  }

  if (agent.skills.length === 0) {
    warnings.push({
      id: 'sem-habilidades',
      message: 'Sem habilidades, o card do agente em /agentes fica sem os chips do que ele resolve.',
    });
  }

  warnings.push(...collectKeywordCollisions(agent));

  return warnings;
}

/**
 * Palavra-chave repetida entre duas respostas.
 *
 * `matchScriptedReply` pontua por número de palavras e o empate mantém a ordem
 * escrita, então a segunda resposta pode nunca ser alcançada. Dizemos qual vence
 * para o admin não ficar caçando por que o roteiro cai sempre no mesmo lugar.
 */
function collectKeywordCollisions(agent: Agent): AgentScriptWarning[] {
  const seen = new Map<string, string>();
  const collisions: AgentScriptWarning[] = [];

  for (const reply of agent.replies) {
    for (const keyword of reply.keywords) {
      const normalized = normalizeText(keyword);
      if (!normalized) continue;

      const owner = seen.get(normalized);
      if (owner === undefined) {
        seen.set(normalized, reply.id);
        continue;
      }
      if (owner === reply.id) continue;

      collisions.push({
        id: `keyword-${normalized}-${reply.id}`,
        message: `A palavra-chave “${keyword}” está em duas respostas; no empate vence a que vem antes na lista.`,
      });
    }
  }

  return collisions;
}
