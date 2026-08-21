import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profiles";
import { ConfigForm } from "./ConfigForm";

export default async function AdminUserConfiguracoesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getProfile(supabase, id);

  if (!profile) {
    notFound();
  }

  return (
    <ConfigForm 
      userId={profile.id} 
      email={profile.email}
      initialStatus={profile.status || "active"} 
      initialRole={profile.role || "student"} 
    />
  );
}
