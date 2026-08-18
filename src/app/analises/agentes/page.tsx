import { AgentsAnalyticsView } from "@/components/admin/analytics/AgentsAnalyticsView";
import { getAgentsAnalytics } from "@/app/admin/analises/actions";

export default async function AnalisesAgentesDirectPage() {
  const data = await getAgentsAnalytics();
  return <AgentsAnalyticsView basePath="/analises" data={data} />;
}
