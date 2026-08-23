import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth";
import { getAiCreditBalance } from "@/lib/aiCredits";
import {
  PlatformAssistantError,
  clearOwnAssistantConversation,
  getOwnAssistantConversation,
  getPlatformAssistantSettings,
  parseAssistantPostBody,
  parseAssistantScope,
  publicAssistantConfig,
  resolveAssistantScope,
  sendPlatformAssistantMessage,
} from "@/lib/platformAssistant";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AssistantScope } from "@/types/platformAssistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof PlatformAssistantError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  const message = error instanceof Error && error.message.includes("Sessão expirada")
    ? "Sua sessão expirou. Entre novamente para continuar."
    : "O assistente está indisponível no momento.";
  const status = message.startsWith("Sua sessão") ? 401 : 500;
  console.error("[platform-assistant:route]", error);
  return NextResponse.json({ error: message, code: status === 401 ? "unauthorized" : "internal_error" }, { status });
}

/** GET e DELETE identificam a conversa pela mesma query (`kind`, `courseId`, `lessonId`). */
function scopeFromSearchParams(params: URLSearchParams): AssistantScope {
  const kind = params.get("kind") || "platform";
  return parseAssistantScope(
    kind === "course"
      ? { kind, courseId: params.get("courseId"), lessonId: params.get("lessonId") || undefined }
      : { kind },
  );
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    if (request.nextUrl.searchParams.get("mode") === "config") {
      const settings = await getPlatformAssistantSettings(createAdminClient());
      return NextResponse.json({ config: publicAssistantConfig(settings) });
    }
    const scope = scopeFromSearchParams(request.nextUrl.searchParams);
    const settings = await getPlatformAssistantSettings(createAdminClient());
    const resolved = await resolveAssistantScope(supabase, user, scope, settings);
    const [conversation, balance] = await Promise.all([
      getOwnAssistantConversation(supabase, user.id, resolved.contextKey),
      getAiCreditBalance(supabase),
    ]);
    return NextResponse.json({
      config: publicAssistantConfig(settings),
      conversation,
      reach: resolved.reach,
      credits: balance?.availableCredits ?? null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const body = parseAssistantPostBody(await request.json());
    const response = await sendPlatformAssistantMessage(supabase, user, body);
    return NextResponse.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}

/** Limpa o histórico visível para o aluno; o registro segue auditável no /admin/chat. */
export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const scope = scopeFromSearchParams(request.nextUrl.searchParams);
    const settings = await getPlatformAssistantSettings(createAdminClient());
    const resolved = await resolveAssistantScope(supabase, user, scope, settings);
    await clearOwnAssistantConversation(createAdminClient(), user.id, resolved.contextKey);
    return NextResponse.json({ cleared: true });
  } catch (error) {
    return errorResponse(error);
  }
}
