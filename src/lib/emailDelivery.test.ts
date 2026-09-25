import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_RESEND_CONFIG, emailCategoryBlockReason, sendEmailBatch } from "./resendService";
import { getDefaultTemplateDefinitions, interpolateVariables } from "./emailTemplates";
import { generateFirstPartyAuthLink, resolveAppOrigin } from "./auth/accessLink";
import type { DB } from "./data/types";

const categories = DEFAULT_RESEND_CONFIG.categories;

describe("emailCategoryBlockReason", () => {
  it("libera quando a categoria está ligada", () => {
    expect(emailCategoryBlockReason("welcome", categories)).toBeNull();
    expect(emailCategoryBlockReason("notification", categories)).toBeNull();
  });

  it("bloqueia quando a categoria do template está desligada", () => {
    const off = { ...categories, notifications: { ...categories.notifications, broadcasts: false } };
    expect(emailCategoryBlockReason("notification", off)).toMatch(/desativados/);
    expect(emailCategoryBlockReason("welcome", off)).toBeNull();
  });

  it("mapeia o convite de empresa para a própria categoria", () => {
    const off = { ...categories, platform: { ...categories.platform, orgInvite: false } };
    expect(emailCategoryBlockReason("org_invite", off)).toMatch(/Convite de Empresa/);
  });

  it("nunca bloqueia teste nem HTML avulso", () => {
    const allOff = {
      platform: Object.fromEntries(Object.keys(categories.platform).map((k) => [k, false])),
      notifications: Object.fromEntries(Object.keys(categories.notifications).map((k) => [k, false])),
    } as unknown as typeof categories;
    expect(emailCategoryBlockReason("test", allOff)).toBeNull();
    expect(emailCategoryBlockReason(undefined, allOff)).toBeNull();
  });

  it("trata categoria ausente (config salva antes do campo existir) como ligada", () => {
    const legacy = { ...categories, platform: { ...categories.platform, orgInvite: undefined as unknown as boolean } };
    expect(emailCategoryBlockReason("org_invite", legacy)).toBeNull();
  });
});

describe("sendEmailBatch", () => {
  const base = { apiKey: "re_test", fromName: "Plataforma", fromEmail: "no-reply@x.com", replyTo: "", enabled: true };
  const items = (n: number) => Array.from({ length: n }, (_, i) => ({ to: `a${i}@x.com`, subject: "Oi", html: "<p>oi</p>" }));
  const ok = (count: number) => new Response(
    JSON.stringify({ data: Array.from({ length: count }, (_, i) => ({ id: `id_${i}` })) }),
    { status: 200 },
  );

  it("simula sem chave re_, sem chamar a API", async () => {
    const fetchImpl = vi.fn();
    const results = await sendEmailBatch(items(3), { ...base, apiKey: "" }, fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(results.every((r) => r.success && r.simulated)).toBe(true);
  });

  it("falha tudo com a integração desligada", async () => {
    const results = await sendEmailBatch(items(2), { ...base, enabled: false }, vi.fn());
    expect(results.every((r) => !r.success)).toBe(true);
  });

  it("quebra em lotes de 100 e devolve um resultado por item", async () => {
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => ok(JSON.parse(String(init.body)).length));
    const results = await sendEmailBatch(items(150), base, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1].body))).toHaveLength(100);
    expect(JSON.parse(String(fetchImpl.mock.calls[1][1].body))).toHaveLength(50);
    expect(results).toHaveLength(150);
    expect(results.every((r) => r.success && !r.simulated)).toBe(true);
  });

  it("repete uma vez depois de 429", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(ok(1));
    const results = await sendEmailBatch(items(1), base, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(results[0].success).toBe(true);
  });

  it("marca o lote como falho quando o Resend recusa", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "domain not verified" }), { status: 403 }));
    const results = await sendEmailBatch(items(2), base, fetchImpl);
    expect(results.map((r) => r.error)).toEqual(["domain not verified", "domain not verified"]);
  });
});

describe("interpolateVariables com variáveis do perfil", () => {
  it("usa nome e e-mail do perfil em vez dos exemplos", () => {
    const out = interpolateVariables("Olá {{nome}} <{{email}}>", {
      userVariables: { nome: "Maria", email: "maria@x.com" },
    });
    expect(out).toBe("Olá Maria <maria@x.com>");
  });

  it("dado explícito ainda vence o perfil", () => {
    const out = interpolateVariables("{{nome}}", { nome: "Ana", userVariables: { nome: "Maria" } });
    expect(out).toBe("Ana");
  });
});

