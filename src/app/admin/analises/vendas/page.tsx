import { SalesAnalyticsView } from "@/components/admin/analytics/SalesAnalyticsView";
import { getSalesAnalytics } from "../actions";

export default async function AdminAnaliseVendasPage() {
  const data = await getSalesAnalytics();
  return <SalesAnalyticsView basePath="/admin/analises" data={data} />;
}
