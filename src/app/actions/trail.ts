"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireAdmin } from "@/lib/supabase/auth";
import type { LearningTrail, Questionnaire, StudyAvailability } from "@/types/trilha";
import type { TrailAnalyticsEvent, TrailAnalyticsEventType } from "@/lib/trailAnalytics";
import { generateLearningTrail, replanLearningTrail, restoreLegacyOverdueMarkers, syncTrailCompletion } from "@/lib/matching";
import { getCachedContentIndex, getContentIndex } from "@/lib/data/content";
import { getPublishedQuestionnaire, saveLearningTrail as persistTrail } from "@/lib/data/trail";
import * as trailData from "@/lib/data/trail";
import { getUserTemplateVariables } from "@/lib/data/userVariables";
import type { ActionResult } from "./progress";

/**
 * Versão do formato do item da trilha.
 *
 * Entra no carimbo guardado para que uma mudança no que o motor grava em cada
 * item — o nome do curso, por exemplo — force uma reconciliação, mesmo com o
 * catálogo intacto. Sem isso, quem já tem trilha só veria o campo novo quando o
 * admin mexesse em algum conteúdo.
 */
const PLAN_FORMAT = "v7";

/**
 * Gera a trilha a partir das respostas do onboarding.
 *
 * O catálogo vem do banco a cada geração — assim um curso publicado hoje já
 * pode entrar na trilha de quem responder o questionário amanhã, sem ninguém
 * precisar remapear nada à mão.
 */
