"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAiCredits(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return 0;

  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_credits")
    .eq("id", user.id)
    .single();

  return profile?.ai_credits ?? 0;
}

export async function decrementAiCredits(): Promise<{ success: boolean; creditsRemaining: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, creditsRemaining: 0 };

  const { data, error } = await supabase.rpc("consume_ai_credit");
  const creditsRemaining = typeof data === "number" ? data : Number(data);
  if (error || !Number.isFinite(creditsRemaining) || creditsRemaining < 0) {
    return { success: false, creditsRemaining: 0 };
  }
  return { success: true, creditsRemaining };
}
