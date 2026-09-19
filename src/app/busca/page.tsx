import { Suspense } from "react";
import type { Metadata } from "next";
import { Spinner } from "@heroui/react";
import { SearchPageView } from "@/components/search/SearchPageView";

export const metadata: Metadata = {
  title: "Buscar Conteúdos",
  description: "Pesquise por aulas, agentes de IA, artigos do blog e suas anotações pessoais.",
};

export default function BuscaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center pt-24">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" color="accent" />
            <p className="text-sm font-medium text-muted">Carregando busca...</p>
          </div>
        </div>
      }
    >
      <SearchPageView />
    </Suspense>
  );
}
