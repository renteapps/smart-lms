import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth";
import {
  PlatformAssistantError,
  getOwnAssistantConversation,
  getPlatformAssistantSettings,
  parseAssistantPostBody,
  parseAssistantScope,
  publicAssistantConfig,
  resolveAssistantScope,
  sendPlatformAssistantMessage,
} from "@/lib/platformAssistant";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const kind = request.nextUrl.searchParams.get("kind") || "platform";
    const scope = parseAssistantScope(
      kind === "course"
        ? {
            kind,
            courseId: request.nextUrl.searchParams.get("courseId"),
            lessonId: request.nextUrl.searchParams.get("lessonId") || undefined,
          }
        : { kind },
    );
    const resolved = await resolveAssistantScope(supabase, user, scope);
    const [settings, conversation] = await Promise.all([
      getPlatformAssistantSettings(createAdminClient()),
      getOwnAssistantConversation(supabase, user.id, resolved.contextKey),
    ]);
    return NextResponse.json({ config: publicAssistantConfig(settings), conversation });
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
