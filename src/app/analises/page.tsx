import { redirect } from "next/navigation";

/*
 * Esta rota ficava fora de `/admin`, então o gate de admin do middleware
 * (`isAdminRoute` em src/lib/supabase/middleware.ts só cobre `/admin/*`) não
 * se aplicava aqui — qualquer usuário autenticado (inclusive aluno) conseguia
 * ver receita, MRR, churn e dados de clientes só por estar logado. Em vez de
 * duplicar a checagem de admin, redireciona para a rota já protegida.
 */
export default async function AnalisesHubRedirect({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const { period } = await searchParams;
  const suffix = typeof period === "string" ? `?period=${encodeURIComponent(period)}` : "";
  redirect(`/admin/analises${suffix}`);
}
