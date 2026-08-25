import { timingSafeEqual } from "node:crypto";

export const EDUZZ_REQUIRED_SCOPE = "myeduzz_subscriptions_read";

export type EduzzOAuthToken = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope: string[];
  producerId: string;
  accountName?: string;
};

export function createEduzzAuthorizationUrl(input: { clientId: string; redirectUri: string; state: string }): string {
  const url = new URL("https://accounts.eduzz.com/oauth/authorize");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("responseType", "code");
  url.searchParams.set("redirectTo", input.redirectUri);
  url.searchParams.set("state", input.state);
  return url.toString();
}

export function secureStateEquals(expected?: string, received?: string): boolean {
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function exchangeEduzzAuthorizationCode(input: {
  clientId: string; clientSecret: string; code: string; redirectUri: string; fetchImpl?: typeof fetch;
}): Promise<EduzzOAuthToken> {
  const response = await (input.fetchImpl ?? fetch)("https://accounts-api.eduzz.com/oauth/token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`A troca OAuth da Eduzz falhou (HTTP ${response.status}).`);
  const payload = await response.json() as Record<string, unknown>;
  const accessToken = typeof payload.access_token === "string" ? payload.access_token : "";
  const scope = typeof payload.scope === "string" ? payload.scope.split(/\s+/).filter(Boolean) : [];
  const user = payload.user && typeof payload.user === "object" ? payload.user as Record<string, unknown> : {};
  const rawProducerId = user.eduzzId ?? user.eduzz_id;
  const producerId = typeof rawProducerId === "number" || typeof rawProducerId === "string" ? String(rawProducerId) : "";
  if (!accessToken || !producerId) throw new Error("Resposta OAuth da Eduzz sem token ou conta produtora.");
  if (!scope.includes(EDUZZ_REQUIRED_SCOPE)) {
    throw new Error(`O aplicativo Eduzz não concedeu o escopo obrigatório ${EDUZZ_REQUIRED_SCOPE}.`);
  }
  return {
    accessToken,
    refreshToken: typeof payload.refresh_token === "string" ? payload.refresh_token : undefined,
    expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : undefined,
    scope,
    producerId,
    accountName: typeof user.name === "string" ? user.name : undefined,
  };
}

export async function validateEduzzAccount(accessToken: string, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl("https://api.eduzz.com/accounts/v1/me", {
    headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Não foi possível validar a conta Eduzz (HTTP ${response.status}).`);
  const payload = await response.json() as Record<string, unknown>;
  if (typeof payload.id !== "string") throw new Error("Resposta inválida ao validar a conta Eduzz.");
  return payload;
}
