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
  enrollmentId?: string;
  userId: string;
  courseId?: string;
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
    if (!input.userId || !input.courseId) {
      return { success: false, message: "Usuário e curso são obrigatórios." };
    }

    const { supabase, adminClient } = await requireAdmin();
    const client = adminClient || supabase;

    const expiresAt = calculateExpiresAt(input.expirationType, input.customDate);

    const { data, error } = await client
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
    revalidatePath(`/cursos/${input.courseId}`);
    revalidatePath(`/courses/${input.courseId}`);
    revalidatePath("/cursos");
    revalidatePath("/aluno/cursos");
    revalidatePath("/aluno");
    revalidatePath("/");

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
    if (!input.enrollmentId) {
      return { success: false, message: "ID da matrícula é obrigatório." };
    }

    const { supabase, adminClient } = await requireAdmin();
    const client = adminClient || supabase;

    const expiresAt = calculateExpiresAt(input.expirationType, input.customDate);

    const payload: { expires_at: string | null; status?: string } = {
      expires_at: expiresAt,
    };

    if (input.status) {
      payload.status = input.status;
    } else {
      payload.status = "active";
    }

    const { data, error } = await client
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
    if (data?.course_id) {
      revalidatePath(`/admin/cursos/${data.course_id}`);
      revalidatePath(`/cursos/${data.course_id}`);
      revalidatePath(`/courses/${data.course_id}`);
    }
    revalidatePath("/cursos");
    revalidatePath("/aluno/cursos");
    revalidatePath("/aluno");
    revalidatePath("/");

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
    if (!input.enrollmentId && !(input.userId && input.courseId)) {
      return { success: false, message: "ID da matrícula é obrigatório." };
    }

    const { supabase, adminClient } = await requireAdmin();
    const client = adminClient || supabase;

    let deletedRows: Array<{ id: string; user_id: string; course_id: string }> = [];

    // 1. Tenta deletar por ID de matrícula se fornecido
    if (input.enrollmentId) {
      const { data, error } = await client
        .from("enrollments")
        .delete()
        .eq("id", input.enrollmentId)
        .select("id, user_id, course_id");

      if (error) {
        return { success: false, message: `Erro ao revogar matrícula: ${error.message}` };
      }
      if (data && data.length > 0) {
        deletedRows = data as Array<{ id: string; user_id: string; course_id: string }>;
      }
    }

    // 2. Se não deletou por ID e temos userId + courseId, tenta deletar pela chave composta
    if (deletedRows.length === 0 && input.userId && input.courseId) {
      const { data, error } = await client
        .from("enrollments")
        .delete()
        .eq("user_id", input.userId)
        .eq("course_id", input.courseId)
        .select("id, user_id, course_id");

      if (error) {
        return { success: false, message: `Erro ao revogar matrícula: ${error.message}` };
      }
      if (data && data.length > 0) {
        deletedRows = data as Array<{ id: string; user_id: string; course_id: string }>;
      }
    }

    const targetUserId = input.userId || deletedRows[0]?.user_id;
    const targetCourseId = input.courseId || deletedRows[0]?.course_id;

    // 3. Se o usuário estiver vinculado a uma organização, limpa também a atribuição corporativa do curso
    if (targetUserId && targetCourseId) {
      try {
        const { data: member } = await client
          .from("organization_members")
          .select("id")
          .eq("user_id", targetUserId)
          .maybeSingle();

        if (member?.id) {
          await client
            .from("organization_member_courses")
            .delete()
            .eq("member_id", member.id)
            .eq("course_id", targetCourseId);
        }
      } catch (orgErr) {
        console.warn("Aviso ao sincronizar cancelamento na organização:", orgErr);
      }
    }

    if (targetUserId) {
      revalidatePath(`/admin/users/${targetUserId}/matriculas`);
      revalidatePath(`/admin/users/${targetUserId}`);
      revalidatePath(`/admin/users/${targetUserId}/historico`);
    }
    revalidatePath("/admin/users");
    if (targetCourseId) {
      revalidatePath(`/admin/cursos/${targetCourseId}`);
      revalidatePath(`/cursos/${targetCourseId}`);
      revalidatePath(`/courses/${targetCourseId}`);
    }
    revalidatePath("/cursos");
    revalidatePath("/aluno/cursos");
    revalidatePath("/aluno");
    revalidatePath("/");

    return { success: true, message: "Matrícula revogada com sucesso." };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
