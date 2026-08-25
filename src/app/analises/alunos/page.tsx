import { StudentsAnalyticsView } from "@/components/admin/analytics/StudentsAnalyticsView";
import { getStudentsAnalytics } from "@/app/admin/analises/actions";
import { parseAnalyticsPeriod } from "@/lib/analytics";

export default async function AnalisesAlunosDirectPage({ searchParams }: { searchParams: Promise<{ period?: string | string[] }> }) {
  const period = parseAnalyticsPeriod((await searchParams).period);
  const data = await getStudentsAnalytics(period);
  return <StudentsAnalyticsView basePath="/analises" period={period} data={data} />;
}
