import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProviders } from "@/components/providers/AdminProviders";
import { requireAdmin } from "@/lib/supabase/auth";

/**
 * Defesa em profundidade: o proxy já barra não-admins, mas layouts não
 * re-renderizam em navegação client-side, então a autorização de verdade
 * continua sendo o `requireAdmin()` em cada página e server action.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch {
    redirect("/?blocked_reason=not_admin");
  }

  return <AdminProviders><AdminShell>{children}</AdminShell></AdminProviders>;
}
