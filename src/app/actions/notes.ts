"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import type { NoteKind } from "@/lib/data/notes";
import type { ActionResult } from "./progress";

/**
 * Caderno do aluno.
 *
 * A anotação de aula é única por (aluno, aula) — reabrir a aula continua a mesma
 * nota. Já as de agente e as pessoais são livres: cada uma é um registro novo.
 */
export async function saveLessonNote(
  lessonId: string,
  lessonTitle: string,
  content: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("student_notes").upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        lesson_title: lessonTitle,
        content,
        kind: "lesson",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" },
    );

    if (error) return { success: false, message: error.message };

    revalidatePath("/notas");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/** Guarda uma resposta do agente no caderno do aluno. */
export async function saveAgentNote(
  agentId: string,
  title: string,
  content: string,
): Promise<ActionResult> {
  return createNote({ kind: "agent", agentId, title, content });
}

export async function savePersonalNote(
  title: string,
  content: string,
  tags: string[] = [],
): Promise<ActionResult> {
  return createNote({
    kind: "personal",
    title: title.trim() || "Anotação sem título",
    content: content.trim(),
    tags,
  });
}

async function createNote(input: {
  kind: NoteKind;
  title: string;
  content: string;
  agentId?: string;
  tags?: string[];
}): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("student_notes").insert({
      user_id: user.id,
      kind: input.kind,
      agent_id: input.agentId ?? null,
      lesson_title: input.title,
      content: input.content,
      tags: input.tags ?? [],
    });

    if (error) return { success: false, message: error.message };

    revalidatePath("/notas");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function updateNote(
  noteId: string,
  updates: { title?: string; content?: string; tags?: string[] },
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) payload.lesson_title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.tags !== undefined) payload.tags = updates.tags;

    const { error } = await supabase
      .from("student_notes")
      .update(payload)
      .eq("id", noteId)
      .eq("user_id", user.id);

    if (error) return { success: false, message: error.message };

    revalidatePath("/notas");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function deleteNote(noteId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase
      .from("student_notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", user.id);

    if (error) return { success: false, message: error.message };

    revalidatePath("/notas");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function togglePinNote(noteId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { data } = await supabase
      .from("student_notes")
      .select("pinned")
      .eq("id", noteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) return { success: false, message: "Anotação não encontrada." };

    const { error } = await supabase
      .from("student_notes")
      .update({ pinned: !data.pinned })
      .eq("id", noteId)
      .eq("user_id", user.id);

    if (error) return { success: false, message: error.message };

    revalidatePath("/notas");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
