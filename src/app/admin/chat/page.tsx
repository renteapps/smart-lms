import { PageHeader } from "@/components/ui/editorial";
import { requireAdmin } from "@/lib/supabase/auth";
import {
  PLATFORM_ASSISTANT_MODELS,
  getAdminAssistantHistory,
  getPlatformAssistantSettings,
} from "@/lib/platformAssistant";
import { ChatAdminClient } from "./ChatAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  const { adminClient } = await requireAdmin();
  const [settings, conversations] = await Promise.all([
    getPlatformAssistantSettings(adminClient),
    getAdminAssistantHistory(adminClient),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Plataforma"
        title="Assistente IA"
        description="Configure a identidade, o conhecimento autorizado e revise as conversas do assistente fixo."
      />
      <ChatAdminClient settings={settings} conversations={conversations} models={PLATFORM_ASSISTANT_MODELS} />
    </div>
  );
}
