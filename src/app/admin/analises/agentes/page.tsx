import { AgentsAnalyticsView } from "@/components/admin/analytics/AgentsAnalyticsView";
import { getAgentsAnalytics } from "../actions";

export default async function AdminAnaliseAgentesPage() {
  const data = await getAgentsAnalytics();
  return <AgentsAnalyticsView basePath="/admin/analises" data={data} />;
}
