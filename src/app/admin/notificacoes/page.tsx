import NotificacoesClient from "./NotificacoesClient";
import { getNotificationCampaigns, getAutomations } from "./actions";

export const dynamic = "force-dynamic";
// A Server Action de campanha envia os e-mails no próprio request (lotes de 100
// com pausa entre eles); o limite padrão cortaria campanhas grandes no meio.
export const maxDuration = 300;

export default async function AdminNotificacoesPage() {
  const campaigns = await getNotificationCampaigns();
  const automations = await getAutomations();
  return <NotificacoesClient initialCampaigns={campaigns} initialAutomations={automations} />;
}
