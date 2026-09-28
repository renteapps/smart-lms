import { NextRequest, NextResponse } from "next/server";

import { isOptOutCategory, recordOptOut, verifyUnsubscribe } from "@/lib/emailUnsubscribe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Descadastro de um clique (RFC 8058): o Gmail/Apple Mail faz POST aqui quando
 * a pessoa usa o botão "Cancelar inscrição" do próprio cliente de e-mail. O
 * token HMAC no link é a autorização — não há sessão.
 */
export async function POST(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const userId = params.get("u") ?? "";
  const category = params.get("c") ?? "";
  const token = params.get("t") ?? "";

  if (!isOptOutCategory(category) || !verifyUnsubscribe(userId, category, token)) {
    return NextResponse.json({ error: "Link de descadastro inválido." }, { status: 400 });
  }
  if (!getSupabaseServiceRoleKey()) {
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  }

  const ok = await recordOptOut(createAdminClient(), userId, category);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Não foi possível concluir o descadastro." }, { status: 503 });
}

/** Aberto no navegador: leva à página com botão de confirmação. */
export function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/descadastrar";
  return NextResponse.redirect(url);
}
