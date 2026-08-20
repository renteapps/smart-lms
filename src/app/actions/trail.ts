"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireAdmin } from "@/lib/supabase/auth";
import type { LearningTrail, StudyAvailability } from "@/types/trilha";
import type { TrailAnalyticsEvent, TrailAnalyticsEventType } from "@/lib/trailAnalytics";
import { generateLearningTrail, replanLearningTrail, syncTrailCompletion } from "@/lib/matching";
import { getContentIndex } from "@/lib/data/content";
import { getPublishedQuestionnaire, saveLearningTrail as persistTrail } from "@/lib/data/trail";
import * as trailData from "@/lib/data/trail";
import type { ActionResult } from "./progress";

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

    const [questionnaire, index, existing, completedIds, stamp] = await Promise.all([
      getPublishedQuestionnaire(supabase),
      getContentIndex(supabase),
      trailData.getLearningTrail(supabase, user.id),
      trailData.getCompletedContentIds(supabase, user.id),
      trailData.getCatalogStamp(supabase),
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
    const trail: LearningTrail = { ...generated, catalogStamp: stamp ?? undefined };

    await persistTrail(supabase, user.id, trail);
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
 * resolve as três na ordem certa — o que já foi visto sai, o que é novo entra na
 * posição curada (logo à frente, quando a etapa dele já passou), e só então o
 * que ficou para trás é redistribuído.
 *
 * O trabalho pesado (remontar o índice de conteúdo) só roda quando o carimbo do
 * catálogo mudou de verdade.
 */
export async function refreshTrail(): Promise<{
  success: boolean;
  trail?: LearningTrail | null;
  notice?: TrailRefreshNotice;
  message?: string;
}> {
  try {
    const { supabase, user } = await requireUser();
    const stored = await trailData.getLearningTrail(supabase, user.id);
    if (!stored) return { success: true, trail: null };

    const [completedIds, stamp] = await Promise.all([
      trailData.getCompletedContentIds(supabase, user.id),
      trailData.getCatalogStamp(supabase),
    ]);

    let trail = stored;
    let changed = false;

    const synced = syncTrailCompletion(trail, completedIds);
    if (synced.changed) {
      trail = synced.trail;
      changed = true;
    }

    let added = 0;
    if (stamp && stamp !== trail.catalogStamp) {
      const [questionnaire, index] = await Promise.all([
        getPublishedQuestionnaire(supabase),
        getContentIndex(supabase),
      ]);

      if (questionnaire) {
        const before = new Set(trail.items.map((item) => item.id));
        const regenerated = generateLearningTrail(
          user.id,
          trail.answers,
          questionnaire,
          trail.availability,
          trail,
          new Date(),
          index,
          completedIds,
        );
        added = regenerated.items.filter((item) => !before.has(item.id)).length;
        trail = { ...regenerated, catalogStamp: stamp };
      } else {
        trail = { ...trail, catalogStamp: stamp };
      }
      changed = true;
    }

    const replanned = replanLearningTrail(trail);
    if (replanned.changed) {
      trail = replanned.trail;
      changed = true;
    }

    if (!changed) return { success: true, trail: stored };

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
  if (easedMinutes) {
    parts.push(`Como ${missedSessions === 1 ? "um dia passou" : `${missedSessions} dias passaram`} sem estudo, as próximas sessões passam a ter ${easedMinutes} minutos.`);
  } else if (missedSessions > 0) {
    parts.push("Reorganizamos na frente o que ficou para trás.");
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
    const [questionnaire, existing] = await Promise.all([
      trailData.getPublishedQuestionnaire(supabase),
      trailData.getLearningTrail(supabase, user.id),
    ]);
    
    if (!questionnaire) {
      return { success: false, message: "Nenhum questionário publicado." };
    }
    
    return { success: true, questionnaire, existing };
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
