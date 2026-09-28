import { NextRequest, NextResponse } from "next/server";

import { authorizeCronRequest } from "@/lib/cronAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PATH = "/api/cron/subscriptions-expire";

/** Rotina diária (QStash, 00:15 em Brasília — ver src/lib/cronJobs.ts). */
async function handle(request: NextRequest) {
  const auth = await authorizeCronRequest(request, PATH);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!getSupabaseServiceRoleKey()) {
    return NextResponse.json({ error: "Service role ausente." }, { status: 503 });
  }
  const { data, error } = await createAdminClient().rpc("expire_ended_subscriptions");
  if (error) return NextResponse.json({ error: "Falha ao expirar assinaturas." }, { status: 503 });
  return NextResponse.json({ ok: true, expired: data ?? 0 });
}

/** QStash chama por POST, assinado. */
export const POST = handle;
/** Disparo manual: `curl -H "Authorization: Bearer $CRON_SECRET" …`. */
export const GET = handle;
