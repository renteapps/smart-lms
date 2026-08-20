"use server";

import { getSessionUser } from "@/lib/supabase/auth";
import { executeUnifiedSearch, getStaticCandidates } from "@/lib/search";
import type { SearchFilterOptions, SearchResponse } from "@/types/search";

export async function searchContent(options: SearchFilterOptions): Promise<SearchResponse> {
  try {
    const { supabase, user } = await getSessionUser();
    let userNotes = options.localNotes || [];

    // Se o usuário estiver autenticado no Supabase, buscamos as notas dele do banco
    if (user) {
      try {
        const { data: dbNotes } = await supabase
          .from("student_notes")
          .select("id, lesson_id, lesson_title, content, tags, pinned, updated_at, lessons ( id, modules ( course_id ) )")
          .eq("user_id", user.id);

        if (dbNotes && dbNotes.length > 0) {
          const mappedDbNotes = dbNotes.map((n) => {
            const lesson = Array.isArray(n.lessons) ? n.lessons[0] : n.lessons;
            const mod = Array.isArray(lesson?.modules) ? lesson.modules[0] : lesson?.modules;
            const courseId = (mod as { course_id?: string } | undefined)?.course_id;

            return {
              lessonId: n.lesson_id || n.id,
              courseId,
              lessonTitle: n.lesson_title || "Anotação sem título",
              content: n.content || "",
              updatedAt: n.updated_at || new Date().toISOString(),
              pinned: n.pinned || false,
              tags: n.tags || [],
            };
          });

          // Mescla notas do banco com notas locais sem duplicar por lessonId
          const existingIds = new Set(mappedDbNotes.map((n) => n.lessonId));
          const nonDuplicateLocal = userNotes.filter((n) => !existingIds.has(n.lessonId));
          userNotes = [...mappedDbNotes, ...nonDuplicateLocal];
        }
      } catch {
        // Fallback silencioso para notas locais se a tabela ou conexão falhar
      }
    }

    const candidates = getStaticCandidates(userNotes);

    return executeUnifiedSearch(
      {
        ...options,
        userId: user?.id,
      },
      candidates,
    );
  } catch (err) {
    // Em caso de erro do servidor, executa busca estática local com segurança
    return executeUnifiedSearch(options);
  }
}
