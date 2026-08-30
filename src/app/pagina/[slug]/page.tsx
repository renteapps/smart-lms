import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/shells/MarketingShell";
import { PageRenderer } from "@/components/page-builder/PageRenderer";
import { getSessionUser } from "@/lib/supabase/auth";
import { getPageBuilderData, getPublishedCustomPage } from "@/lib/data/pages";

type PageParams = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const { supabase } = await getSessionUser();
  const custom = await getPublishedCustomPage(supabase, slug);
  if (!custom) return {};
  return {
    title: `${custom.title} | Smart LMS`,
    description: custom.description ?? undefined,
  };
}

/**
 * Páginas personalizadas criadas em /admin/pages. Diferente da rota raiz
 * (que só roda o branch anônimo quando não há usuário), aqui um visitante
 * logado pode cair direto — por isso o `userId` é sempre repassado, para os
 * testes de perfil filtrarem certo. Sempre pública (sem gate de login),
 * como qualquer outra página do criador.
 */
export default async function CustomPage({ params }: PageParams) {
  const { slug } = await params;
  const { supabase, user } = await getSessionUser();

  const custom = await getPublishedCustomPage(supabase, slug);
  if (!custom) notFound();

  const data = await getPageBuilderData(supabase, custom.document, user?.id ?? null);

  return (
    <MarketingShell>
      <PageRenderer document={custom.document} data={data} offsetForFixedHeader />
    </MarketingShell>
  );
}
