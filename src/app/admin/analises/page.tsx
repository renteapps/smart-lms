import { AnalyticsHubView } from "@/components/admin/analytics/AnalyticsHubView";
import { getAnalyticsHubViewModel } from "./actions";
import { parseAnalyticsPeriod } from "@/lib/analytics";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const period = parseAnalyticsPeriod((await searchParams).period);
  const viewModel = await getAnalyticsHubViewModel(period);

  return <AnalyticsHubView basePath="/admin/analises" {...viewModel} />;
}
