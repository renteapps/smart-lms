"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export async function getAiCredits(): Promise<number> {
  const supabase = await getSupabase();
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
  const supabase = await getSupabase();
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
