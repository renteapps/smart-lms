"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/supabase/auth";
import { toDbRole } from "@/lib/data/business";
import type { Company, MemberRole } from "@/types/business";
import type { Plan } from "@/lib/data/plans";
import type { ActionResult } from "../progress";

type Saved<T> = { success: boolean; message?: string; data?: T };

// ---------------------------------------------------------------------------
// Empresas
// ---------------------------------------------------------------------------

export type CompanyInput = Partial<Company> & { id?: string };

export async function saveCompany(input: CompanyInput): Promise<Saved<{ id: string }>> {
  try {
    const { adminClient } = await requireAdmin();

    const row: Record<string, unknown> = {};
    const set = (key: string, value: unknown) => {
      if (value !== undefined) row[key] = value;
    };

    set("name", input.name);
    set("trade_name", input.tradeName);
    set("document", input.cnpj);
    set("logo_url", input.logoUrl);
    set("auto_domain_approval", input.autoDomainApproval);
    set("manager_name", input.managerName);
    set("manager_email", input.managerEmail);
    set("manager_phone", input.managerPhone);
    set("max_seats", input.seatsTotal);
    set("plan_type", input.planType);
    set("status", input.status);
    set("contract_start", input.contractStart || null);
    set("contract_end", input.contractEnd || null);
    set("contract_value", input.contractValue);
    set("departments", input.departments);
    if (input.domain !== undefined) row.allowed_domains = input.domain ? [input.domain] : [];
    if (input.tradeName && !input.id) row.slug = slugify(input.tradeName);

    const query = input.id
      ? adminClient.from("organizations").update(row).eq("id", input.id).select("id").single()
      : adminClient.from("organizations").insert(row).select("id").single();

    const { data, error } = await query;
    if (error) return { success: false, message: error.message };

    // Cursos liberados no contrato viram trilhas da organização.
    if (input.allowedCourseIds) {
      await adminClient.from("organization_tracks").delete().eq("organization_id", data.id);
      if (input.allowedCourseIds.length > 0) {
        await adminClient.from("organization_tracks").insert(
          input.allowedCourseIds.map((courseId) => ({
            organization_id: data.id,
            course_id: courseId,
          })),
        );
      }
    }

    revalidatePath("/admin/business");
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function deleteCompany(id: string): Promise<ActionResult> {
  try {
    const { adminClient } = await requireAdmin();
    const { error } = await adminClient.from("organizations").delete().eq("id", id);
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/business");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Convites e membros
// ---------------------------------------------------------------------------

/**
 * Convida alguém para a empresa.
 *
 * O assento é conferido antes de gravar: um convite pendente já ocupa vaga, do
 * contrário uma leva de convites estouraria o contrato sem ninguém perceber.
 */
export async function inviteMember(
  companyId: string,
  input: { email: string; name?: string; department?: string; role: MemberRole },
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const [{ data: company }, { count: used }] = await Promise.all([
      supabase.from("organizations").select("max_seats").eq("id", companyId).maybeSingle(),
      supabase
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", companyId)
        .neq("status", "disabled"),
    ]);

    const { count: pending } = await supabase
      .from("organization_invites")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", companyId)
      .eq("status", "pending");

    const occupied = (used ?? 0) + (pending ?? 0);
    if (company && occupied >= (company.max_seats ?? 0)) {
      return { success: false, message: "Não há assentos disponíveis no contrato." };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const { error } = await supabase.from("organization_invites").insert({
      organization_id: companyId,
      email: input.email.trim().toLowerCase(),
      full_name: input.name ?? null,
      department: input.department ?? null,
      role: toDbRole(input.role),
      token: crypto.randomUUID(),
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    });

    if (error) return { success: false, message: error.message };

    revalidatePath("/empresa/gestao");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function bulkInviteMembers(
  companyId: string,
  members: { email: string; name?: string; department?: string; jobTitle?: string }[]
): Promise<{ success: boolean; addedCount: number; errors: string[] }> {
  const result = { success: false, addedCount: 0, errors: [] as string[] };
  try {
    const { supabase, user } = await requireUser();

    const [{ data: company }, { count: used }] = await Promise.all([
      supabase.from("organizations").select("max_seats").eq("id", companyId).maybeSingle(),
      supabase
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", companyId)
        .neq("status", "disabled"),
    ]);

    const { count: pending } = await supabase
      .from("organization_invites")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", companyId)
      .eq("status", "pending");

    const occupied = (used ?? 0) + (pending ?? 0);
    const maxSeats = company?.max_seats ?? 0;
    const available = maxSeats - occupied;

    if (available <= 0) {
      result.errors.push("Não há assentos disponíveis no contrato.");
      return result;
    }

    const toProcess = members.slice(0, available);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const rows = toProcess.map(m => ({
      organization_id: companyId,
      email: m.email.trim().toLowerCase(),
      full_name: m.name ?? null,
      department: m.department ?? null,
      role: "member",
      token: crypto.randomUUID(),
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    }));

    const { error } = await supabase.from("organization_invites").insert(rows);

    if (error) {
      result.errors.push(error.message);
      return result;
    }

    result.success = true;
    result.addedCount = toProcess.length;

    revalidatePath("/empresa/gestao");
    return result;
  } catch (error) {
    result.errors.push((error as Error).message);
    return result;
  }
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("organization_invites")
      .update({ status: "revoked" })
      .eq("id", inviteId);

    if (error) return { success: false, message: error.message };

    revalidatePath("/empresa/gestao");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function resendInvite(inviteId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const { error } = await supabase
      .from("organization_invites")
      .update({
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", inviteId);

    if (error) return { success: false, message: error.message };

    revalidatePath("/empresa/gestao");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function updateMember(
  memberId: string,
  updates: { role?: MemberRole; department?: string; jobTitle?: string; status?: string; notes?: string },
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();

    const row: Record<string, unknown> = {};
    if (updates.role) row.role = toDbRole(updates.role);
    if (updates.department !== undefined) row.department = updates.department;
    if (updates.jobTitle !== undefined) row.job_title = updates.jobTitle;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.notes !== undefined) row.notes = updates.notes;

    const { error } = await supabase.from("organization_members").update(row).eq("id", memberId);
    if (error) return { success: false, message: error.message };

    revalidatePath("/empresa/gestao");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
    if (error) return { success: false, message: error.message };

    revalidatePath("/empresa/gestao");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/** Atribui cursos a um membro e o matricula de fato, se ele já tem conta. */
export async function assignCoursesToMember(
  memberId: string,
  courseIds: string[],
): Promise<ActionResult> {
  try {
    const { supabase } = await requireUser();

    await supabase.from("organization_member_courses").delete().eq("member_id", memberId);

    if (courseIds.length > 0) {
      const { error } = await supabase.from("organization_member_courses").insert(
        courseIds.map((courseId) => ({ member_id: memberId, course_id: courseId })),
      );
      if (error) return { success: false, message: error.message };

      const { data: member } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("id", memberId)
        .maybeSingle();

      if (member?.user_id) {
        await supabase.from("enrollments").upsert(
          courseIds.map((courseId) => ({
            user_id: member.user_id,
            course_id: courseId,
            status: "active",
          })),
          { onConflict: "user_id,course_id" },
        );
      }
    }

    revalidatePath("/empresa/gestao");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/** Atribui cursos a todos os membros de um departamento. */
export async function assignCoursesToDepartment(
  companyId: string,
  department: string,
  courseIds: string[],
): Promise<ActionResult & { affectedMembersCount?: number }> {
  try {
    const { supabase } = await requireUser();

    const { data: members, error: membersError } = await supabase
      .from("organization_members")
      .select("id, user_id")
      .eq("organization_id", companyId)
      .eq("department", department)
      .neq("status", "disabled");

    if (membersError) return { success: false, message: membersError.message };
    if (!members || members.length === 0) return { success: true, affectedMembersCount: 0 };

    const memberIds = members.map((m) => m.id);

    await supabase.from("organization_member_courses").delete().in("member_id", memberIds);

    if (courseIds.length > 0) {
      const rows = [];
      for (const mId of memberIds) {
        for (const cId of courseIds) {
          rows.push({ member_id: mId, course_id: cId });
        }
      }
      
      const { error } = await supabase.from("organization_member_courses").insert(rows);
      if (error) return { success: false, message: error.message };

      const userIds = members.map((m) => m.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const enrollments = [];
        for (const uId of userIds) {
          for (const cId of courseIds) {
            enrollments.push({ user_id: uId, course_id: cId, status: "active" });
          }
        }
        await supabase.from("enrollments").upsert(enrollments, { onConflict: "user_id,course_id" });
      }
    }

    revalidatePath("/empresa/gestao");
    return { success: true, affectedMembersCount: members.length };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Planos
// ---------------------------------------------------------------------------

export async function savePlan(input: Partial<Plan> & { id?: string }): Promise<Saved<{ id: string }>> {
  try {
    const { adminClient } = await requireAdmin();

    const row: Record<string, unknown> = {};
    const set = (key: string, value: unknown) => {
      if (value !== undefined) row[key] = value;
    };

    set("name", input.name);
    set("slug", input.slug);
    set("description", input.description);
    set("price", input.price);
    set("frequency", input.frequency);
    set("seats", input.seats);
    set("features", input.features);
    set("is_b2b", input.isB2B);
    set("is_active", input.isActive);
    set("is_highlighted", input.isHighlighted);
    set("gateway_product_id", input.gatewayProductId);
    set("order_index", input.orderIndex);

    const query = input.id
      ? adminClient.from("plans").update(row).eq("id", input.id).select("id").single()
      : adminClient.from("plans").insert(row).select("id").single();

    const { data, error } = await query;
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/planos");
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function deletePlan(id: string): Promise<ActionResult> {
  try {
    const { adminClient } = await requireAdmin();
    const { error } = await adminClient.from("plans").delete().eq("id", id);
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/planos");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Ajustes e integrações
// ---------------------------------------------------------------------------

export async function saveSetting(key: string, value: unknown): Promise<ActionResult> {
  try {
    const { adminClient } = await requireAdmin();
    const { error } = await adminClient
      .from("app_settings")
      .upsert({ key, value }, { onConflict: "key" });

    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/ajustes");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Guarda a configuração de uma integração.
 *
 * `secrets` só é tocado quando vem preenchido: salvar o formulário sem redigitar
 * a chave não pode apagá-la — é o erro clássico de tela de integração.
 */
export async function saveIntegration(
  slug: string,
  input: { name?: string; enabled?: boolean; config?: Record<string, unknown>; secrets?: Record<string, unknown>; status?: string },
): Promise<ActionResult> {
  try {
    const { adminClient } = await requireAdmin();

    const row: Record<string, unknown> = { slug };
    if (input.name !== undefined) row.name = input.name;
    if (input.enabled !== undefined) row.enabled = input.enabled;
    if (input.config !== undefined) row.config = input.config;
    if (input.status !== undefined) row.status = input.status;
    if (input.secrets && Object.keys(input.secrets).length > 0) row.secrets = input.secrets;

    const { error } = await adminClient.from("integrations").upsert(row, { onConflict: "slug" });
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/integracoes");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function saveEmailTemplate(
  type: string,
  input: { name: string; description?: string; category?: string; subject: string; previewText: string; html: string },
): Promise<ActionResult> {
  try {
    const { adminClient } = await requireAdmin();

    const { error } = await adminClient.from("email_templates").upsert(
      {
        type,
        name: input.name,
        description: input.description ?? "",
        category: input.category ?? "platform",
        subject: input.subject,
        preview_text: input.previewText,
        html: input.html,
        is_customized: true,
      },
      { onConflict: "type" },
    );

    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/emails");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function resetEmailTemplate(type: string): Promise<ActionResult> {
  try {
    const { adminClient } = await requireAdmin();
    const { error } = await adminClient.from("email_templates").delete().eq("type", type);
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/emails");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
