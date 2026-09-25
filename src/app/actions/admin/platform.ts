"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin, requireUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import type { DB } from "@/lib/data/types";
import { grantOrgEnrollments, orgAllowedCourseIds, revokeOrgEnrollments } from "@/lib/data/orgCourseAccess";
import { toDbRole } from "@/lib/data/business";
import type { Company, MemberRole } from "@/types/business";
import type { Plan } from "@/lib/data/plans";
import type { ActionResult } from "../progress";
import { resolveAppOrigin } from "@/lib/auth/accessLink";
import { sendConfiguredEmailBatch } from "@/lib/resendServer";

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

type SessionClient = Awaited<ReturnType<typeof requireUser>>["supabase"];

/**
 * Gestor da organização (ou admin da plataforma). As actions abaixo recebem
 * ids do cliente; sem esta checagem só a RLS separava um aluno qualquer de
 * convidar, remover ou matricular gente em organizações alheias.
 */
async function requireOrgManager(companyId: string) {
  const session = await requireUser();
  const { data: allowed, error } = await session.supabase.rpc("is_org_admin", { org_id: companyId });
  if (error || !allowed) {
    const { data: isAdmin } = await session.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Acesso restrito aos gestores da empresa.");
  }
  return session;
}

/**
 * Matrícula exige service role: a RLS de `enrollments` só deixa admin da
 * plataforma escrever, e é assim que deve ser — o gestor passa antes pelas
 * checagens de organização e de contrato feitas aqui no servidor.
 */
function privilegedClient(): DB {
  if (!getSupabaseServiceRoleKey()) throw new Error("Serviço de matrícula indisponível neste ambiente.");
  return createAdminClient() as unknown as DB;
}

async function organizationOf(
  supabase: SessionClient,
  table: "organization_members" | "organization_invites",
  id: string,
): Promise<string> {
  const { data } = await supabase.from(table).select("organization_id").eq("id", id).maybeSingle();
  if (!data?.organization_id) throw new Error("Registro não encontrado.");
  return data.organization_id as string;
}

async function requireManagerOf(table: "organization_members" | "organization_invites", id: string) {
  const { supabase } = await requireUser();
  const companyId = await organizationOf(supabase, table, id);
  return { ...(await requireOrgManager(companyId)), companyId };
}

/**
 * Convite de empresa por e-mail, com o link `/convite/<token>`.
 *
 * Usa o cliente admin porque o gestor da empresa não lê `integrations.secrets`
 * (RLS de admin da plataforma). Best-effort: o convite já está gravado; se o
 * e-mail falhar, devolve o motivo para a tela avisar o gestor.
 */
async function deliverInviteEmails(
  companyId: string,
  invites: { email: string; name?: string | null; token: string }[],
): Promise<{ sent: number; failed: number; error?: string }> {
  if (invites.length === 0) return { sent: 0, failed: 0 };
  if (!getSupabaseServiceRoleKey()) {
    return { sent: 0, failed: invites.length, error: "Envio de e-mail indisponível neste ambiente." };
  }

  try {
    const admin = createAdminClient() as unknown as DB;
    const { data: org } = await admin
      .from("organizations")
      .select("name, trade_name")
      .eq("id", companyId)
      .maybeSingle();
    const companyName = org?.trade_name || org?.name || "sua empresa";

    const headerList = await headers();
    const host = headerList.get("host");
    const proto = headerList.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    const origin = resolveAppOrigin(host ? `${proto}://${host}` : null);

    const summary = await sendConfiguredEmailBatch(
      admin,
      { subject: "", template: "org_invite", tags: [{ name: "origem", value: "convite-empresa" }] },
      invites.map((invite) => ({
        to: invite.email,
        data: {
          nome: invite.name?.trim().split(/\s+/)[0] || "",
          email: invite.email,
          nome_empresa: companyName,
          link_convite: `${origin}/convite/${encodeURIComponent(invite.token)}`,
        },
      })),
    );

    if (summary.simulated > 0) {
      return { sent: summary.sent, failed: summary.failed + summary.simulated, error: "Resend não configurado: nenhum e-mail saiu." };
    }
    return { sent: summary.sent, failed: summary.failed, error: summary.firstError };
  } catch (error) {
    return { sent: 0, failed: invites.length, error: (error as Error).message };
  }
}

