"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { calculateExpiresAt, type ExpirationOption } from "@/lib/enrollmentUtils";

export type { ExpirationOption };

export interface CreateEnrollmentInput {
  userId: string;
  courseId: string;
  expirationType: ExpirationOption;
  customDate?: string | null;
}

export interface UpdateEnrollmentInput {
  enrollmentId: string;
  userId: string;
  expirationType: ExpirationOption;
  customDate?: string | null;
  status?: "active" | "inactive" | "completed";
}

export interface DeleteEnrollmentInput {
  enrollmentId: string;
  userId: string;
}

export type EnrollmentResult<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

/**
 * Cria ou atualiza a matrícula de um usuário em um curso com prazo determinado ou indeterminado.
 */
export async function createEnrollment(input: CreateEnrollmentInput): Promise<EnrollmentResult> {
  try {
    const { adminClient } = await requireAdmin();

    if (!input.userId || !input.courseId) {
      return { success: false, message: "Usuário e curso são obrigatórios." };
    }

    const expiresAt = calculateExpiresAt(input.expirationType, input.customDate);

    const { data, error } = await adminClient
      .from("enrollments")
      .upsert(
        {
          user_id: input.userId,
          course_id: input.courseId,
          status: "active",
          enrolled_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: "user_id,course_id" }
      )
      .select("id, user_id, course_id, enrolled_at, expires_at, status")
      .single();

    if (error) {
      return { success: false, message: `Erro ao matricular: ${error.message}` };
    }

    revalidatePath(`/admin/users/${input.userId}/matriculas`);
    revalidatePath(`/admin/users/${input.userId}`);
    revalidatePath("/admin/users");
    revalidatePath(`/admin/cursos/${input.courseId}`);
    revalidatePath("/cursos");

    return { success: true, data };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Atualiza o prazo de vigência ou status de uma matrícula existente.
 */
export async function updateEnrollmentExpiration(
  input: UpdateEnrollmentInput
): Promise<EnrollmentResult> {
  try {
    const { adminClient } = await requireAdmin();

    if (!input.enrollmentId) {
      return { success: false, message: "ID da matrícula é obrigatório." };
    }

    const expiresAt = calculateExpiresAt(input.expirationType, input.customDate);

    const payload: { expires_at: string | null; status?: string } = {
      expires_at: expiresAt,
    };

    if (input.status) {
      payload.status = input.status;
    } else {
      payload.status = "active";
    }

    const { data, error } = await adminClient
      .from("enrollments")
      .update(payload)
      .eq("id", input.enrollmentId)
      .select("id, user_id, course_id, enrolled_at, expires_at, status")
      .single();

    if (error) {
      return { success: false, message: `Erro ao atualizar validade: ${error.message}` };
    }

    revalidatePath(`/admin/users/${input.userId}/matriculas`);
    revalidatePath(`/admin/users/${input.userId}`);
    revalidatePath("/admin/users");
    revalidatePath("/cursos");

    return { success: true, data };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Revoga / remove a matrícula de um usuário.
 */
export async function deleteEnrollment(input: DeleteEnrollmentInput): Promise<EnrollmentResult> {
  try {
    const { adminClient } = await requireAdmin();

    if (!input.enrollmentId) {
      return { success: false, message: "ID da matrícula é obrigatório." };
    }

    const { error } = await adminClient
      .from("enrollments")
      .delete()
      .eq("id", input.enrollmentId);

    if (error) {
      return { success: false, message: `Erro ao revogar matrícula: ${error.message}` };
    }

    revalidatePath(`/admin/users/${input.userId}/matriculas`);
    revalidatePath(`/admin/users/${input.userId}`);
    revalidatePath("/admin/users");
    revalidatePath("/cursos");

    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
