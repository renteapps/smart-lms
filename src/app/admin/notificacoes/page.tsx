import NotificacoesClient from "./NotificacoesClient";
import { getNotificationCampaigns, getAutomations } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminNotificacoesPage() {
  const campaigns = await getNotificationCampaigns();
  const automations = await getAutomations();
  return <NotificacoesClient initialCampaigns={campaigns} initialAutomations={automations} />;
}
