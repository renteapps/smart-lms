import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/auth";
import { getPageBuilderAdminData, getPageDraft } from "@/lib/data/pages";
import { PAGE_KEYS } from "@/lib/pageBuilder";
import type { PageKey } from "@/types/pageBuilder";
import { PageBuilderEditor } from "../PageBuilderEditor";

function isPageKey(value: string): value is PageKey {
  return PAGE_KEYS.includes(value as PageKey);
}

export default async function AdminPageEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isPageKey(id)) notFound();

  const { adminClient } = await requireAdmin();
  const [draft, catalog] = await Promise.all([
    getPageDraft(adminClient, id),
    getPageBuilderAdminData(adminClient),
  ]);

  return <PageBuilderEditor pageKey={id} initialDraft={draft} catalog={catalog} />;
}
