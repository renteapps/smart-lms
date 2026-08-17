import type { Metadata } from "next";
import { AgentRoute } from "@/components/agentes/AgentRoute";
import { getSessionUser } from "@/lib/supabase/auth";
import { getAgentBySlug } from "@/lib/data/agents";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { supabase } = await getSessionUser();
  const agent = await getAgentBySlug(supabase, slug);

  if (!agent) return { title: "Agente · Smart LMS" };

  return {
    title: `${agent.name} · ${agent.role}`,
    description: agent.description,
  };
}

/**
 * Área de conversa do agente: índice de threads à esquerda, conversa à direita.
 * O histórico vive no `AgentChatProvider`, então trocar de agente pela URL não
 * perde nada do que já foi conversado.
 */
export default async function AgentePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AgentRoute slug={slug} />;
}