describe("generateFirstPartyAuthLink", () => {
  const dbWith = (properties: Record<string, string> | null, error: { message: string } | null = null) => ({
    auth: { admin: { generateLink: vi.fn().mockResolvedValue({ data: { properties }, error }) } },
  }) as unknown as DB;

  it("monta /auth/confirm com token_hash, tipo e next", async () => {
    const { link } = await generateFirstPartyAuthLink(
      dbWith({ hashed_token: "abc", action_link: "https://supabase/verify" }),
      { kind: "recovery", email: "a@x.com", next: "/resetar-senha?mode=update", origin: "https://app.test/" },
    );
    expect(link).toBe("https://app.test/auth/confirm?token_hash=abc&type=recovery&next=%2Fresetar-senha%3Fmode%3Dupdate");
  });

  it("cai no action_link quando o Supabase não devolve hashed_token", async () => {
    const { link } = await generateFirstPartyAuthLink(
      dbWith({ action_link: "https://supabase/verify" }),
      { kind: "magiclink", email: "a@x.com", next: "/", origin: "https://app.test" },
    );
    expect(link).toBe("https://supabase/verify");
  });

  it("devolve o erro do Supabase", async () => {
    const result = await generateFirstPartyAuthLink(dbWith(null, { message: "User not found" }), {
      kind: "recovery", email: "a@x.com", next: "/", origin: "https://app.test",
    });
    expect(result).toEqual({ link: null, error: "User not found" });
  });

  describe("resolveAppOrigin", () => {
    afterEach(() => vi.unstubAllEnvs());
    const clear = () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
      vi.stubEnv("APP_URL", "");
      vi.stubEnv("VERCEL_ENV", "");
      vi.stubEnv("VERCEL_URL", "");
    };

    it("em produção usa o domínio canônico mesmo com webhook em *.vercel.app", () => {
      clear();
      vi.stubEnv("VERCEL_ENV", "production");
      expect(resolveAppOrigin("https://smart-lms-blue.vercel.app")).toBe("https://www.plataformag6.com");
    });

    it("URL configurada vence tudo", () => {
      clear();
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://env.test/");
      expect(resolveAppOrigin("https://req.test")).toBe("https://env.test");
    });

    it("fora de produção volta ao host da requisição", () => {
      clear();
      expect(resolveAppOrigin("http://localhost:3888/")).toBe("http://localhost:3888");
    });

    it("sem nada, cai no domínio canônico", () => {
      clear();
      expect(resolveAppOrigin(null)).toBe("https://www.plataformag6.com");
    });
  });
});

describe("templates padrão", () => {
  const templates = getDefaultTemplateDefinitions();

  it("não têm domínio nem cor fixos — tudo vem de variável", () => {
    for (const t of templates) {
      expect(t.html, t.type).not.toMatch(/https?:\/\/(?!schemas|www\.w3\.org)/);
      expect(t.html, t.type).not.toMatch(/smartlms|smart-lms/i);
      expect(t.html, t.type).toContain("{{cor_marca}}");
    }
  });

  it("todo botão tem o endereço escrito logo abaixo (exceto o comunicado)", () => {
    for (const t of templates.filter((item) => item.type !== "notification")) {
      const hrefs = [...t.html.matchAll(/class="button"/g)];
      expect(hrefs.length, t.type).toBe(1);
      expect(t.html, t.type).toContain("Se o botão não funcionar");
    }
  });

  it("toda variável usada no HTML está documentada na lista do editor", () => {
    for (const t of templates) {
      const documented = new Set(t.variables.map((v) => v.tag));
      const used = new Set([...t.html.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => `{{${m[1]}}}`));
      for (const tag of used) expect(documented.has(tag), `${t.type}: ${tag}`).toBe(true);
    }
  });

  it("interpola marca e links da plataforma", () => {
    const welcome = templates.find((t) => t.type === "welcome")!;
    const html = interpolateVariables(welcome.html, {
      nome: "Carlos",
      email: "carlos@x.com",
      nome_plataforma: "Método G6",
      cor_marca: "#2d52e6",
      link_plataforma: "https://www.plataformag6.com",
      link_login: "https://www.plataformag6.com/auth/confirm?token_hash=abc&type=recovery",
    }, { html: true });
    expect(html).toContain("Olá, Carlos!");
    expect(html).toContain("#2d52e6");
    expect(html).toContain("https://www.plataformag6.com/auth/confirm?token_hash=abc&amp;type=recovery");
    expect(html).not.toMatch(/\{\{[a-z_]+\}\}/);
  });
});
