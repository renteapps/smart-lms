import { AgentProviders } from "@/components/providers/AgentProviders";
import { getAgents } from "@/lib/data/agents";
import { requireAdmin } from "@/lib/supabase/auth";

export default async function AdminAgentsLayout({ children }: { children: React.ReactNode }) {
  // adminClient: prompt, contexto e arquivos só são legíveis pelo service role.
  const { adminClient } = await requireAdmin();
  const agents = await getAgents(adminClient, true);
  return <AgentProviders agents={agents}>{children}</AgentProviders>;
}
