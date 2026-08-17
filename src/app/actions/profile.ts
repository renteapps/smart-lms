"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import type { ProfileTestResult } from "@/lib/data/profileTests";
import type { ActionResult } from "./progress";

export type ProfileUpdate = {
  fullName?: string;
  username?: string;
  avatarUrl?: string;
  headline?: string;
  bio?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  careerRole?: string;
  location?: string;
  preferences?: Record<string, unknown>;
};

export async function updateProfile(update: ProfileUpdate): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const payload: Record<string, unknown> = {};
    const set = (key: string, value: unknown) => {
      if (value !== undefined) payload[key] = value === "" ? null : value;
    };

    set("full_name", update.fullName);
    set("username", update.username);
    set("avatar_url", update.avatarUrl);
    set("headline", update.headline);
    set("bio", update.bio);
    set("phone", update.phone);
    set("birth_date", update.birthDate);
    set("gender", update.gender);
    set("career_role", update.careerRole);
    set("location", update.location);
    set("preferences", update.preferences);

    if (Object.keys(payload).length === 0) return { success: true };

    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    if (error) return { success: false, message: error.message };

    revalidatePath("/perfil");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/** Registra o último acesso — chamado uma vez por sessão. */
export async function touchLastAccess(): Promise<void> {
  try {
    const { supabase, user } = await requireUser();
    await supabase
      .from("profiles")
      .update({ last_access_at: new Date().toISOString() })
      .eq("id", user.id);
  } catch {
    // Registro de presença não pode atrapalhar a navegação.
  }
}

/** Um resultado por teste: refazer substitui o anterior. */
export async function saveProfileTestResult(result: ProfileTestResult): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("profile_test_results").upsert(
      {
        test_id: result.testId,
        user_id: user.id,
        test_title: result.testTitle,
        category_id: result.categoryId,
        category_name: result.categoryName,
        scores: result.scores,
        completed_at: result.completedAt,
      },
      { onConflict: "test_id,user_id" },
    );

    if (error) return { success: false, message: error.message };

    revalidatePath("/perfil");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
