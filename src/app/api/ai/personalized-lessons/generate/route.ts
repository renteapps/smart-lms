import { NextResponse } from "next/server";
import {
  AiBillingError,
  calculateAiSettlement,
  reserveAiUsage,
  type AiUsageReservation,
} from "@/lib/aiBilling";
import { getAiCreditBalance } from "@/lib/aiCredits";
import {
  PERSONALIZED_LESSON_MAX_OUTPUT_TOKENS,
  PersonalizedLessonError,
  preparePersonalizedLesson,
} from "@/lib/personalizedLessons";
import { sanitizeGeneratedMarkdown } from "@/lib/personalizedLessonCore";
import {
  getOpenRouterResponseText,
  getOpenRouterServerConfig,
  getOpenRouterUnavailableReason,
  sendOpenRouterChatCompletion,
} from "@/lib/openrouterService";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/auth";
import type { OpenRouterChatResponse } from "@/types/openrouter";

export const maxDuration = 120;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ABANDONED_AFTER_MS = 10 * 60 * 1000;

function responseError(error: unknown) {
  if (error instanceof PersonalizedLessonError || error instanceof AiBillingError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Não foi possível gerar a aula personalizada.";
  return NextResponse.json({ error: message }, { status: 500 });
}

function publicGeneration(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    version: Number(row.version),
    contentMarkdown: String(row.content_markdown ?? ""),
    creditsCharged: Number(row.credits_charged) || 0,
    model: String(row.model),
    createdAt: String(row.created_at),
    finishedAt: String(row.finished_at),
  };
}

