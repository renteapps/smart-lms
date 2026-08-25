import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { POST } from "./route";

function post(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/webhooks/hotmart", {
    method: "POST",
    headers,
    body,
  });
}

describe("POST /api/webhooks/hotmart", () => {
  it("recusa Content-Length acima de 1 MiB sem ler o corpo", async () => {
    expect((await POST(post("{}", { "content-length": "1048577" }))).status).toBe(413);
  });

  it("recusa corpo real acima do limite mesmo sem Content-Length confiável", async () => {
    expect((await POST(post("x".repeat(1_048_577), { "content-length": "0" }))).status).toBe(413);
  });

  /*
   * A garantia central da rota: sem segredo configurado, nada passa. Sem
   * `SUPABASE_SERVICE_ROLE_KEY` o handler já corta em 503 antes de escrever —
   * o que importa é que em nenhum dos dois casos a resposta seja 200, porque
   * 200 faz a Hotmart considerar a venda entregue.
   */
  it("nunca responde 200 para requisição sem autenticação", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const response = await POST(post(JSON.stringify({ event: "PURCHASE_APPROVED" })));
    expect(response.status).not.toBe(200);
    expect(response.status).toBeGreaterThanOrEqual(400);
    vi.unstubAllEnvs();
  });
});
