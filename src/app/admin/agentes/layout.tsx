import { AgentProviders } from "@/components/providers/AgentProviders";
import { getAgents } from "@/lib/data/agents";
import { getSessionUser } from "@/lib/supabase/auth";

export default async function AdminAgentsLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await getSessionUser();
  const agents = await getAgents(supabase, true);
  return <AgentProviders agents={agents}>{children}</AgentProviders>;
}
