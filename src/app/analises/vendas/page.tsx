import { SalesAnalyticsView } from "@/components/admin/analytics/SalesAnalyticsView";
import { getSalesAnalytics } from "@/app/admin/analises/actions";
import { parseAnalyticsPeriod } from "@/lib/analytics";

export default async function AnalisesVendasDirectPage({ searchParams }: { searchParams: Promise<{ period?: string | string[] }> }) {
  const period = parseAnalyticsPeriod((await searchParams).period);
  const data = await getSalesAnalytics(period);
  return <SalesAnalyticsView basePath="/analises" period={period} data={data} />;
}
