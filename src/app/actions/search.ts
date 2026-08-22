"use server";

import { getSessionUser } from "@/lib/supabase/auth";
import type { SearchFilterOptions, SearchResponse, SearchResultItem, SearchResultType } from "@/types/search";

export async function searchContent(options: SearchFilterOptions): Promise<SearchResponse> {
  const { query = "", type = "all", category = "Todas", sortBy = "relevance" } = options;
  const trimmedQuery = query.trim();

  // Se a busca estiver vazia, podemos retornar vazio ou buscar os estáticos.
  // Como agora o motor é o DB, podemos simplesmente passar a string vazia para retornar tudo 
  // (a RPC trata string vazia retornando os mais recentes/populares se não houver query).
  
  try {
    const { supabase, user } = await getSessionUser();

    // Invocar a RPC de Full-Text Search unificada
    const { data: results, error } = await supabase.rpc("search_unified", {
      query_text: trimmedQuery,
    });

    if (error) {
      console.error("Erro na busca unificada via RPC:", error);
      throw error;
    }

    let items: SearchResultItem[] = (results || []).map((row: any) => ({
      id: row.id,
      type: row.type as SearchResultType,
      title: row.title,
      description: row.description,
      category: row.category,
      url: row.url,
      score: row.rank,
      metadata: row.metadata,
    }));

    // Merge com notas locais que ainda não estão no banco (ou usuário deslogado)
    if (options.localNotes && options.localNotes.length > 0) {
      const existingIds = new Set(items.map((i) => i.id));
      for (const note of options.localNotes) {
        if (!existingIds.has(note.lessonId)) {
          // Filtragem simples para notas locais
          if (
            !trimmedQuery ||
            note.lessonTitle.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(trimmedQuery.toLowerCase())
          ) {
            const isAgent = note.lessonId.startsWith("agente-");
            const isPersonal = note.lessonId.startsWith("pessoal-");
            let noteUrl = "/notas";
            if (!isPersonal && !isAgent) {
              noteUrl = note.courseId && note.lessonId
                ? `/courses/${note.courseId}/lessons/${note.lessonId}`
                : `/courses/c1/lessons/${note.lessonId}`;
            } else if (isAgent) {
              noteUrl = "/agentes";
            }

            items.push({
              id: note.lessonId,
              type: "note",
              title: note.lessonTitle || "Anotação sem título",
              description: note.content,
              category: "Minhas Anotações",
              url: noteUrl,
              score: trimmedQuery ? 0.1 : 0, // Score baixo artificial para notas locais
              metadata: {
                tags: note.tags || [],
                pinned: note.pinned || false,
                updatedAt: note.updatedAt,
                noteKind: isAgent ? "agent" : isPersonal ? "personal" : "lesson",
              },
            });
          }
        }
      }
    }

    // Aplica filtro de aba (tipo)
    if (type !== "all") {
      items = items.filter((item) => item.type === type);
    }

    // Coleta categorias únicas antes do filtro de categoria
    const uniqueCategories = new Set<string>();
    for (const item of items) {
      if (item.category && item.category !== "Minhas Anotações") {
        uniqueCategories.add(item.category);
      }
    }

    // Aplica filtro de categoria
    if (category && category !== "Todas") {
      items = items.filter((item) => item.category === category);
    }

    // Ordenação (O Postgres já retorna ordenado por rank)
    if (sortBy === "az") {
      items.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    } else if (sortBy === "recent") {
      items.sort((a, b) => {
        const dateA = a.metadata?.updatedAt ? new Date(a.metadata.updatedAt).getTime() : 0;
        const dateB = b.metadata?.updatedAt ? new Date(b.metadata.updatedAt).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
        return (b.score || 0) - (a.score || 0);
      });
    }

    // Calcula contadores de todas as categorias/tipos com o termo de busca atual
    const countsByType = {
      all: 0,
      course: 0,
      lesson: 0,
      agent: 0,
      article: 0,
      note: 0,
    };

    const rawItems = results || [];
    for (const row of rawItems) {
      countsByType.all += 1;
      const t = row.type as SearchResultType;
      if (t in countsByType) {
        countsByType[t] += 1;
      }
    }

    return {
      query: trimmedQuery,
      items,
      totalCount: items.length,
      countsByType,
      categories: ["Todas", ...Array.from(uniqueCategories).sort((a, b) => a.localeCompare(b, "pt-BR"))],
    };
  } catch (err) {
    console.error("Fallback ou erro crítico:", err);
    // Em caso de erro absoluto, retorna estrutura vazia em vez de quebrar a tela
    return {
      query: trimmedQuery,
      items: [],
      totalCount: 0,
      countsByType: { all: 0, course: 0, lesson: 0, agent: 0, article: 0, note: 0 },
      categories: ["Todas"],
    };
  }
}
