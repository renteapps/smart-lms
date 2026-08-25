import { AgentsAnalyticsView } from "@/components/admin/analytics/AgentsAnalyticsView";
import { getAgentsAnalytics } from "../actions";
import { parseAnalyticsPeriod } from "@/lib/analytics";

export default async function AdminAnaliseAgentesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const period = parseAnalyticsPeriod((await searchParams).period);
  const data = await getAgentsAnalytics(period);
  return <AgentsAnalyticsView basePath="/admin/analises" period={period} data={data} />;
}
