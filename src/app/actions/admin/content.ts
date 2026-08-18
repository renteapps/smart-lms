"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/auth";
import { agentToRow, ensureUniqueSlug, slugifyAgentName } from "@/lib/data/agents";
import { pilulaToRow } from "@/lib/data/pilulas";
import { profileTestToRow } from "@/lib/data/profileTests";
import type { Agent, AgentFormPayload } from "@/types/agente";
import type { Pilula } from "@/types/pilula";
import type { ProfileTest } from "@/types/profileTest";
import type { Questionnaire } from "@/types/trilha";
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
 * Publicar cria uma versão nova em vez de mutar a publicada: as trilhas já
 * geradas guardam `questionnaireVersion`, e é isso que permite detectar quem
 * respondeu uma versão antiga e oferecer a recalibração.
 */
export async function saveQuestionnaire(
  questionnaire: Questionnaire,
  publish = false,
): Promise<Saved<{ version: number }>> {
  try {
    const { adminClient } = await requireAdmin();

    if (!publish) {
      const { error } = await adminClient.from("trail_questionnaires").upsert(
        { version: questionnaire.version, status: "draft", questions: questionnaire.questions },
        { onConflict: "version" },
      );
      return error
        ? { success: false, message: error.message }
        : { success: true, data: { version: questionnaire.version } };
    }

    const { data: latest } = await adminClient
      .from("trail_questionnaires")
      .select("version")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = Math.max(questionnaire.version, (latest?.version ?? 0) + 1);

    // O índice parcial garante uma publicada por vez: rebaixa a atual primeiro.
    await adminClient
      .from("trail_questionnaires")
      .update({ status: "archived" })
      .eq("status", "published");

    const { error } = await adminClient.from("trail_questionnaires").upsert(
      { version: nextVersion, status: "published", questions: questionnaire.questions },
      { onConflict: "version" },
    );

    if (error) return { success: false, message: error.message };

    revalidatePath("/onboarding");
    revalidatePath("/admin/trilhas/questionario");
    return { success: true, data: { version: nextVersion } };
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
