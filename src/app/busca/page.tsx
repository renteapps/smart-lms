import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchPageView } from "@/components/search/SearchPageView";

export const metadata: Metadata = {
  title: "Buscar Conteúdos | Smart LMS",
  description: "Pesquise por aulas, agentes de IA, artigos do blog e suas anotações pessoais no Smart LMS.",
};

export default function BuscaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center pt-24">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm font-medium text-muted">Carregando busca...</p>
          </div>
        </div>
      }
    >
      <SearchPageView />
    </Suspense>
  );
}
