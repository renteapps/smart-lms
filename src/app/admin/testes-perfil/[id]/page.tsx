import { requireAdmin } from "@/lib/supabase/auth";
import { getProfileTestById } from "@/lib/data/profileTests";
import { getAvailableCourses, getAvailablePlans } from "@/lib/data/agentAccess";
import { notFound } from "next/navigation";
import { EditProfileTestClient } from "./EditProfileTestClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Editar Teste de Perfil",
  description: "Edite um teste de perfil existente",
};

export default async function EditProfileTestPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  if (resolvedParams.id === "novo") {
    return notFound();
  }

  const { adminClient } = await requireAdmin();
  const [test, courses, plans] = await Promise.all([
    getProfileTestById(adminClient, resolvedParams.id),
    getAvailableCourses(adminClient),
    getAvailablePlans(adminClient)
  ]);

  console.log("DEBUG: EditProfileTestPage params.id =", resolvedParams.id, "test found =", !!test);

  if (!test) {
    return notFound();
  }

  return <EditProfileTestClient initialTest={test} courses={courses} plans={plans} />;
}
