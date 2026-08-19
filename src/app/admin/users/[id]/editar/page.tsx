import { getProfile } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import EditUserForm from "./EditUserForm";

export default async function AdminUserEditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getProfile(supabase, id);

  if (!profile) {
    notFound();
  }

  return <EditUserForm profile={profile} />;
}
