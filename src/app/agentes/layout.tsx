import { AgentProviders } from "@/components/providers/AgentProviders";
import { StudentShell } from "@/components/shells/StudentShell";
import { getAgentCatalog } from "@/lib/data/agents";
import { checkAgentAccess, getAgentUserAccessContext } from "@/lib/data/agentAccess";
import { getSessionUser } from "@/lib/supabase/auth";

/**
 * Agentes restritos a curso/plano específico saem da listagem de quem não tem
 * acesso — sem isso a vitrine mostrava (e o chat aceitava) agente pago para
 * qualquer aluno logado, plano nenhum.
 */
export default async function AgentsLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getSessionUser();
  const catalog = await getAgentCatalog(supabase);
  const accessContext = user
    ? await getAgentUserAccessContext(supabase, user.id)
    : { isAdmin: false, enrolledCourseIds: [], activePlanIds: [] };
  const agents = accessContext.isAdmin
    ? catalog
    : catalog.filter((agent) => checkAgentAccess(agent, accessContext).hasAccess);

  return (
    <StudentShell>
      <AgentProviders agents={agents} withChat>{children}</AgentProviders>
    </StudentShell>
  );
}
