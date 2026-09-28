import { NextRequest, NextResponse } from "next/server";

import { getCronJobStatuses, isCronJobId, qstashConfigStatus, runCronJobNow, syncCronSchedules } from "@/lib/cronJobs";
import { requireAdmin } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro ao falar com o QStash.";
  const status = message.includes("administradores") || message.includes("Sessão") ? 403 : 500;
  return NextResponse.json({ success: false, error: message }, { status });
}

/** Estado das rotinas agendadas no QStash (admin). */
export async function GET() {
  try {
    await requireAdmin();
    const config = qstashConfigStatus();
    if (!config.token) return NextResponse.json({ success: true, config, jobs: null });
    return NextResponse.json({ success: true, config, jobs: await getCronJobStatuses() });
  } catch (error) {
    return errorResponse(error);
  }
}

/** `{ action: "sync" }` cria/atualiza os agendamentos; `{ action: "run", job }` dispara agora. */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));

    if (body.action === "sync") {
      await syncCronSchedules();
      return NextResponse.json({ success: true, jobs: await getCronJobStatuses() });
    }
    if (body.action === "run" && isCronJobId(body.job)) {
      await runCronJobNow(body.job);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: "Ação inválida." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
