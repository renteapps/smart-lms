import { SubscriptionsAnalyticsView } from "@/components/admin/analytics/SubscriptionsAnalyticsView";
import { getSubscriptionsAnalytics } from "@/app/admin/analises/actions";
import { parseAnalyticsPeriod } from "@/lib/analytics";

export default async function AnalisesAssinaturasDirectPage({ searchParams }: { searchParams: Promise<{ period?: string | string[] }> }) {
  const period = parseAnalyticsPeriod((await searchParams).period);
  const data = await getSubscriptionsAnalytics(period);
  return <SubscriptionsAnalyticsView basePath="/analises" period={period} data={data} />;
}
