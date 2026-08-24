import { requireAdmin } from "@/lib/supabase/auth";
import { getAvailableCourses, getAvailablePlans } from "@/lib/data/agentAccess";
import NewProfileTestClient from "./NewProfileTestClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Novo Teste de Perfil",
  description: "Crie um novo teste de perfil",
};

export default async function NewProfileTestPage() {
  const { adminClient } = await requireAdmin();
  const [courses, plans] = await Promise.all([
    getAvailableCourses(adminClient),
    getAvailablePlans(adminClient)
  ]);

  return <NewProfileTestClient courses={courses} plans={plans} />;
}
