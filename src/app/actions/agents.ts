"use server";

import { createClient } from "@/lib/supabase/server";
import { getAiCreditBalance } from "@/lib/aiCredits";

export async function getAiCredits(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return 0;

  const balance = await getAiCreditBalance(supabase);
  return balance?.availableCredits ?? 0;
}
