import { redirect } from "next/navigation";

// Ver nota de segurança em src/app/analises/page.tsx.
export default async function AnalisesAlunosRedirect({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const { period } = await searchParams;
  const suffix = typeof period === "string" ? `?period=${encodeURIComponent(period)}` : "";
  redirect(`/admin/analises/alunos${suffix}`);
}
