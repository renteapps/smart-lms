import { requireAdmin } from "@/lib/supabase/auth";
import { getPageBuilderAdminData, getPageDraft } from "@/lib/data/pages";
import { PageBuilderEditor } from "./PageBuilderEditor";

export default async function AdminPagesPage() {
  const { adminClient } = await requireAdmin();
  const [publicHome, noProducts, catalog] = await Promise.all([
    getPageDraft(adminClient, "public-home"),
    getPageDraft(adminClient, "no-products"),
    getPageBuilderAdminData(adminClient),
  ]);

  return <PageBuilderEditor initialDrafts={{ "public-home": publicHome, "no-products": noProducts }} catalog={catalog} />;
}
