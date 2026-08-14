import type { Metadata } from "next";
import { AgentRoute } from "@/components/agentes/AgentRoute";
import { AGENTS } from "@/lib/mocks/agenteMocks";

/**
 * Só as sementes são conhecidas em build. Agentes publicados no admin vivem no
 * localStorage do navegador, então caem no render sob demanda — `dynamicParams`
 * segue no padrão `true`.
 */
export function generateStaticParams() {
  return AGENTS.map((agent) => ({ slug: agent.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const agent = AGENTS.find((item) => item.slug === slug);

  /*
   * O servidor não enxerga o catálogo do admin — ele mora no navegador. Um slug
   * desconhecido aqui ainda pode existir para o aluno, então o título é genérico
   * em vez de "não encontrado".
   *
   * Corrigir isso no cliente não é possível de forma estável: o `<head>` é do
   * Metadata API do App Router, que reaplica este valor após a hidratação e
   * desfaz qualquer `document.title` escrito por efeito. Agentes criados no
   * admin ficam com o título genérico até existir uma fonte de dados que o
   * servidor também enxergue.
   */
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
