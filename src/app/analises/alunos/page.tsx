import { StudentsAnalyticsView } from "@/components/admin/analytics/StudentsAnalyticsView";
import { getStudentsAnalytics } from "@/app/admin/analises/actions";

export default async function AnalisesAlunosDirectPage() {
  const data = await getStudentsAnalytics();
  return <StudentsAnalyticsView basePath="/analises" data={data} />;
}
