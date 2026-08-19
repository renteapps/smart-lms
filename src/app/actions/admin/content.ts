"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { agentToRow, ensureUniqueSlug, slugifyAgentName } from "@/lib/data/agents";
import { pilulaToRow } from "@/lib/data/pilulas";
import { profileTestToRow } from "@/lib/data/profileTests";
import { getContentIndex } from "@/lib/data/content";
import { listQuestionnaireVersions } from "@/lib/data/trail";
import { validateQuestionnaire } from "@/lib/matching";
import type { Agent, AgentFormPayload } from "@/types/agente";
import type { Pilula } from "@/types/pilula";
import type { ProfileTest } from "@/types/profileTest";
import type { Question, QuestionnaireVersion } from "@/types/trilha";
import type { ActionResult } from "../progress";

type Saved<T> = { success: boolean; message?: string; data?: T };

// ---------------------------------------------------------------------------
// Agentes
// ---------------------------------------------------------------------------

export async function saveAgent(payload: AgentFormPayload): Promise<Saved<{ id: string }>> {
  try {
    const { adminClient } = await requireAdmin();

    // Slug só é recalculado na criação: mudar a URL de um agente publicado
    // quebraria os links que os alunos já têm.
    let slug = payload.slug;
    if (!payload.id) {
      const { data: existing } = await adminClient.from("agents").select("slug");
      const taken = (existing ?? []).map((row: { slug: string }) => row.slug);
      slug = ensureUniqueSlug(slugifyAgentName(payload.name), taken);
    }

    const row = agentToRow({ ...(payload as Partial<Agent>), slug });

    const query = payload.id
      ? adminClient.from("agents").update(row).eq("id", payload.id).select("id").single()
      : adminClient.from("agents").insert(row).select("id").single();

    const { data, error } = await query;
    if (error) return { success: false, message: error.message };

    const agentId = data.id;

    // Sincroniza tabelas relacionais caso IDs sejam UUIDs válidos no banco
    if (Array.isArray(payload.courseIds)) {
      const validCourseUuids = payload.courseIds.filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
      );
      await adminClient.from("agent_courses").delete().eq("agent_id", agentId);
      if (validCourseUuids.length > 0) {
        await adminClient.from("agent_courses").insert(
          validCourseUuids.map((cId) => ({ agent_id: agentId, course_id: cId })),
        );
      }
    }

    if (Array.isArray(payload.planIds)) {
      const validPlanUuids = payload.planIds.filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
      );
      await adminClient.from("agent_plans").delete().eq("agent_id", agentId);
      if (validPlanUuids.length > 0) {
        await adminClient.from("agent_plans").insert(
          validPlanUuids.map((pId) => ({ agent_id: agentId, plan_id: pId })),
        );
      }
    }

    revalidatePath("/admin/agentes");
    revalidatePath("/agentes");
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function deleteAgent(id: string): Promise<ActionResult> {
  try {
    const { adminClient } = await requireAdmin();
    const { error } = await adminClient.from("agents").delete().eq("id", id);
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/agentes");
    revalidatePath("/agentes");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Pílulas
// ---------------------------------------------------------------------------

export async function savePilula(
  input: Partial<Pilula> & { id?: string; courseId?: string | null },
): Promise<Saved<{ id: string }>> {
  try {
    const { adminClient } = await requireAdmin();
    const row = pilulaToRow(input);

    const query = input.id
      ? adminClient.from("pilulas").update(row).eq("id", input.id).select("id").single()
      : adminClient.from("pilulas").insert(row).select("id").single();

    const { data, error } = await query;
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/pilulas");
    revalidatePath("/");
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function deletePilula(id: string): Promise<ActionResult> {
  try {
    const { adminClient } = await requireAdmin();
    const { error } = await adminClient.from("pilulas").delete().eq("id", id);
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/pilulas");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Testes de perfil
// ---------------------------------------------------------------------------

export async function saveProfileTest(
  input: Partial<ProfileTest> & { id?: string },
): Promise<Saved<{ id: string }>> {
  try {
    const { adminClient } = await requireAdmin();
    const row = profileTestToRow(input);

    const query = input.id
      ? adminClient.from("profile_tests").update(row).eq("id", input.id).select("id").single()
      : adminClient.from("profile_tests").insert(row).select("id").single();

    const { data, error } = await query;
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/testes-perfil");
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function deleteProfileTest(id: string): Promise<ActionResult> {
  try {
    const { adminClient } = await requireAdmin();
    const { error } = await adminClient.from("profile_tests").delete().eq("id", id);
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/testes-perfil");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Questionário da trilha
// ---------------------------------------------------------------------------

/**
 * Salva o rascunho do questionário.
 *
 * Sempre grava por `id` quando já existe rascunho — nunca por `upsert` em
 * `version` — porque o rascunho e o publicado podiam colidir na mesma versão
 * e o upsert antigo rebaixava a versão publicada para `draft`, derrubando o
 * onboarding de quem já estava usando o link.
 */
export async function saveQuestionnaireDraft(
  questions: Question[],
  notes?: string,
): Promise<Saved<{ version: number }>> {
  try {
    const { adminClient, user } = await requireAdmin();

    const { data: existingDraft } = await adminClient
      .from("trail_questionnaires")
      .select("id, version")
      .eq("status", "draft")
      .maybeSingle();

    if (existingDraft) {
      const { error } = await adminClient
        .from("trail_questionnaires")
        .update({ questions, notes: notes ?? null })
        .eq("id", existingDraft.id);

      if (error) return { success: false, message: error.message };
      revalidatePath("/admin/onboarding");
      return { success: true, data: { version: existingDraft.version } };
    }

    const { data: latest } = await adminClient
      .from("trail_questionnaires")
      .select("version")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const draftVersion = (latest?.version ?? 0) + 1;

    const { error } = await adminClient.from("trail_questionnaires").insert({
      version: draftVersion,
      status: "draft",
      questions,
      notes: notes ?? null,
      created_by: user.id,
    });

    if (error) return { success: false, message: error.message };
    revalidatePath("/admin/onboarding");
    return { success: true, data: { version: draftVersion } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Publica o rascunho como uma versão nova, nunca mutando a que já está no ar.
 *
 * As trilhas já geradas guardam `questionnaireVersion`, e é isso que permite
 * detectar quem respondeu uma versão antiga e oferecer a recalibração. A
 * troca de versão publicada + arquivamento da anterior roda inteira dentro de
 * `publish_trail_questionnaire` (SECURITY DEFINER): Server Actions são
 * alcançáveis por POST direto, então a validação abaixo — e a checagem de
 * admin dentro da própria função do banco — são a garantia real, não só a UI.
 */
export async function publishQuestionnaire(
  questions: Question[],
  notes?: string,
): Promise<Saved<{ version: number }>> {
  try {
    const { supabase, adminClient, user } = await requireAdmin();

    const index = await getContentIndex(adminClient);
    const errors = validateQuestionnaire({ version: 0, status: "draft", questions }, index);
    if (errors.length > 0) {
      return { success: false, message: errors.join(" ") };
    }

    // Roda no client de sessão (não no adminClient): a função do banco lê
    // `auth.uid()` para registrar o autor e checar `is_admin()` de novo.
    const { data: version, error } = await supabase.rpc("publish_trail_questionnaire", {
      p_questions: questions,
      p_notes: notes ?? null,
    });

    if (error) return { success: false, message: error.message };

    await adminClient.from("audit_logs").insert({
      actor_id: user.id,
      action: "publish_questionnaire",
      target_type: "trail_questionnaire",
      target_id: String(version),
      metadata: { notes: notes ?? null, questionCount: questions.length },
    });

    revalidatePath("/onboarding");
    revalidatePath("/admin/onboarding");
    return { success: true, data: { version: version as number } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Copia as perguntas de uma versão antiga de volta para o rascunho.
 *
 * Não republica sozinho: quem restaura revisa e decide publicar, então o
 * questionário em produção nunca muda como efeito colateral de um clique.
 */
export async function restoreQuestionnaireVersion(version: number): Promise<Saved<{ version: number }>> {
  try {
    const { adminClient } = await requireAdmin();

    const { data: target, error: targetError } = await adminClient
      .from("trail_questionnaires")
      .select("questions, notes")
      .eq("version", version)
      .maybeSingle();

    if (targetError) return { success: false, message: targetError.message };
    if (!target) return { success: false, message: "Versão não encontrada." };

    return saveQuestionnaireDraft(target.questions ?? [], target.notes ?? undefined);
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/** Descarta o rascunho em edição, voltando a tela a refletir só o publicado. */
export async function discardQuestionnaireDraft(): Promise<ActionResult> {
  try {
    const { adminClient } = await requireAdmin();
    const { error } = await adminClient.from("trail_questionnaires").delete().eq("status", "draft");
    if (error) return { success: false, message: error.message };

    revalidatePath("/admin/onboarding");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/** Alimenta o painel de histórico do admin — chamado sob demanda, não a cada digitação. */
export async function getQuestionnaireVersions(): Promise<Saved<{ versions: QuestionnaireVersion[] }>> {
  try {
    const { adminClient } = await requireAdmin();
    const versions = await listQuestionnaireVersions(adminClient);
    return { success: true, data: { versions } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Artigos
// ---------------------------------------------------------------------------

export type ArticleInput = {
  id?: string;
  slug: string;
  title: string;
  excerpt?: string;
  cover?: string;
  category?: string;
  author?: string;
  publishedAt?: string;
  readingTime?: number;
  format?: string;
  body?: string;
  featured?: boolean;
  premium?: boolean;
  isPublished?: boolean;
};

export async function saveArticle(input: ArticleInput): Promise<Saved<{ id: string }>> {
  try {
    const { adminClient } = await requireAdmin();

    const row: Record<string, unknown> = {
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt ?? "",
      cover: input.cover ?? null,
      category: input.category ?? "Geral",
      author: input.author ?? "Equipe",
      reading_time: input.readingTime ?? null,
      format: input.format ?? "text",
      body: input.body ?? "",
      featured: input.featured ?? false,
      premium: input.premium ?? false,
      is_published: input.isPublished ?? true,
    };
    if (input.publishedAt) row.published_at = input.publishedAt;

    const query = input.id
      ? adminClient.from("articles").update(row).eq("id", input.id).select("id").single()
      : adminClient.from("articles").insert(row).select("id").single();

    const { data, error } = await query;
    if (error) return { success: false, message: error.message };

    revalidatePath("/blog");
    return { success: true, data: { id: data.id } };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
