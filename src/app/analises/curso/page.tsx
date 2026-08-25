import { CoursesAnalyticsView } from "@/components/admin/analytics/CoursesAnalyticsView";
import { getCoursesAnalytics } from "@/app/admin/analises/actions";
import { parseAnalyticsPeriod } from "@/lib/analytics";

export default async function AnalisesCursoDirectPage({ searchParams }: { searchParams: Promise<{ period?: string | string[] }> }) {
  const period = parseAnalyticsPeriod((await searchParams).period);
  const data = await getCoursesAnalytics(period);
  return <CoursesAnalyticsView basePath="/analises" period={period} data={data} />;
}
