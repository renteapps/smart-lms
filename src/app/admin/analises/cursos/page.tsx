import { CoursesAnalyticsView } from "@/components/admin/analytics/CoursesAnalyticsView";
import { getCoursesAnalytics } from "../actions";

export default async function AdminAnaliseCursosPage() {
  const data = await getCoursesAnalytics();
  return <CoursesAnalyticsView basePath="/admin/analises" data={data} />;
}
