import type { Metadata } from "next";
import StudentHomeClient from "@/components/home/StudentHomeClient";
import { StudentShell } from "@/components/shells/StudentShell";
import { MarketingShell } from "@/components/shells/MarketingShell";
import { PageRenderer } from "@/components/page-builder/PageRenderer";
import { getSessionUser } from "@/lib/supabase/auth";
import { getCatalogCourses, getContinueLessons, getHomeCarouselRows } from "@/lib/data/courses";
import { getAllArticles } from "@/lib/data/blog";
import { getAppearanceConfig } from "@/lib/data/appearance";
import { getPageBuilderData, getProductAccess, getPublishedPage } from "@/lib/data/pages";
import { getDailyPilulaForUser } from "@/lib/data/pilulas";
import { getProfileTests } from "@/lib/data/profileTests";
import { createClient } from "@/lib/supabase/server";

/**
 * `page.tsx` e o `layout.tsx` raiz são o mesmo segmento de rota, então o
 * `title.template` do layout não se aplica aqui (só em segmentos filhos) —
 * por isso o nome da plataforma precisa ser montado manualmente.
 */
export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const appearance = await getAppearanceConfig(supabase);
  return {
    title: `Início | ${appearance.platformName}`,
    description: "Seu próximo passo de estudo, organizado pela sua trilha personalizada.",
  };
}

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
        <PageRenderer document={document} data={data} offsetForFixedHeader />
      </MarketingShell>
    );
  }

  const { hasAccess, hasPlan } = await getProductAccess(supabase, user.id);
  if (!hasAccess) {
    const document = await getPublishedPage(supabase, "no-products");
    const data = await getPageBuilderData(supabase, document, user.id);
    return (
      <StudentShell>
        <PageRenderer document={document} data={data} offsetForFixedHeader />
      </StudentShell>
    );
  }

  const [courses, articles, masterclassRows, continueLessons, dailyPilula, profileTests] = await Promise.all([
    getCatalogCourses(supabase, user.id),
    getAllArticles(supabase),
    getHomeCarouselRows(supabase, user.id),
    getContinueLessons(supabase, user.id, 8),
    getDailyPilulaForUser(supabase, user.id),
    getProfileTests(supabase, true),
  ]);

  const initialDailyPill = dailyPilula
    ? {
        id: dailyPilula.id,
        title: dailyPilula.title,
        challenge: dailyPilula.challenge,
        likesCount: dailyPilula.likesCount,
      }
    : null;

  return (
    <StudentShell>
      <StudentHomeClient
        courses={courses}
        articles={articles}
        masterclassRows={masterclassRows}
        continueLessons={continueLessons}
        hasPlan={hasPlan}
        initialDailyPill={initialDailyPill}
        initialProfileTests={profileTests}
      />
    </StudentShell>
  );
}
