/**
 * Ponte entre a conversa com um agente e a tela de Anotações.
 *
 * As duas telas compartilham a mesma chave de armazenamento, então o formato
 * do registro mora aqui: o prefixo do id é o que permite a tela de Anotações
 * distinguir o que veio de uma aula do que veio de um agente — e oferecer o
 * link de volta certo.
 */

const NOTES_STORAGE_KEY = 'smartlms_all_notes';

export const AGENT_NOTE_PREFIX = 'agente-';

export interface StoredNote {
  lessonId: string;
  lessonTitle: string;
  content: string;
  updatedAt: string;
}

export function isAgentNote(noteId: string): boolean {
  return noteId.startsWith(AGENT_NOTE_PREFIX);
}

function readNotes(): StoredNote[] {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredNote[]) : [];
  } catch {
    // Dados locais corrompidos não podem impedir uma anotação nova.
    return [];
  }
}

/** Guarda uma resposta do agente no caderno do aluno. Devolve `false` se o navegador recusou. */
export function saveAgentNote(agentId: string, title: string, content: string): boolean {
  const note: StoredNote = {
    lessonId: `${AGENT_NOTE_PREFIX}${agentId}-${Date.now()}`,
    lessonTitle: title,
    content,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify([note, ...readNotes()]));
    return true;
  } catch {
    return false;
  }
}
