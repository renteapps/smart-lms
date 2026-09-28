import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verify = vi.fn();
vi.mock("@upstash/qstash", () => ({
  Receiver: vi.fn().mockImplementation(function Receiver() {
    return { verify: (...args: unknown[]) => verify(...args) };
  }),
}));

import { authorizeCronRequest } from "./cronAuth";

const PATH = "/api/cron/subscription-emails";
const request = (headers: Record<string, string>, url = `https://www.plataformag6.com${PATH}`) =>
  new Request(url, { method: "POST", headers, body: "{}" });

describe("authorizeCronRequest", () => {
  beforeEach(() => {
    verify.mockReset();
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "sig_current");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "sig_next");
    vi.stubEnv("CRON_SECRET", "segredo");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.plataformag6.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("aceita chamada do QStash com assinatura válida, conferindo corpo e URL", async () => {
    verify.mockResolvedValue(true);
    expect(await authorizeCronRequest(request({ "upstash-signature": "jwt" }), PATH)).toEqual({ ok: true });
    expect(verify).toHaveBeenCalledWith({
      signature: "jwt",
      body: "{}",
      url: `https://www.plataformag6.com${PATH}`,
    });
  });

  it("aceita a URL canônica quando o host que chegou é outro (proxy)", async () => {
    verify.mockImplementation(async ({ url }: { url: string }) => {
      if (url !== `https://www.plataformag6.com${PATH}`) throw new Error("invalid subject");
      return true;
    });
    const result = await authorizeCronRequest(
      request({ "upstash-signature": "jwt" }, `https://interno.vercel.app${PATH}`),
      PATH,
    );
    expect(result).toEqual({ ok: true });
  });

  it("recusa assinatura inválida", async () => {
    verify.mockRejectedValue(new Error("signature mismatch"));
    expect(await authorizeCronRequest(request({ "upstash-signature": "forjada" }), PATH))
      .toMatchObject({ ok: false, status: 401 });
  });

  it("sem as chaves de assinatura, recusa (503) em vez de aceitar sem verificar", async () => {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "");
    expect(await authorizeCronRequest(request({ "upstash-signature": "jwt" }), PATH))
      .toMatchObject({ ok: false, status: 503 });
    expect(verify).not.toHaveBeenCalled();
  });

  it("disparo manual com CRON_SECRET continua funcionando", async () => {
    expect(await authorizeCronRequest(request({ authorization: "Bearer segredo" }), PATH)).toEqual({ ok: true });
    expect(await authorizeCronRequest(request({ authorization: "Bearer errado" }), PATH))
      .toMatchObject({ ok: false, status: 401 });
  });

  it("sem CRON_SECRET configurado, nenhum Bearer passa", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(await authorizeCronRequest(request({ authorization: "Bearer " }), PATH))
      .toMatchObject({ ok: false, status: 401 });
  });
});
