import { StudentsAnalyticsView } from "@/components/admin/analytics/StudentsAnalyticsView";
import { getStudentsAnalytics } from "../actions";

export default async function AdminAnaliseAlunosPage() {
  const data = await getStudentsAnalytics();
  return <StudentsAnalyticsView basePath="/admin/analises" data={data} />;
}
