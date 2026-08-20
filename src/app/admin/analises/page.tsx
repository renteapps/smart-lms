import { AnalyticsHubView } from "@/components/admin/analytics/AnalyticsHubView";
import { getAnalyticsOverview, getCoursesAnalytics, getSalesAnalytics, getAgentsAnalytics, getSubscriptionsAnalytics, getStudentsAnalytics } from "./actions";
import { MOCK_ANALYTICS_CARDS } from "@/lib/mocks/analyticsMocks";

export default async function AdminAnalyticsPage() {
  const [overviewData, coursesData, salesData, agentsData, subsData, studentsData] = await Promise.all([
    getAnalyticsOverview(),
    getCoursesAnalytics(),
    getSalesAnalytics(),
    getAgentsAnalytics(),
    getSubscriptionsAnalytics(),
    getStudentsAnalytics(),
  ]);

  const cardsData = MOCK_ANALYTICS_CARDS.map(card => {
    // Clone para evitar mutação
    const updatedCard = { ...card };
    
    if (card.id === "cursos") {
      updatedCard.badgeText = `${coursesData.kpis.totalCourses} Cursos Ativos`;
      updatedCard.metrics = [
        { label: "Conclusão Média", value: `${coursesData.kpis.completionRate}%` },
        { label: "Horas Assistidas", value: `${(coursesData.kpis.totalWatchHours / 1000).toFixed(1)}k h` },
        { label: "Matrículas Ativas", value: `${coursesData.kpis.activeEnrollments}` },
      ];
    } else if (card.id === "vendas") {
      updatedCard.badgeText = `R$ ${salesData.kpis.grossRevenue.toLocaleString("pt-BR")} no mês`;
      updatedCard.metrics = [
        { label: "Faturamento", value: `R$ ${salesData.kpis.grossRevenue.toLocaleString("pt-BR")}` },
        { label: "Ticket Médio", value: `R$ ${salesData.kpis.averageTicket.toFixed(0)}` },
        { label: "Vendas Concluídas", value: `${salesData.kpis.ordersCount}` },
      ];
    } else if (card.id === "agentes") {
      updatedCard.badgeText = `${agentsData.kpis.totalSessions} Conversas`;
      updatedCard.metrics = [
        { label: "Sessões Ativas", value: `${agentsData.kpis.totalSessions}` },
        { label: "Mensagens", value: `${agentsData.kpis.totalMessages}` },
        { label: "Agentes Ativos", value: `${agentsData.kpis.activeAgentsCount}` },
      ];
    } else if (card.id === "assinaturas") {
      updatedCard.badgeText = `${subsData.kpis.activeMembers} Assinantes`;
      updatedCard.metrics = [
        { label: "MRR Atual", value: `R$ ${subsData.kpis.mrr.toLocaleString("pt-BR")}` },
        { label: "ARR Estimado", value: `R$ ${subsData.kpis.arr.toLocaleString("pt-BR")}` },
        { label: "Taxa de Churn", value: `${subsData.kpis.churnRate}%` },
      ];
    } else if (card.id === "alunos") {
      updatedCard.badgeText = `${studentsData.kpis.totalStudents} Cadastrados`;
      updatedCard.metrics = [
        { label: "Total Alunos", value: `${studentsData.kpis.totalStudents}` },
        { label: "Retenção 30d", value: `${studentsData.kpis.retention30d}%` },
        { label: "NPS", value: `+${studentsData.kpis.npsScore}` },
      ];
    }
    
    return updatedCard;
  });

  return <AnalyticsHubView basePath="/admin/analises" overviewData={overviewData} cardsData={cardsData} />;
}
