import { CoursesAnalyticsView } from "@/components/admin/analytics/CoursesAnalyticsView";
import { getCoursesAnalytics } from "@/app/admin/analises/actions";

export default async function AnalisesCursosDirectPage() {
  const data = await getCoursesAnalytics();
  return <CoursesAnalyticsView basePath="/analises" data={data} />;
}
