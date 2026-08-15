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
export const PERSONAL_NOTE_PREFIX = 'pessoal-';

export interface StoredNote {
  lessonId: string;
  lessonTitle: string;
  content: string;
  updatedAt: string;
  pinned?: boolean;
  tags?: string[];
  category?: string;
}

export function isAgentNote(noteId: string): boolean {
  return noteId.startsWith(AGENT_NOTE_PREFIX);
}

export function isPersonalNote(noteId: string): boolean {
  return noteId.startsWith(PERSONAL_NOTE_PREFIX);
}

export function isLessonNote(noteId: string): boolean {
  return !isAgentNote(noteId) && !isPersonalNote(noteId);
}

export function readNotes(): StoredNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredNote[]) : [];
  } catch {
    return [];
  }
}

export function writeNotes(notes: StoredNote[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch {
    return false;
  }
}

/** Guarda uma resposta do agente no caderno do aluno. */
export function saveAgentNote(agentId: string, title: string, content: string): boolean {
  const note: StoredNote = {
    lessonId: `${AGENT_NOTE_PREFIX}${agentId}-${Date.now()}`,
    lessonTitle: title,
    content,
    updatedAt: new Date().toISOString(),
  };

  try {
    return writeNotes([note, ...readNotes()]);
  } catch {
    return false;
  }
}

/** Guarda uma anotação pessoal rápida. */
export function savePersonalNote(title: string, content: string, tags: string[] = []): StoredNote | null {
  const note: StoredNote = {
    lessonId: `${PERSONAL_NOTE_PREFIX}${Date.now()}`,
    lessonTitle: title.trim() || 'Anotação sem título',
    content: content.trim(),
    updatedAt: new Date().toISOString(),
    tags,
  };

  const success = writeNotes([note, ...readNotes()]);
  return success ? note : null;
}

/** Atualiza uma anotação existente. */
export function updateNote(noteId: string, updates: Partial<StoredNote>): boolean {
  const notes = readNotes();
  const index = notes.findIndex((n) => n.lessonId === noteId);
  if (index === -1) return false;

  notes[index] = {
    ...notes[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return writeNotes(notes);
}

/** Remove uma anotação pelo ID. */
export function deleteNote(noteId: string): boolean {
  const notes = readNotes().filter((n) => n.lessonId !== noteId);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`smartlms_note_${noteId}`);
  }
  return writeNotes(notes);
}

/** Alterna status de fixado no topo. */
export function togglePinNote(noteId: string): boolean {
  const notes = readNotes();
  const index = notes.findIndex((n) => n.lessonId === noteId);
  if (index === -1) return false;

  notes[index].pinned = !notes[index].pinned;
  return writeNotes(notes);
}

/** Gera anotações de exemplo para enriquecer o caderno rapidamente. */
export function getSampleNotes(): StoredNote[] {
  const now = Date.now();
  return [
    {
      lessonId: `${AGENT_NOTE_PREFIX}mentor-${now - 1000 * 60 * 30}`,
      lessonTitle: "Insights do Mentor de IA: Boas Práticas em Componentes",
      content: "1. Manter a composição clara com props previsíveis.\n2. Priorizar isolamento de estado e evitar efeitos colaterais desnecessários em renderizações.\n3. Usar hooks customizados para abstrair lógica de negócio complexa.",
      updatedAt: new Date(now - 1000 * 60 * 30).toISOString(),
      pinned: true,
      tags: ["React", "Arquitetura", "IA Mentor"],
    },
    {
      lessonId: "l1",
      lessonTitle: "Aula 1: Fundamentos do Ecossistema Moderno",
      content: "Conceito chave: Server Components no Next.js reduzem o tamanho do bundle JavaScript enviado ao cliente.\n\nPróximo passo: aplicar isso na reestruturação da tela de catálogo.",
      updatedAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      pinned: false,
      tags: ["Aula", "Next.js"],
    },
    {
      lessonId: `${PERSONAL_NOTE_PREFIX}${now - 1000 * 60 * 60 * 48}`,
      lessonTitle: "Plano de Estudo Pessoal: Sprint de Julho",
      content: "Objetivo: Concluir o módulo de Gerenciamento de Estado e construir 1 projeto prático até o fim da semana.\nRevisar anotações toda sexta-feira pela manhã.",
      updatedAt: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
      pinned: false,
      tags: ["Metas", "Produtividade"],
    },
  ];
}

/** Exporta todas as anotações no formato Markdown legível. */
export function exportNotesAsMarkdown(notes: StoredNote[]): string {
  const header = `# Meu Caderno de Anotações - Smart LMS\n*Exportado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}*\n\n---\n\n`;

  const body = notes
    .map((note) => {
      const type = isAgentNote(note.lessonId)
        ? '🤖 Agente de IA'
        : isPersonalNote(note.lessonId)
        ? '📝 Anotação Pessoal'
        : '🎓 Aula / Curso';
      const date = new Date(note.updatedAt).toLocaleDateString('pt-BR');
      const tags = note.tags?.length ? `\n**Tags:** ${note.tags.map((t) => `\`#${t}\``).join(' ')}` : '';

      return `## ${note.lessonTitle}\n**Origem:** ${type} | **Data:** ${date}${tags}\n\n${note.content}\n\n---`;
    })
    .join('\n\n');

  return header + body;
}

