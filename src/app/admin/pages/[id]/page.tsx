import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/auth";
import { getPageBuilderAdminData, getPageDraft, getPageRegistryEntry } from "@/lib/data/pages";
import { isSystemPageKey, SYSTEM_PAGE_LABELS } from "@/lib/pageBuilder";
import { PageBuilderEditor } from "../PageBuilderEditor";

export default async function AdminPageEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { adminClient } = await requireAdmin();

  const entry = await getPageRegistryEntry(adminClient, id);
  if (!entry) notFound();

  const pageLabel = isSystemPageKey(id)
    ? SYSTEM_PAGE_LABELS[id]
    : { title: entry.title, description: entry.description ?? "" };

  const [draft, catalog] = await Promise.all([
    getPageDraft(adminClient, id),
    getPageBuilderAdminData(adminClient),
  ]);

  return <PageBuilderEditor pageKey={id} pageLabel={pageLabel} initialDraft={draft} catalog={catalog} />;
}