/**
 * Convida alguém para a empresa.
 *
 * O assento é conferido antes de gravar: um convite pendente já ocupa vaga, do
 * contrário uma leva de convites estouraria o contrato sem ninguém perceber.
 */
export async function inviteMember(
  companyId: string,
  input: { email: string; name?: string; department?: string; jobTitle?: string; role: MemberRole },
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireOrgManager(companyId);

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

    const email = input.email.trim().toLowerCase();
    const token = crypto.randomUUID();
    const { error } = await supabase.from("organization_invites").insert({
      organization_id: companyId,
      email,
      full_name: input.name ?? null,
      department: input.department ?? null,
      role: toDbRole(input.role),
      token,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    });

    if (error) return { success: false, message: error.message };

    const delivery = await deliverInviteEmails(companyId, [{ email, name: input.name, token }]);

    revalidatePath("/empresa/gestao");
    // `message` no sucesso = convite gravado, mas o e-mail não saiu.
    return delivery.sent === 1
      ? { success: true }
      : { success: true, message: `Convite criado, mas o e-mail não foi enviado${delivery.error ? `: ${delivery.error}` : "."}` };
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
    const { supabase, user } = await requireOrgManager(companyId);

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
      // "member" não existe no enum org_role e fazia o insert inteiro falhar.
      role: toDbRole("colaborador"),
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

    const delivery = await deliverInviteEmails(
      companyId,
      rows.map((row, index) => ({ email: row.email, name: toProcess[index].name, token: row.token })),
    );
    if (delivery.failed > 0) {
      result.errors.push(`${delivery.failed} convite(s) sem e-mail enviado${delivery.error ? `: ${delivery.error}` : "."}`);
    }

    revalidatePath("/empresa/gestao");
    return result;
  } catch (error) {
    result.errors.push((error as Error).message);
    return result;
  }
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireManagerOf("organization_invites", inviteId);
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
    const { supabase, companyId } = await requireManagerOf("organization_invites", inviteId);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    // Reenviar também reabre um convite vencido (o prazo novo só vale com status
    // pendente). Aceito ou revogado não volta.
    const { data: invite, error } = await supabase
      .from("organization_invites")
      .update({ expires_at: expiresAt.toISOString(), status: "pending" })
      .eq("id", inviteId)
      .in("status", ["pending", "expired"])
      .select("email, full_name, token")
      .maybeSingle();

    if (error) return { success: false, message: error.message };
    if (!invite) return { success: false, message: "Convite não encontrado, já aceito ou revogado." };

    const delivery = await deliverInviteEmails(companyId, [
      { email: invite.email, name: invite.full_name, token: invite.token },
    ]);

    revalidatePath("/empresa/gestao");
    return delivery.sent === 1
      ? { success: true }
      : { success: false, message: `Prazo renovado, mas o e-mail não foi enviado${delivery.error ? `: ${delivery.error}` : "."}` };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function updateMember(
  memberId: string,
  updates: { role?: MemberRole; department?: string; jobTitle?: string; status?: string; notes?: string },
): Promise<ActionResult> {
  try {
    const { supabase, companyId } = await requireManagerOf("organization_members", memberId);

    const row: Record<string, unknown> = {};
    if (updates.role) row.role = toDbRole(updates.role);
    if (updates.department !== undefined) row.department = updates.department;
    if (updates.jobTitle !== undefined) row.job_title = updates.jobTitle;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.notes !== undefined) row.notes = updates.notes;

    const { data: updated, error } = await supabase
      .from("organization_members")
      .update(row)
      .eq("id", memberId)
      .select("user_id")
      .maybeSingle();
    if (error) return { success: false, message: error.message };

    // Colaborador desativado perde os cursos que a empresa deu.
    if (updates.status === "disabled" && updated?.user_id) {
      await revokeOrgEnrollments(privilegedClient(), companyId, updated.user_id);
    }

    revalidatePath("/empresa/gestao");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  try {
    const { supabase, companyId } = await requireManagerOf("organization_members", memberId);

    const { data: member } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("id", memberId)
      .maybeSingle();

    const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
    if (error) return { success: false, message: error.message };

    // Quem sai da empresa perde os cursos que a empresa deu (e só esses).
    if (member?.user_id) await revokeOrgEnrollments(privilegedClient(), companyId, member.user_id);

    revalidatePath("/empresa/gestao");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Troca o conjunto de cursos de um membro: grava a atribuição, matricula nos
 * novos e revoga os que saíram. Os cursos precisam estar no contrato da org.
 */
async function applyMemberCourses(
  supabase: SessionClient,
  admin: DB,
  companyId: string,
  member: { id: string; user_id: string | null },
  courseIds: string[],
) {
  const { data: previousRows } = await supabase
    .from("organization_member_courses")
    .select("course_id")
    .eq("member_id", member.id);
  const previous = (previousRows ?? []).map((row) => row.course_id as string);

  const { error: deleteError } = await supabase.from("organization_member_courses").delete().eq("member_id", member.id);
  if (deleteError) throw new Error(deleteError.message);

  if (courseIds.length > 0) {
    const { error } = await supabase
      .from("organization_member_courses")
      .insert(courseIds.map((courseId) => ({ member_id: member.id, course_id: courseId })));
    if (error) throw new Error(error.message);
  }

  if (!member.user_id) return;
  await grantOrgEnrollments(admin, companyId, member.user_id, courseIds);
  await revokeOrgEnrollments(
    admin,
    companyId,
    member.user_id,
    previous.filter((courseId) => !courseIds.includes(courseId)),
  );
}

async function assertCoursesInContract(admin: DB, companyId: string, courseIds: string[]) {
  const allowed = await orgAllowedCourseIds(admin, companyId, courseIds);
  if (courseIds.some((courseId) => !allowed.has(courseId))) {
    throw new Error("Alguns cursos não fazem parte do contrato ativo da empresa.");
  }
}

/** Atribui cursos a um membro e o matricula de fato, se ele já tem conta. */
export async function assignCoursesToMember(
  memberId: string,
  courseIds: string[],
): Promise<ActionResult> {
  try {
    const { supabase, companyId } = await requireManagerOf("organization_members", memberId);
    const uniqueCourseIds = [...new Set(courseIds)];
    const admin = privilegedClient();
    await assertCoursesInContract(admin, companyId, uniqueCourseIds);

    const { data: member } = await supabase
      .from("organization_members")
      .select("id, user_id")
      .eq("id", memberId)
      .maybeSingle();
    if (!member) return { success: false, message: "Membro não encontrado." };

    await applyMemberCourses(supabase, admin, companyId, member, uniqueCourseIds);

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
    const { supabase } = await requireOrgManager(companyId);
    const uniqueCourseIds = [...new Set(courseIds)];
    const admin = privilegedClient();
    await assertCoursesInContract(admin, companyId, uniqueCourseIds);

    const { data: members, error: membersError } = await supabase
      .from("organization_members")
      .select("id, user_id")
      .eq("organization_id", companyId)
      .eq("department", department)
      .neq("status", "disabled");

    if (membersError) return { success: false, message: membersError.message };
    if (!members || members.length === 0) return { success: true, affectedMembersCount: 0 };

    for (const member of members) {
      await applyMemberCourses(supabase, admin, companyId, member, uniqueCourseIds);
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

export async function savePlan(input: Partial<Plan> & { id?: string; productId?: string }): Promise<Saved<{ id: string }>> {
  try {
    const name = input.name?.trim();
    if (!name) {
      return { success: false, message: "O nome do plano é obrigatório." };
    }

    if (input.price == null || isNaN(Number(input.price)) || Number(input.price) < 0) {
      return { success: false, message: "Informe um preço válido para o plano." };
    }

    const { adminClient } = await requireAdmin();

    const isNew = !input.id || input.id === "novo" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id);

    // Mapeia frequência para o enum do Postgres ('monthly', 'yearly', 'lifetime', 'custom')
    const frequencyMapping: Record<string, "monthly" | "yearly" | "lifetime" | "custom"> = {
      mensal: "monthly",
      anual: "yearly",
      vitalicio: "lifetime",
      personalizado: "custom",
      semanal: "custom",
      quinzenal: "custom",
      trimestral: "custom",
      semestral: "custom",
      monthly: "monthly",
      yearly: "yearly",
      lifetime: "lifetime",
      custom: "custom",
    };
    const validFrequency = frequencyMapping[input.frequency || "monthly"] || "monthly";

    // Resolução de Slug único
    let baseSlug = slugify(input.slug?.trim() || name);
    if (!baseSlug) baseSlug = `plano-${Date.now()}`;

    let slugQuery = adminClient.from("plans").select("id, slug").like("slug", `${baseSlug}%`);
    if (!isNew && input.id) {
      slugQuery = slugQuery.neq("id", input.id);
    }
    const { data: existingSlugs } = await slugQuery;

    let finalSlug = baseSlug;
    const takenSlugs = new Set((existingSlugs ?? []).map((s) => s.slug));
    if (takenSlugs.has(finalSlug)) {
      let counter = 2;
      while (takenSlugs.has(`${baseSlug}-${counter}`)) {
        counter++;
      }
      finalSlug = `${baseSlug}-${counter}`;
    }

    const gatewayProductId = input.gatewayProductId?.trim() || input.productId?.trim() || null;

    // Serialização de metadados estendidos dentro do JSONB de features
    const structuredFeatures = {
      items: Array.isArray(input.features) ? input.features : [],
      courseAccessType: input.courseAccessType || "all",
      specificCourses: Array.isArray(input.specificCourses) ? input.specificCourses : [],
      accessTimeDays: input.accessTimeDays != null ? Number(input.accessTimeDays) : undefined,
      gateway: input.gateway?.trim() || undefined,
      producerId: input.producerId?.trim() || undefined,
      productId: gatewayProductId || undefined,
      offerId: input.offerId?.trim() || undefined,
      checkoutUrl: input.checkoutUrl?.trim() || undefined,
    };

    const row: Record<string, unknown> = {
      name,
      slug: finalSlug,
      description: input.description !== undefined ? (input.description?.trim() || null) : undefined,
      price: Number(input.price),
      frequency: validFrequency,
      seats: input.seats != null && !isNaN(Number(input.seats)) ? Number(input.seats) : null,
      features: structuredFeatures,
      is_b2b: Boolean(input.isB2B),
      is_active: input.isActive !== undefined ? Boolean(input.isActive) : true,
      is_highlighted: Boolean(input.isHighlighted),
      gateway_product_id: gatewayProductId,
      order_index: input.orderIndex != null ? Number(input.orderIndex) : 0,
      updated_at: new Date().toISOString(),
      ai_daily_credits: Math.max(1, Number(input.aiDailyCredits) || 25),
      ai_weekly_credits: Math.max(1, Number(input.aiWeeklyCredits) || 100),
      ai_monthly_credits: Math.max(1, Number(input.aiMonthlyCredits) || 400),
    };

    // Remove undefined values
    Object.keys(row).forEach((key) => {
      if (row[key] === undefined) delete row[key];
    });

    const query = !isNew && input.id
      ? adminClient.from("plans").update(row).eq("id", input.id).select("id").single()
      : adminClient.from("plans").insert(row).select("id").single();

    const { data, error } = await query;
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/planos");
    revalidatePath("/admin/planos/[id]", "page");
    revalidatePath("/planos");
    revalidatePath("/", "layout");
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function deletePlan(id: string): Promise<ActionResult> {
  try {
    if (!id || id === "novo") return { success: false, message: "ID de plano inválido." };

    const { adminClient } = await requireAdmin();

    const { error } = await adminClient.from("plans").delete().eq("id", id);
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/planos");
    revalidatePath("/", "layout");
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

/**
 * Estado atual da integração OpenRouter para hidratar a tela de admin.
 *
 * Nunca devolve a chave em claro — só se ela existe (`hasApiKey`) — pelo
 * mesmo motivo de `getResendConfig`: a tela não precisa do segredo, só de
 * saber se ele está configurado.
 */
export async function getOpenRouterAdminConfig(): Promise<
  Saved<{ enabled: boolean; config: Record<string, unknown>; status: string; hasApiKey: boolean }>
> {
  try {
    const { adminClient } = await requireAdmin();
    const { data, error } = await adminClient
      .from("integrations")
      .select("enabled, config, secrets, status")
      .eq("slug", "openrouter")
      .maybeSingle();

    if (error) return { success: false, message: error.message };

    return {
      success: true,
      data: {
        enabled: data?.enabled ?? false,
        config: (data?.config ?? {}) as Record<string, unknown>,
        status: data?.status ?? "disconnected",
        hasApiKey: !!(data?.secrets as { apiKey?: string } | undefined)?.apiKey,
      },
    };
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
