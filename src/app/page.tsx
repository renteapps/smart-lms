import type { Metadata } from "next";
import StudentHomeClient from "@/components/home/StudentHomeClient";
import { StudentShell } from "@/components/shells/StudentShell";
import { MarketingShell } from "@/components/shells/MarketingShell";
import { PageRenderer } from "@/components/page-builder/PageRenderer";
import { getSessionUser } from "@/lib/supabase/auth";
import { getCatalogCourses, getContinueLessons, getHomeCarouselRows } from "@/lib/data/courses";
import { getAllArticles } from "@/lib/data/blog";
import { getPageBuilderData, getPublishedPage, hasActiveProductAccess } from "@/lib/data/pages";

export const metadata: Metadata = {
  title: "Início | Smart LMS",
  description: "Seu próximo passo de estudo, organizado pela sua trilha personalizada.",
};

/**
 * Home do aluno — o painel do dia, ou Landing Page se não autenticado.
 *
 * A tela responde uma pergunta só: "o que eu faço agora?". Tudo que ela mostra
 * vem da trilha real gravada no onboarding; o plano completo, o calendário e os
 * ajustes de rotina vivem em /minha-trilha.
 *
 * Server Component fino de propósito: a trilha mora no dispositivo (localStorage),
 * então quem lê é o cliente — uma vez, no orquestrador.
 */
export default async function Home() {
  const { supabase, user } = await getSessionUser();

  if (!user) {
    const document = await getPublishedPage(supabase, "public-home");
    const data = await getPageBuilderData(supabase, document);
    return (
      <MarketingShell>
        <PageRenderer document={document} data={data} />
      </MarketingShell>
    );
  }

  const hasProducts = await hasActiveProductAccess(supabase, user.id);
  if (!hasProducts) {
    const document = await getPublishedPage(supabase, "no-products");
    const data = await getPageBuilderData(supabase, document, user.id);
    return (
      <StudentShell>
        <div className="pt-[76px]">
          <PageRenderer document={document} data={data} />
        </div>
      </StudentShell>
    );
  }

  const [courses, articles, masterclassRows, continueLessons] = await Promise.all([
    getCatalogCourses(supabase, user.id),
    getAllArticles(supabase),
    getHomeCarouselRows(supabase, user.id),
    getContinueLessons(supabase, user.id, 8),
  ]);

  return (
    <StudentShell>
      <StudentHomeClient
        courses={courses}
        articles={articles}
        masterclassRows={masterclassRows}
        continueLessons={continueLessons}
      />
    </StudentShell>
  );
}
