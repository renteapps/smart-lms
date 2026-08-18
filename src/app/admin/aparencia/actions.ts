"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveAppearance(formData: FormData) {
  const supabase = await createClient();

  const appearanceData = {
    platformName: formData.get("platformName"),
    slogan: formData.get("slogan"),
    primaryColor: formData.get("primaryColor"),
    theme: formData.get("theme"),
  };

  const { error } = await supabase
    .from("app_settings")
    .upsert({
      key: "appearance",
      value: appearanceData,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/aparencia");
  return { success: true };
}