export async function generateTrail(
  answers: Record<string, string[]>,
  availability: StudyAvailability,
): Promise<{ success: boolean; trail?: LearningTrail; message?: string }> {
  try {
    const { supabase, user } = await requireUser();

    /*
     * O carimbo vem sozinho e antes do resto: é ele que chaveia o catálogo em
     * cache. Ler uma linha a mais em série custa menos do que remontar o índice
     * inteiro de novo para cada pessoa que termina o onboarding.
     */
    const stamp = await trailData.getCatalogStamp(supabase);
    const catalogStamp = stamp ? `${PLAN_FORMAT}:${stamp}` : null;

    const [questionnaire, index, existing, completedIds] = await Promise.all([
      getPublishedQuestionnaire(supabase),
      catalogStamp ? getCachedContentIndex(supabase, catalogStamp) : getContentIndex(supabase),
      trailData.getLearningTrail(supabase, user.id),
      trailData.getCompletedContentIds(supabase, user.id),
    ]);

    if (!questionnaire) {
      return { success: false, message: "Nenhum questionário publicado ainda." };
    }

    const generated = generateLearningTrail(
      user.id,
      answers,
      questionnaire,
      availability,
      existing,
      new Date(),
      index,
      completedIds,
    );
    const trail: LearningTrail = {
      ...generated,
      catalogStamp: catalogStamp ?? undefined,
    };

    await Promise.all([
      persistTrail(supabase, user.id, trail),
      trailData.saveOnboardingAnswers(supabase, user.id, questionnaire, answers),
    ]);
    await trailData.recordTrailEvent(supabase, user.id, "plan_generated", {
      items: trail.items.length,
    });

    await supabase
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", user.id);

    revalidatePath("/");
    revalidatePath("/minha-trilha");
    return { success: true, trail };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/** Persiste uma trilha já recalculada no cliente (replanejar, adiar, remover). */
export async function saveTrail(trail: LearningTrail): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    await persistTrail(supabase, user.id, trail);

    revalidatePath("/");
    revalidatePath("/minha-trilha");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export type TrailRefreshNotice = {
  /** Conteúdo que o admin mapeou depois e entrou na trilha agora. */
  added: number;
  /** Itens que a pessoa já tinha concluído fora da agenda e saíram do pendente. */
  synced: number;
  /** Dias de rotina que passaram em branco nesta rodada. */
  missedSessions: number;
  /** Nova meta diária quando o motor aliviou a carga; `null` quando não mexeu. */
  easedMinutes: number | null;
  /** Frase pronta para a interface — string vazia quando nada mudou. */
  summary: string;
};

/**
 * Põe a trilha em dia antes de mostrá-la.
 *
 * Três coisas acontecem entre uma visita e outra, e nenhuma delas era percebida:
 * a pessoa concluiu conteúdo fora da agenda, o admin mapeou conteúdo novo numa
 * resposta que ela já deu, e dias planejados passaram em branco. Esta action
 * resolve as três na ordem certa — o que já foi visto sai, o que venceu é
 * marcado antes que sua data original se perca, e só então o catálogo é
 * reconciliado sem apagar as pendências que a pessoa já recebeu.
 *
 * O trabalho pesado (remontar o índice de conteúdo) só roda quando o carimbo do
 * catálogo mudou de verdade.
 */
export async function refreshTrail(): Promise<{
  success: boolean;
  trail?: LearningTrail | null;
  /**
   * O questionário publicado agora.
   *
   * A home lia o questionário do `localStorage`, com queda para o mock — por
   * isso uma pergunta nova publicada pelo admin nunca aparecia como ajuste
   * rápido para quem já tinha trilha. Quem manda é o banco.
   */
  questionnaire?: Questionnaire | null;
  notice?: TrailRefreshNotice;
  message?: string;
}> {
  try {
    const { supabase, user } = await requireUser();
    const stored = await trailData.getLearningTrail(supabase, user.id);
    if (!stored) return { success: true, trail: null };

    const [completedIds, stamp, published] = await Promise.all([
      trailData.getCompletedContentIds(supabase, user.id),
      trailData.getCatalogStamp(supabase),
      getPublishedQuestionnaire(supabase),
    ]);

    let trail = stored;
    let changed = false;

    const synced = syncTrailCompletion(trail, completedIds);
    if (synced.changed) {
      trail = synced.trail;
      changed = true;
    }

    const restored = restoreLegacyOverdueMarkers(trail);
    if (restored.changed) {
      trail = restored.trail;
      changed = true;
    }

    /*
     * O atraso precisa ser identificado antes de qualquer reconciliação com o
     * catálogo. Regenerar primeiro já parte de hoje e apaga justamente a data
     * vencida que permite dizer "isto ficou atrasado".
     */
    const replanned = replanLearningTrail(trail);
    if (replanned.changed) {
      trail = replanned.trail;
      changed = true;
    }

    let added = 0;
    const currentStamp = stamp ? `${PLAN_FORMAT}:${stamp}` : null;
    if (currentStamp && currentStamp !== trail.catalogStamp) {
      if (published) {
        /*
         * Sem questionário publicado não há o que regenerar — e não vale puxar
         * o catálogo para descartá-lo logo em seguida, que era o que acontecia.
         */
        const index = await getCachedContentIndex(supabase, currentStamp);
        const before = new Set(trail.items.map((item) => item.id));
        const regenerated = generateLearningTrail(
          user.id,
          trail.answers,
          published,
          trail.availability,
          trail,
          new Date(),
          index,
          completedIds,
          { preservePending: true },
        );
        added = regenerated.items.filter((item) => !before.has(item.id)).length;
        trail = { ...regenerated, catalogStamp: currentStamp };
      } else {
        trail = { ...trail, catalogStamp: currentStamp };
      }
      changed = true;
    }

    if (!changed) return { success: true, trail: stored, questionnaire: published };

    await persistTrail(supabase, user.id, trail);

    if (added > 0) {
      await trailData.recordTrailEvent(supabase, user.id, "trail_expanded", { added });
    }
    if (replanned.changed) {
      await trailData.recordTrailEvent(supabase, user.id, "trail_replanned", {
        reason: "overdue",
        missedSessions: replanned.missedSessions,
      });
    }
    if (replanned.easedMinutes) {
      await trailData.recordTrailEvent(supabase, user.id, "routine_eased", {
        minutes: replanned.easedMinutes,
      });
    }

    revalidatePath("/");
    revalidatePath("/minha-trilha");

    return {
      success: true,
      trail,
      questionnaire: published,
      notice: {
        added,
        synced: synced.completed,
        missedSessions: replanned.missedSessions,
        easedMinutes: replanned.easedMinutes,
        summary: buildRefreshSummary(added, synced.completed, replanned.missedSessions, replanned.easedMinutes),
      },
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

function buildRefreshSummary(
  added: number,
  synced: number,
  missedSessions: number,
  easedMinutes: number | null,
): string {
  const parts: string[] = [];

  if (added > 0) {
    parts.push(added === 1
      ? "Um conteúdo novo entrou na sua trilha."
      : `${added} conteúdos novos entraram na sua trilha.`);
  }
  if (synced > 0) {
    parts.push(synced === 1
      ? "Um conteúdo que você já concluiu saiu da agenda."
      : `${synced} conteúdos que você já concluiu saíram da agenda.`);
  }
  if (missedSessions > 0) {
    parts.push("O que não foi concluído ficou marcado como atrasado, e os próximos dias foram reorganizados.");
  }
  if (easedMinutes) {
    parts.push(`Como ${missedSessions === 1 ? "um dia passou" : `${missedSessions} dias passaram`} sem estudo, as próximas sessões passam a ter ${easedMinutes} minutos.`);
  }

  return parts.join(" ");
}

export async function resetTrail(): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    await trailData.deleteLearningTrail(supabase, user.id);

    revalidatePath("/");
    revalidatePath("/minha-trilha");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function trackTrailEvent(
  type: TrailAnalyticsEventType,
  payload?: TrailAnalyticsEvent["payload"],
): Promise<void> {
  try {
    const { supabase, user } = await requireUser();
    await trailData.recordTrailEvent(supabase, user.id, type, payload);
  } catch {
    // Telemetria nunca interrompe quem está estudando.
  }
}

export async function recordSurveyAnswer(
  questionId: string,
  completedCount: number,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    await trailData.recordSurveyAnswer(supabase, user.id, questionId, completedCount);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/** Marca conteúdo da trilha como concluído e devolve a trilha atualizada. */
export async function setTrailItemCompletion(
  contentId: string,
  completed: boolean,
): Promise<{ success: boolean; trail?: LearningTrail; message?: string }> {
  try {
    const { supabase, user } = await requireUser();
    if (completed) {
      const { data: lesson } = await supabase.from("lessons").select("type").eq("id", contentId).maybeSingle();
      if (lesson?.type === "personalized_ai") {
        const { data: ready } = await supabase.from("personalized_lesson_generations")
          .select("id").eq("lesson_id", contentId).eq("user_id", user.id).eq("status", "ready").limit(1).maybeSingle();
        if (!ready) return { success: false, message: "Gere a aula personalizada antes de concluí-la." };
      }
    }
    const trail = await trailData.getLearningTrail(supabase, user.id);
    if (!trail) return { success: false, message: "Você ainda não tem uma trilha." };

    const previous = trail.items.find((item) => item.id === contentId);
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const updated: LearningTrail = {
      ...trail,
      items: trail.items.map((item) =>
        item.id === contentId
          ? {
              ...item,
              status: completed ? "completed" : "pending",
              completedAt: completed ? now.toISOString() : undefined,
              scheduledDate: completed ? item.scheduledDate || dateKey : item.scheduledDate,
            }
          : item,
      ),
    };

    await persistTrail(supabase, user.id, updated);

    if (completed && previous?.status !== "completed") {
      await trailData.recordTrailEvent(supabase, user.id, "content_completed", {
        contentId,
        title: previous?.title || contentId,
        durationMin: previous?.durationMin || 0,
      });
    }

    revalidatePath("/");
    revalidatePath("/minha-trilha");
    return { success: true, trail: updated };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function getOnboardingData() {
  try {
    const { supabase, user } = await requireUser();
    const [questionnaire, existing, profile, variables] = await Promise.all([
      trailData.getPublishedQuestionnaire(supabase),
      trailData.getLearningTrail(supabase, user.id),
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      getUserTemplateVariables(supabase, user.id),
    ]);
    
    if (!questionnaire) {
      return { success: false, message: "Nenhum questionário publicado." };
    }
    
    return {
      success: true,
      questionnaire,
      existing,
      userName: profile.data?.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
      variables,
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function getAdminTrailAnalytics() {
  try {
    const { adminClient } = await requireAdmin();

    const [analyticsData, { data: trailsData }] = await Promise.all([
      trailData.getTrailAnalytics(adminClient),
      adminClient.from("student_trails").select("trail_data"),
    ]);

    const trails = (trailsData || []).map((t) => t.trail_data as LearningTrail).filter(Boolean);

    return { success: true, data: analyticsData, trails };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

export async function getMyTrail() {
  try {
    const { supabase, user } = await requireUser();
    const trail = await trailData.getLearningTrail(supabase, user.id);
    return { success: true, trail };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
