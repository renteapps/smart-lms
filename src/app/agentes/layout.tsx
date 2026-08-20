import { AgentProviders } from "@/components/providers/AgentProviders";
import { StudentShell } from "@/components/shells/StudentShell";
import { getAgentCatalog } from "@/lib/data/agents";
import { getSessionUser } from "@/lib/supabase/auth";

export default async function AgentsLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await getSessionUser();
  const agents = await getAgentCatalog(supabase);

  return (
    <StudentShell>
      <AgentProviders agents={agents} withChat>{children}</AgentProviders>
    </StudentShell>
  );
}