export async function POST(request: Request) {
  let generationId: string | null = null;
  let reservation: AiUsageReservation | null = null;
  let providerResponse: OpenRouterChatResponse | null = null;
  const admin = createAdminClient();
  try {
    const { supabase, user } = await requireUser();
    const body = await request.json() as { lessonId?: unknown; answers?: unknown; requestKey?: unknown; confirmedMaximumCredits?: unknown };
    if (typeof body.lessonId !== "string"
      || typeof body.requestKey !== "string"
      || !UUID_PATTERN.test(body.requestKey)
      || !Number.isFinite(Number(body.confirmedMaximumCredits))
      || Number(body.confirmedMaximumCredits) < 0
      || !body.answers
      || typeof body.answers !== "object"
      || Array.isArray(body.answers)) {
      return NextResponse.json({ error: "Dados de geração inválidos." }, { status: 400 });
    }

    const prepared = await preparePersonalizedLesson(supabase, user, body.lessonId, body.answers as Record<string, unknown>);
    const { data: duplicate } = await admin.from("personalized_lesson_generations")
      .select("*").eq("request_key", body.requestKey).maybeSingle();
    if (duplicate) {
      if (duplicate.user_id !== user.id || duplicate.lesson_id !== body.lessonId) {
        return NextResponse.json({ error: "Chave idempotente inválida." }, { status: 409 });
      }
      if (duplicate.status === "ready") {
        const balance = await getAiCreditBalance(supabase);
        return NextResponse.json({
          generation: publicGeneration(duplicate),
          creditsRemaining: balance?.availableCredits ?? 0,
          refundedCredits: 0,
          assistant: prepared.assistant,
          idempotent: true,
        });
      }
      return NextResponse.json({
        error: duplicate.status === "generating" ? "Esta aula já está sendo gerada." : "Esta tentativa já foi encerrada. Inicie uma nova geração.",
        code: duplicate.status === "generating" ? "generation_in_progress" : "generation_already_failed",
      }, { status: 409 });
    }

    const { data: inflight } = await admin.from("personalized_lesson_generations")
      .select("id, created_at").eq("lesson_id", body.lessonId).eq("user_id", user.id).eq("status", "generating").maybeSingle();
    if (inflight) {
      const age = Date.now() - new Date(inflight.created_at).getTime();
      if (age <= ABANDONED_AFTER_MS) {
        return NextResponse.json({ error: "Esta aula já está sendo gerada.", code: "generation_in_progress" }, { status: 409 });
      }
      await admin.rpc("fail_personalized_lesson_generation", {
        p_generation_id: inflight.id,
        p_error_code: "abandoned_attempt",
      });
    }

    const { data: previous } = await admin.from("personalized_lesson_generations")
      .select("version").eq("lesson_id", body.lessonId).eq("user_id", user.id)
      .order("version", { ascending: false }).limit(1).maybeSingle();
    const version = Number(previous?.version ?? 0) + 1;
    const { data: generation, error: insertError } = await admin.from("personalized_lesson_generations").insert({
      request_key: body.requestKey,
      lesson_id: body.lessonId,
      user_id: user.id,
      version,
      config_revision: prepared.config.revision,
      input_signature: prepared.inputSignature,
      status: "generating",
      model: prepared.config.model,
      assistant_name: prepared.assistant.displayName,
      assistant_avatar: prepared.assistant,
      source_manifest: prepared.sourceManifest,
    }).select("id").single();
    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "Esta aula já está sendo gerada.", code: "generation_in_progress" }, { status: 409 });
      }
      throw insertError;
    }
    generationId = generation.id;

    reservation = await reserveAiUsage({
      userId: user.id,
      feature: "personalized_lesson",
      model: prepared.config.model,
      messages: prepared.messages,
      maxOutputTokens: PERSONALIZED_LESSON_MAX_OUTPUT_TOKENS,
      requestKey: body.requestKey,
      maximumConfirmedCredits: Number(body.confirmedMaximumCredits),
    });
    const { error: linkError } = await admin.from("personalized_lesson_generations")
      .update({ usage_event_id: reservation.eventId })
      .eq("id", generationId).eq("status", "generating");
    if (linkError) throw linkError;

    for (const question of prepared.config.questions) {
      const answer = prepared.answers[question.key];
      const answerValues = Array.isArray(answer) ? answer : [];
      const answerText = Array.isArray(answer) ? answer.join(", ") : answer;
      if (!answerText) {
        await admin.from("student_variable_values").delete()
          .eq("user_id", user.id)
          .eq("variable_key", question.key);
        continue;
      }
      const { error } = await admin.from("student_variable_values").upsert({
        user_id: user.id,
        variable_key: question.key,
        answer: answerText,
        answer_values: answerValues,
        source_lesson_id: body.lessonId,
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,variable_key" });
      if (error) throw error;
    }

    const serverConfig = await getOpenRouterServerConfig();
    const unavailable = getOpenRouterUnavailableReason(serverConfig);
    if (unavailable) throw new PersonalizedLessonError("A integração de IA está indisponível no momento.", 503, `openrouter_${unavailable}`);
    providerResponse = await sendOpenRouterChatCompletion({
      model: prepared.config.model,
      messages: prepared.messages,
      temperature: 0.35,
      maxTokens: reservation.maxOutputTokens,
    }, serverConfig);
    const content = sanitizeGeneratedMarkdown(getOpenRouterResponseText(providerResponse) ?? "");
    if (!content) throw new PersonalizedLessonError(providerResponse.error || "A IA não devolveu conteúdo utilizável.", 502, "provider_empty_response");
    const settlement = calculateAiSettlement(reservation, providerResponse);
    const { data: settled, error: settlementError } = await admin.rpc("complete_personalized_lesson_generation", {
      p_generation_id: generationId,
      p_content_markdown: content,
      p_credits_charged: settlement.creditsCharged,
      p_provider_cost_usd: settlement.providerCostUsd,
      p_provider_cost_brl: settlement.providerCostBrl,
      p_protected_cost_brl: settlement.protectedCostBrl,
      p_prompt_tokens: settlement.promptTokens,
      p_completion_tokens: settlement.completionTokens,
      p_reasoning_tokens: settlement.reasoningTokens,
      p_cached_tokens: settlement.cachedTokens,
      p_provider_generation_id: settlement.providerGenerationId,
      p_pricing_source: settlement.pricingSource,
      p_metadata: { lesson_id: body.lessonId, generation_id: generationId, version },
    });
    if (settlementError) throw new PersonalizedLessonError("A aula foi escrita, mas não pôde ser finalizada com segurança.", 503, "generation_settlement_failed");
    const { data: ready, error: readyError } = await admin.from("personalized_lesson_generations").select("*").eq("id", generationId).single();
    if (readyError) throw readyError;
    return NextResponse.json({
      generation: publicGeneration(ready),
      creditsRemaining: Number(settled?.credits_remaining) || 0,
      refundedCredits: Number(settled?.refunded_credits) || 0,
      assistant: prepared.assistant,
    });
  } catch (error) {
    if (generationId) {
      const usage = providerResponse?.usage;
      const providerCostUsd = providerResponse && reservation
        ? calculateAiSettlement(reservation, providerResponse).providerCostUsd
        : 0;
      await admin.rpc("fail_personalized_lesson_generation", {
        p_generation_id: generationId,
        p_error_code: error instanceof PersonalizedLessonError || error instanceof AiBillingError
          ? error.code
          : error instanceof Error ? error.name.slice(0, 100) : "generation_failed",
        p_provider_cost_usd: providerCostUsd,
        p_provider_cost_brl: providerCostUsd * (reservation?.exchangeRate ?? 0),
        p_prompt_tokens: usage?.promptTokens ?? 0,
        p_completion_tokens: usage?.completionTokens ?? 0,
        p_provider_generation_id: providerResponse?.generationId ?? null,
      });
    }
    return responseError(error);
  }
}
