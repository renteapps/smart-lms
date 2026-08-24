import { requireAdmin } from "@/lib/supabase/auth";
import { getProfileTests } from "@/lib/data/profileTests";
import { AdminTestesPerfilClient } from "./AdminTestesPerfilClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Testes de Perfil",
  description: "Crie testes comportamentais e diagnósticos",
};

export default async function ProfileTestsAdminPage() {
  const { adminClient } = await requireAdmin();
  const tests = await getProfileTests(adminClient);

  return <AdminTestesPerfilClient initialTests={tests} />;
}
