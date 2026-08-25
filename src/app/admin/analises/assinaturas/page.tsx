import { SubscriptionsAnalyticsView } from "@/components/admin/analytics/SubscriptionsAnalyticsView";
import { getSubscriptionsAnalytics } from "../actions";
import { parseAnalyticsPeriod } from "@/lib/analytics";

export default async function AdminAnaliseAssinaturasPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const period = parseAnalyticsPeriod((await searchParams).period);
  const data = await getSubscriptionsAnalytics(period);
  return <SubscriptionsAnalyticsView basePath="/admin/analises" period={period} data={data} />;
}
