import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!getSupabaseServiceRoleKey()) {
    return NextResponse.json({ error: "Service role ausente." }, { status: 503 });
  }
  const { data, error } = await createAdminClient().rpc("expire_ended_subscriptions");
  if (error) return NextResponse.json({ error: "Falha ao expirar assinaturas." }, { status: 503 });
  return NextResponse.json({ ok: true, expired: data ?? 0 });
}
