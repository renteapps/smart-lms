import { SalesAnalyticsView } from "@/components/admin/analytics/SalesAnalyticsView";
import { getSalesAnalytics } from "@/app/admin/analises/actions";

export default async function AnalisesVendasDirectPage() {
  const data = await getSalesAnalytics();
  return <SalesAnalyticsView basePath="/analises" data={data} />;
}
