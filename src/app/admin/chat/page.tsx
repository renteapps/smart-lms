import { PageHeader } from "@/components/ui/editorial";
import { requireAdmin } from "@/lib/supabase/auth";
import { listCoursesShallow } from "@/lib/data/courses";
import {
  PLATFORM_ASSISTANT_MODELS,
  getAdminAssistantHistory,
  getAssistantCourseRules,
  getPlatformAssistantSettings,
} from "@/lib/platformAssistant";
import { ChatAdminClient } from "./ChatAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  const { adminClient } = await requireAdmin();
  const [settings, conversations, courses, courseRules] = await Promise.all([
    getPlatformAssistantSettings(adminClient),
    getAdminAssistantHistory(adminClient),
    listCoursesShallow(adminClient),
    getAssistantCourseRules(adminClient),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Plataforma"
        title="Assistente IA"
        description="Configure a identidade, o alcance do conhecimento e revise as conversas do assistente fixo."
      />
      <ChatAdminClient
        settings={settings}
        conversations={conversations}
        models={PLATFORM_ASSISTANT_MODELS}
        courses={courses.map((course) => ({ id: course.id, title: course.title, category: course.category }))}
        courseRules={courseRules}
      />
    </div>
  );
}
