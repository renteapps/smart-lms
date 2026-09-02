import { NextResponse } from "next/server";
import { quoteAiUsage } from "@/lib/aiBilling";
import { getAiCreditBalance } from "@/lib/aiCredits";
import {
  PERSONALIZED_LESSON_MAX_OUTPUT_TOKENS,
  PersonalizedLessonError,
  preparePersonalizedLesson,
} from "@/lib/personalizedLessons";
import { requireUser } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = await request.json() as { lessonId?: unknown; answers?: unknown };
    if (typeof body.lessonId !== "string" || !body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) {
      return NextResponse.json({ error: "Dados de cotação inválidos." }, { status: 400 });
    }
    const prepared = await preparePersonalizedLesson(supabase, user, body.lessonId, body.answers as Record<string, unknown>);
    const [quote, balance] = await Promise.all([
      quoteAiUsage({
        userId: user.id,
        feature: "personalized_lesson",
        model: prepared.config.model,
        messages: prepared.messages,
        maxOutputTokens: PERSONALIZED_LESSON_MAX_OUTPUT_TOKENS,
      }),
      getAiCreditBalance(supabase),
    ]);
    return NextResponse.json({
      availableCredits: balance?.availableCredits ?? 0,
      maximumCredits: quote.reservedCredits,
      maxOutputTokens: quote.maxOutputTokens,
      assistant: prepared.assistant,
    });
  } catch (error) {
    if (error instanceof PersonalizedLessonError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    const billing = error as { status?: number; code?: string; message?: string };
    return NextResponse.json(
      { error: billing.message || "Não foi possível calcular a estimativa.", code: billing.code },
      { status: billing.status ?? 500 },
    );
  }
}
