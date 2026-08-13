import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgentWorkspace } from "@/components/agentes/AgentWorkspace";
import { AGENTS, getAgentBySlug } from "@/lib/mocks/agenteMocks";

/** Os agentes são publicados pelo admin: a lista é conhecida em build. */
export function generateStaticParams() {
  return AGENTS.map((agent) => ({ slug: agent.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const agent = getAgentBySlug(slug);
  if (!agent) return { title: "Agente não encontrado" };

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
  const agent = getAgentBySlug(slug);
  if (!agent) notFound();

  return <AgentWorkspace agent={agent} />;
}
