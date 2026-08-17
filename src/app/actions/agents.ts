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

  const currentCredits = await getAiCredits();
  if (currentCredits <= 0) {
    return { success: false, creditsRemaining: 0 };
  }

  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .update({ ai_credits: currentCredits - 1 })
    .eq("id", user.id)
    .select("ai_credits")
    .single();

  if (error || !updatedProfile) {
    return { success: false, creditsRemaining: currentCredits };
  }

  return { success: true, creditsRemaining: updatedProfile.ai_credits };
}
