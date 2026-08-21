import type { Metadata } from "next";
import StudentHomeClient from "@/components/home/StudentHomeClient";
import { StudentShell } from "@/components/shells/StudentShell";
import { getSessionUser } from "@/lib/supabase/auth";
import { getCatalogCourses } from "@/lib/data/courses";
import { getAllArticles } from "@/lib/data/blog";

export const metadata: Metadata = {
  title: "Início | Smart LMS",
  description: "Seu próximo passo de estudo, organizado pela sua trilha personalizada.",
};

/**
 * Home do aluno — o painel do dia.
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
  const [courses, articles] = await Promise.all([
    getCatalogCourses(supabase, user?.id),
    getAllArticles(supabase)
  ]);

  return <StudentShell><StudentHomeClient courses={courses} articles={articles} /></StudentShell>;
}
