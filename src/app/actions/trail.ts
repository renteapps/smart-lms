"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/auth";
import type { LearningTrail, StudyAvailability } from "@/types/trilha";
import type { TrailAnalyticsEvent, TrailAnalyticsEventType } from "@/lib/trailAnalytics";
import { generateLearningTrail } from "@/lib/matching";
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

    const [questionnaire, index, existing] = await Promise.all([
      getPublishedQuestionnaire(supabase),
      getContentIndex(supabase),
      trailData.getLearningTrail(supabase, user.id),
    ]);

    if (!questionnaire) {
      return { success: false, message: "Nenhum questionário publicado ainda." };
    }

    const trail = generateLearningTrail(
      user.id,
      answers,
      questionnaire,
      availability,
      existing,
      new Date(),
      index,
    );

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
    const { supabase } = await requireUser();
    // Em um app real deveríamos validar se o usuário é admin
    
    const [analyticsData, { data: trailsData }] = await Promise.all([
      trailData.getTrailAnalytics(supabase),
      supabase.from("student_trails").select("trail_data")
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
