import { SalesAnalyticsView } from "@/components/admin/analytics/SalesAnalyticsView";
import { getSalesAnalytics } from "../actions";
import { parseAnalyticsPeriod } from "@/lib/analytics";

export default async function AdminAnaliseVendasPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const period = parseAnalyticsPeriod((await searchParams).period);
  const data = await getSalesAnalytics(period);
  return <SalesAnalyticsView basePath="/admin/analises" period={period} data={data} />;
}
