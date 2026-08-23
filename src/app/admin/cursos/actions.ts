"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateCourseOrder(courseId: string, orderIndex: number) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("courses")
    .update({ order_index: orderIndex })
    .eq("id", courseId);

  if (error) {
    console.error("Error updating course order:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/cursos");
  revalidatePath("/cursos");
  revalidatePath("/");
  return { success: true };
}

export async function toggleCourseFeatured(courseId: string, isFeatured: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("courses")
    .update({ is_featured: isFeatured })
    .eq("id", courseId);

  if (error) {
    console.error("Error toggling course featured:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/cursos");
  revalidatePath("/");
  return { success: true };
}

export async function updateCoursesOrderBulk(updates: { id: string, orderIndex: number }[]) {
  const supabase = await createClient();

  // Supabase doesn't have a single bulk update method out of the box for different values unless we do an upsert or multiple calls.
  // Using Promise.all for updates is fine for small lists (like 10-50 courses).
  const promises = updates.map(update => 
    supabase
      .from("courses")
      .update({ order_index: update.orderIndex })
      .eq("id", update.id)
  );

  const results = await Promise.all(promises);

  const hasError = results.some(r => r.error);

  if (hasError) {
    console.error("Error in bulk updating course order");
    return { success: false, error: "Falha ao atualizar a ordem." };
  }

  revalidatePath("/admin/cursos");
  revalidatePath("/cursos");
  revalidatePath("/");
  return { success: true };
}
