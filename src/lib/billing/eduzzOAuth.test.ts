import { describe, expect, it, vi } from "vitest";

import { createEduzzAuthorizationUrl, exchangeEduzzAuthorizationCode, secureStateEquals } from "./eduzzOAuth";

describe("Eduzz OAuth", () => {
  it("inclui callback e state criptográfico na autorização", () => {
    const url = new URL(createEduzzAuthorizationUrl({ clientId: "client", redirectUri: "https://app.test/callback", state: "state-123" }));
    expect(url.origin).toBe("https://accounts.eduzz.com");
    expect(url.searchParams.get("redirectTo")).toBe("https://app.test/callback");
    expect(url.searchParams.get("state")).toBe("state-123");
  });

  it("compara state sem aceitar ausência, prefixo ou valor diferente", () => {
    expect(secureStateEquals("abc", "abc")).toBe(true);
    expect(secureStateEquals("abc", "ab")).toBe(false);
    expect(secureStateEquals("abc", "abd")).toBe(false);
    expect(secureStateEquals(undefined, undefined)).toBe(false);
  });

  it("troca o code e exige o escopo de assinaturas", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      access_token: "access", scope: "myeduzz_subscriptions_read webhook_read",
      user: { eduzzId: 9988, name: "Produtor" },
    }), { status: 200 }));
    const token = await exchangeEduzzAuthorizationCode({
      clientId: "client", clientSecret: "secret", code: "code", redirectUri: "https://app.test/callback", fetchImpl,
    });
    expect(token).toMatchObject({ accessToken: "access", producerId: "9988" });
    const sent = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(sent).toMatchObject({ client_id: "client", client_secret: "secret", grant_type: "authorization_code" });
  });

  it("rejeita token sem myeduzz_subscriptions_read", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      access_token: "access", scope: "webhook_read", user: { eduzzId: 1 },
    }), { status: 200 }));
    await expect(exchangeEduzzAuthorizationCode({
      clientId: "c", clientSecret: "s", code: "x", redirectUri: "https://app.test/callback", fetchImpl,
    })).rejects.toThrow("myeduzz_subscriptions_read");
  });
});
