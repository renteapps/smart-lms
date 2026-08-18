import { SubscriptionsAnalyticsView } from "@/components/admin/analytics/SubscriptionsAnalyticsView";
import { getSubscriptionsAnalytics } from "@/app/admin/analises/actions";

export default async function AnalisesAssinaturasDirectPage() {
  const data = await getSubscriptionsAnalytics();
  return <SubscriptionsAnalyticsView basePath="/analises" data={data} />;
}
