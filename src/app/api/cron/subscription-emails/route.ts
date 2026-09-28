import { NextRequest, NextResponse } from "next/server";

import { runSubscriptionLifecycleEmails } from "@/lib/billing/lifecycleEmails";
import { authorizeCronRequest } from "@/lib/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PATH = "/api/cron/subscription-emails";

/**
 * Rotina diária (QStash, 09:00 em Brasília — ver src/lib/cronJobs.ts): aviso
 * de vencimento, aviso de expiração e sequência de reconquista. Ver
 * src/lib/billing/lifecycleEmails.ts. Rodar de novo no mesmo dia é seguro —
 * cada e-mail sai uma vez por período.
 */
async function handle(request: NextRequest) {
  const auth = await authorizeCronRequest(request, PATH);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!getSupabaseServiceRoleKey()) {
    return NextResponse.json({ error: "Service role ausente." }, { status: 503 });
  }

  try {
    const summary = await runSubscriptionLifecycleEmails(createAdminClient());
    console.info("[cron:subscription-emails]", JSON.stringify(summary));
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[cron:subscription-emails] falhou", (error as Error).message);
    // 5xx faz o QStash tentar de novo.
    return NextResponse.json({ error: "Falha ao processar os e-mails de assinatura." }, { status: 503 });
  }
}

/** QStash chama por POST, assinado. */
export const POST = handle;
/** Disparo manual: `curl -H "Authorization: Bearer $CRON_SECRET" …`. */
export const GET = handle;
