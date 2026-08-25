import { AnalyticsHubView } from "@/components/admin/analytics/AnalyticsHubView";
import { getAnalyticsHubViewModel } from "@/app/admin/analises/actions";
import { parseAnalyticsPeriod } from "@/lib/analytics";

export default async function AnalisesHubDirectPage({ searchParams }: { searchParams: Promise<{ period?: string | string[] }> }) {
  const period = parseAnalyticsPeriod((await searchParams).period);
  const viewModel = await getAnalyticsHubViewModel(period);

  return <AnalyticsHubView basePath="/analises" {...viewModel} />;
}
