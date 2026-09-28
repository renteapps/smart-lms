import { PageHeader } from "@/components/ui/editorial";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminUsers,
  getAdminUsersMetrics,
  getAdminUsersFilterOptions,
  normalizeAdminUserFilters,
} from "@/lib/data/usersAdmin";
import { AdminUsersClient } from "./AdminUsersClient";

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const filters = normalizeAdminUserFilters(rawParams);

  const supabase = await createClient();

  const [{ users, totalCount, totalPages }, metrics, filterOptions] = await Promise.all([
    getAdminUsers(supabase, filters),
    getAdminUsersMetrics(supabase),
    getAdminUsersFilterOptions(supabase),
  ]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Pessoas"
        title="Usuários"
        description="Acompanhe acesso, papel, matrículas e assinaturas das pessoas na plataforma."
      />

      <AdminUsersClient
        users={users}
        metrics={metrics}
        filterOptions={filterOptions}
        currentFilters={filters}
        totalCount={totalCount}
        totalPages={totalPages}
      />
    </div>
  );
}
