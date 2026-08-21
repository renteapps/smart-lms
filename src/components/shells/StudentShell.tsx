import { RouteShell } from "@/components/RouteShell";
import { StudentProviders } from "@/components/providers/StudentProviders";
import { getNavigationConfig } from "@/lib/data/navigation";
import { createClient } from "@/lib/supabase/server";

export async function StudentShell({ children }: { children: React.ReactNode }) {
  /*
   * O menu vem do banco, e `NavBar`/`Footer` são client: a busca precisa
   * acontecer aqui, no último componente de servidor antes do shell.
   */
  const navigation = await getNavigationConfig(await createClient());

  return (
    <StudentProviders>
      <RouteShell navigation={navigation}>{children}</RouteShell>
    </StudentProviders>
  );
}
