import { createClient } from "@/lib/supabase/server";

export async function checkAvailableSeats(organizationId: string): Promise<number> {
  const supabase = await createClient();
  
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("max_seats")
    .eq("id", organizationId)
    .single();

  if (orgError || !org) {
    console.error("Erro ao buscar organização:", orgError);
    return 0;
  }

  const { count, error: countError } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (countError) {
    console.error("Erro ao contar membros:", countError);
    return 0;
  }

  return Math.max(0, org.max_seats - (count || 0));
}

export async function hasAvailableSeats(organizationId: string): Promise<boolean> {
  const available = await checkAvailableSeats(organizationId);
  return available > 0;
}
