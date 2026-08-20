"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import type { ActionResult } from "./progress";

export async function addLessonComment(
  lessonId: string,
  content: string,
  parentId?: string
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("comments").insert({
      lesson_id: lessonId,
      user_id: user.id,
      content,
      parent_id: parentId || null,
    });

    if (error) return { success: false, message: error.message };

    // Revalida a página da aula para atualizar os comentários. O caminho é o
    // padrão da rota (com os segmentos dinâmicos literais), não a URL concreta.
    revalidatePath("/courses/[id]/lessons/[lessonId]", "page");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
