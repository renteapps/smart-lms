import { SubscriptionsAnalyticsView } from "@/components/admin/analytics/SubscriptionsAnalyticsView";
import { getSubscriptionsAnalytics } from "../actions";

export default async function AdminAnaliseAssinaturasPage() {
  const data = await getSubscriptionsAnalytics();
  return <SubscriptionsAnalyticsView basePath="/admin/analises" data={data} />;
}
