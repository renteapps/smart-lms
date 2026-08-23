import { AGENT_NOTE_PREFIX, PERSONAL_NOTE_PREFIX, type StoredNote } from "@/lib/agentNotes";
import { extractTerms, foldForMatch } from "@/lib/searchHighlight";
import type { SearchResultItem } from "@/types/search";

/**
 * Anotações que ainda vivem só no navegador.
 *
 * `AgentThread` grava as conversas salvas em `localStorage`, e essas notas não
 * existem em `student_notes` — ou seja, a busca do servidor nunca as veria.
 * O casamento acontece **no cliente**, de propósito: mandar o conteúdo dessas
 * notas para o servidor a cada tecla digitada só para descobrir se casam seria
 * pior em privacidade e em tamanho de requisição do que resolver aqui.
 *
 * Nota: o ideal é que essas notas migrem para o banco; enquanto isso não
 * acontece, esta é a única superfície em que elas aparecem.
 */

const AGENT_NOTE_URL = "/agentes";
const NOTES_URL = "/notas";

function noteKind(noteId: string): "agent" | "personal" | "lesson" {
  if (noteId.startsWith(AGENT_NOTE_PREFIX)) return "agent";
  if (noteId.startsWith(PERSONAL_NOTE_PREFIX)) return "personal";
  return "lesson";
}

function noteUrl(note: StoredNote): string {
  const kind = noteKind(note.lessonId);
  if (kind === "agent") return AGENT_NOTE_URL;
  if (kind === "personal") return NOTES_URL;
  return NOTES_URL;
}

/**
 * Casa um termo contra título, conteúdo e etiquetas. Todos os termos precisam
 * aparecer em algum dos campos — a mesma semântica "E" da busca do banco.
 */
export function matchesLocalNote(note: StoredNote, query: string): boolean {
  const terms = extractTerms(query);
  if (terms.length === 0) return true;

  const haystack = foldForMatch(
    [note.lessonTitle ?? "", note.content ?? "", (note.tags ?? []).join(" ")].join(" "),
  );

  return terms.every((term) => haystack.includes(term));
}

export function localNoteToResult(note: StoredNote): SearchResultItem {
  return {
    id: `local:${note.lessonId}`,
    type: "note",
    title: note.lessonTitle?.trim() || "Anotação sem título",
    description: (note.content ?? "").slice(0, 240),
    category: "Minhas Anotações",
    url: noteUrl(note),
    score: 0,
    hasAccess: true,
    isLocal: true,
    metadata: {
      tags: note.tags ?? [],
      pinned: note.pinned ?? false,
      updatedAt: note.updatedAt,
      noteKind: noteKind(note.lessonId),
    },
  };
}

/**
 * Notas locais que casam com o termo, já no formato de resultado.
 *
 * `existingIds` evita duplicata com o que veio do banco (uma nota que já foi
 * migrada, por exemplo). Fixadas primeiro, depois as mais recentes — a mesma
 * ordem da tela de Anotações.
 */
export function searchLocalNotes(
  notes: readonly StoredNote[],
  query: string,
  existingIds: ReadonlySet<string> = new Set(),
): SearchResultItem[] {
  return notes
    .filter((note) => note?.lessonId && !existingIds.has(note.lessonId))
    .filter((note) => matchesLocalNote(note, query))
    .sort((a, b) => {
      if (Boolean(b.pinned) !== Boolean(a.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    })
    .map(localNoteToResult);
}
