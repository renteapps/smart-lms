// Módulo comum (sem "use client") para status de página: precisa ser chamado
// como função de dentro do Server Component da lista (admin/pages/page.tsx)
// e também lido em CustomPagesGrid.tsx (client). Um export de arquivo "use
// client" pode ser renderizado como componente ou passado como prop, mas
// nunca invocado como função direto do servidor — por isso isso não pode
// morar dentro de CustomPagesGrid.tsx.
export type PageStatus = "published" | "draft" | "unconfigured";

export function resolvePageStatus(hasDraft: boolean, isPublished: boolean): PageStatus {
  if (isPublished) return "published";
  return hasDraft ? "draft" : "unconfigured";
}

export const PAGE_STATUS_LABEL: Record<PageStatus, string> = {
  published: "Publicado",
  draft: "Rascunho não publicado",
  unconfigured: "Não configurada",
};

export const PAGE_STATUS_TONE: Record<PageStatus, "positive" | "warning" | "neutral"> = {
  published: "positive",
  draft: "warning",
  unconfigured: "neutral",
};
