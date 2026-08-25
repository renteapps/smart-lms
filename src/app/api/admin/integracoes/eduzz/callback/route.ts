import { NextRequest, NextResponse } from "next/server";

import { exchangeEduzzAuthorizationCode, secureStateEquals, validateEduzzAccount } from "@/lib/billing/eduzzOAuth";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/supabase/auth";

export const runtime = "nodejs";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function publicOrigin(request: NextRequest): string {
  const configured = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  return configured ? configured.replace(/\/$/, "") : request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const destination = new URL("/admin/integracoes/eduzz", publicOrigin(request));
  const responseFor = (param: string, value: string) => {
    destination.searchParams.set(param, value);
    const response = NextResponse.redirect(destination);
    response.cookies.set("eduzz_oauth_state", "", {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: "/api/admin/integracoes/eduzz/callback", maxAge: 0,
    });
    return response;
  };

  try {
    if (!getSupabaseServiceRoleKey()) throw new Error("Service role ausente.");
    const { adminClient } = await requireAdmin();
    const state = request.nextUrl.searchParams.get("state") ?? undefined;
    const expectedState = request.cookies.get("eduzz_oauth_state")?.value;
    if (!secureStateEquals(expectedState, state)) throw new Error("State OAuth inválido ou expirado.");
    const code = request.nextUrl.searchParams.get("code");
    if (!code) throw new Error("A Eduzz não retornou o código de autorização.");

    const { data, error } = await adminClient.from("integrations")
      .select("config, secrets").eq("slug", "eduzz").maybeSingle();
    if (error) throw new Error(error.message);
    const existingSecrets = asRecord(data?.secrets);
    const clientId = typeof existingSecrets.clientId === "string" ? existingSecrets.clientId : "";
    const clientSecret = typeof existingSecrets.clientSecret === "string" ? existingSecrets.clientSecret : "";
    if (!clientId || !clientSecret) throw new Error("Client ID e Client Secret não estão configurados.");

    const redirectUri = `${publicOrigin(request)}/api/admin/integracoes/eduzz/callback`;
    const token = await exchangeEduzzAuthorizationCode({ clientId, clientSecret, code, redirectUri });
    const account = await validateEduzzAccount(token.accessToken);
    const now = Date.now();
    const tokenExpiresAt = token.expiresIn && token.expiresIn > 0
      ? new Date(now + token.expiresIn * 1000).toISOString()
      : null;
    const secrets = {
      ...existingSecrets, accessToken: token.accessToken, refreshToken: token.refreshToken ?? null,
      tokenExpiresAt, oauthScope: token.scope,
    };
    const config = {
      ...asRecord(data?.config), producerId: token.producerId,
      accountId: account.id, accountName: typeof account.name === "string" ? account.name : token.accountName ?? null,
    };
    const { error: updateError } = await adminClient.from("integrations").upsert({
      slug: "eduzz", name: "Eduzz", enabled: true, status: "connected",
      secrets, config, updated_at: new Date().toISOString(),
    });
    if (updateError) throw new Error(updateError.message);
    return responseFor("oauth", "connected");
  } catch (error) {
    return responseFor("oauth_error", (error as Error).message);
  }
}
