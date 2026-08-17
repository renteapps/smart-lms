import { logQueryError, type DB, type Row } from "./types";

/**
 * Caderno do aluno: anotações de aula, de conversa com agente e pessoais.
 *
 * Antes as três viviam na mesma chave de localStorage e se distinguiam por um
 * prefixo no id. Agora a distinção é uma coluna (`kind`), e o vínculo com a aula
 * ou o agente é uma chave estrangeira de verdade.
 */

export type NoteKind = "lesson" | "agent" | "personal";

export type StudentNote = {
  id: string;
  kind: NoteKind;
  /** Aula de origem, quando `kind === 'lesson'`. */
  lessonId?: string;
  /** Curso da aula — o que permite o link de volta funcionar. */
  courseId?: string;
  agentId?: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

const NOTE_SELECT = `
  id, kind, lesson_id, agent_id, lesson_title, content, tags, pinned, created_at,
  updated_at, lessons ( id, modules ( course_id ) )
`;

function mapNote(row: Row): StudentNote {
  return {
    id: row.id,
    kind: (row.kind ?? "lesson") as NoteKind,
    lessonId: row.lesson_id ?? undefined,
    courseId: row.lessons?.modules?.course_id ?? undefined,
    agentId: row.agent_id ?? undefined,
    title: row.lesson_title ?? "Anotação sem título",
    content: row.content ?? "",
    tags: row.tags ?? [],
    pinned: row.pinned ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getNotes(db: DB, userId: string): Promise<StudentNote[]> {
  const { data, error } = await db
    .from("student_notes")
    .select(NOTE_SELECT)
    .eq("user_id", userId)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  logQueryError("getNotes", error);
  return (data ?? []).map(mapNote);
}

export async function getLessonNote(
  db: DB,
  userId: string,
  lessonId: string,
): Promise<StudentNote | null> {
  const { data, error } = await db
    .from("student_notes")
    .select(NOTE_SELECT)
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .eq("kind", "lesson")
    .maybeSingle();

  logQueryError("getLessonNote", error);
  return data ? mapNote(data) : null;
}

export function isAgentNote(note: StudentNote): boolean {
  return note.kind === "agent";
}

export function isPersonalNote(note: StudentNote): boolean {
  return note.kind === "personal";
}

export function isLessonNote(note: StudentNote): boolean {
  return note.kind === "lesson";
}

/** Exporta todas as anotações no formato Markdown legível. */
export function exportNotesAsMarkdown(notes: StudentNote[]): string {
  const header = `# Meu Caderno de Anotações - Smart LMS\n*Exportado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}*\n\n---\n\n`;

  const body = notes
    .map((note) => {
      const type = isAgentNote(note)
        ? "🤖 Agente de IA"
        : isPersonalNote(note)
          ? "📝 Anotação Pessoal"
          : "🎓 Aula / Curso";
      const date = new Date(note.updatedAt).toLocaleDateString("pt-BR");
      const tags = note.tags.length
        ? `\n**Tags:** ${note.tags.map((tag) => `\`#${tag}\``).join(" ")}`
        : "";

      return `## ${note.title}\n**Origem:** ${type} | **Data:** ${date}${tags}\n\n${note.content}\n\n---`;
    })
    .join("\n\n");

  return header + body;
}
