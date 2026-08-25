import { AgentsAnalyticsView } from "@/components/admin/analytics/AgentsAnalyticsView";
import { getAgentsAnalytics } from "@/app/admin/analises/actions";
import { parseAnalyticsPeriod } from "@/lib/analytics";

export default async function AnalisesAgentesDirectPage({ searchParams }: { searchParams: Promise<{ period?: string | string[] }> }) {
  const period = parseAnalyticsPeriod((await searchParams).period);
  const data = await getAgentsAnalytics(period);
  return <AgentsAnalyticsView basePath="/analises" period={period} data={data} />;
}
