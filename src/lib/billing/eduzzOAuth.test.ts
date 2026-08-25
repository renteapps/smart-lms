import { describe, expect, it, vi } from "vitest";

import { createEduzzAuthorizationUrl, exchangeEduzzAuthorizationCode, secureStateEquals, validateEduzzAccount } from "./eduzzOAuth";

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

  /*
   * Antes disso, qualquer 400/401 virava só "HTTP 400" — sem dizer se foi
   * redirect_uri errado, client_secret errado ou código expirado. Sem o motivo
   * real, cada nova falha exigia adivinhar de novo.
   */
  describe("mensagem de erro traz o motivo da Eduzz, não só o status HTTP", () => {
    it("extrai error_description do corpo de erro OAuth2 padrão", async () => {
      const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
        error: "invalid_grant", error_description: "The redirect_uri does not match the registered URI.",
      }), { status: 400 }));
      await expect(exchangeEduzzAuthorizationCode({
        clientId: "c", clientSecret: "s", code: "x", redirectUri: "https://app.test/callback", fetchImpl,
      })).rejects.toThrow(/redirect_uri does not match/);
    });

    it("cai para o campo error quando não há error_description", async () => {
      const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ error: "invalid_client" }), { status: 401 }));
      await expect(exchangeEduzzAuthorizationCode({
        clientId: "c", clientSecret: "s", code: "x", redirectUri: "https://app.test/callback", fetchImpl,
      })).rejects.toThrow(/invalid_client/);
    });

    it("corpo não-JSON usa o texto bruto da resposta", async () => {
      const fetchImpl = vi.fn<typeof fetch>(async () => new Response("Bad Gateway", { status: 502 }));
      await expect(exchangeEduzzAuthorizationCode({
        clientId: "c", clientSecret: "s", code: "x", redirectUri: "https://app.test/callback", fetchImpl,
      })).rejects.toThrow(/Bad Gateway/);
    });

    it("corpo vazio não quebra — cai para a mensagem genérica com o status", async () => {
      const fetchImpl = vi.fn<typeof fetch>(async () => new Response("", { status: 500 }));
      await expect(exchangeEduzzAuthorizationCode({
        clientId: "c", clientSecret: "s", code: "x", redirectUri: "https://app.test/callback", fetchImpl,
      })).rejects.toThrow("A troca OAuth da Eduzz falhou (HTTP 500).");
    });

    it("trunca mensagens muito longas para não estourar a URL de redirecionamento", async () => {
      const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
        error_description: "x".repeat(500),
      }), { status: 400 }));
      await expect(exchangeEduzzAuthorizationCode({
        clientId: "c", clientSecret: "s", code: "x", redirectUri: "https://app.test/callback", fetchImpl,
      })).rejects.toThrow(new RegExp(`x{200}(?!x)`));
    });
  });

  it("validateEduzzAccount também traz o motivo do erro, não só o status", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      message: "Token expirado ou revogado.",
    }), { status: 401 }));
    await expect(validateEduzzAccount("token-invalido", fetchImpl)).rejects.toThrow(/Token expirado ou revogado/);
  });
});
