import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildUnsubscribe, signUnsubscribe, verifyUnsubscribe } from "./emailUnsubscribe";

describe("token de descadastro", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-de-teste");
    vi.stubEnv("EMAIL_LINK_SECRET", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.plataformag6.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("aceita o token que ele mesmo gerou", () => {
    const token = signUnsubscribe("u1", "winback")!;
    expect(verifyUnsubscribe("u1", "winback", token)).toBe(true);
  });

  it("recusa token de outro usuário, adulterado ou de categoria desconhecida", () => {
    const token = signUnsubscribe("u1", "winback")!;
    expect(verifyUnsubscribe("u2", "winback", token)).toBe(false);
    expect(verifyUnsubscribe("u1", "winback", `${token}x`)).toBe(false);
    expect(verifyUnsubscribe("u1", "marketing", token)).toBe(false);
    expect(verifyUnsubscribe("u1", "winback", "")).toBe(false);
  });

  it("sem chave de assinatura, não gera nem aceita token", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(signUnsubscribe("u1", "winback")).toBeNull();
    expect(verifyUnsubscribe("u1", "winback", "qualquer")).toBe(false);
  });

  it("monta a página de confirmação e os cabeçalhos de um clique no domínio da plataforma", () => {
    const built = buildUnsubscribe("u1", "winback")!;
    expect(built.pageUrl).toMatch(/^https:\/\/www\.plataformag6\.com\/descadastrar\?u=u1&c=winback&t=/);
    expect(built.headers["List-Unsubscribe"]).toMatch(/^<https:\/\/www\.plataformag6\.com\/api\/email\/unsubscribe\?/);
    expect(built.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });
});
