import { randomBytes } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { createEduzzAuthorizationUrl } from "@/lib/billing/eduzzOAuth";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/supabase/auth";

export const runtime = "nodejs";

function publicOrigin(request: NextRequest): string {
  const configured = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  return configured ? configured.replace(/\/$/, "") : request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  try {
    if (!getSupabaseServiceRoleKey()) throw new Error("Service role ausente.");
    const { adminClient } = await requireAdmin();
    const { data, error } = await adminClient.from("integrations")
      .select("secrets").eq("slug", "eduzz").maybeSingle();
    if (error) throw new Error(error.message);
    const secrets = (data?.secrets ?? {}) as Record<string, unknown>;
    const clientId = typeof secrets.clientId === "string" ? secrets.clientId : "";
    if (!clientId) throw new Error("Configure o Client ID da Eduzz antes de conectar.");

    const state = randomBytes(32).toString("base64url");
    const redirectUri = `${publicOrigin(request)}/api/admin/integracoes/eduzz/callback`;
    const response = NextResponse.redirect(createEduzzAuthorizationUrl({ clientId, redirectUri, state }));
    response.cookies.set("eduzz_oauth_state", state, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: "/api/admin/integracoes/eduzz/callback", maxAge: 600,
    });
    return response;
  } catch (error) {
    return NextResponse.redirect(new URL(`/admin/integracoes/eduzz?oauth_error=${encodeURIComponent((error as Error).message)}`, request.url));
  }
}
