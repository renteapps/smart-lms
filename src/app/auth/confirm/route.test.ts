import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp, exchangeCodeForSession } }),
}));

import { GET } from "./route";

const get = (query: string) => GET(new NextRequest(`http://localhost/auth/confirm?${query}`));
const location = (response: Response) => new URL(response.headers.get("location")!);

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    verifyOtp.mockResolvedValue({ error: null });
    exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it("recovery com token_hash abre a tela de definir senha", async () => {
    const url = location(await get("token_hash=abc&type=recovery&next=/resetar-senha?mode=update"));
    expect(verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "abc" });
    expect(url.pathname).toBe("/resetar-senha");
    expect(url.searchParams.get("mode")).toBe("update");
  });

  /*
   * Template padrão do Supabase + PKCE: `resetPasswordForEmail` com redirectTo
   * para cá chega com `?code=` e sem token_hash. Antes caía em "token inválido".
   */
  it("recovery com code (PKCE) também abre a tela de definir senha", async () => {
    const url = location(await get("type=recovery&next=/resetar-senha?mode=update&code=xyz"));
    expect(exchangeCodeForSession).toHaveBeenCalledWith("xyz");
    expect(url.pathname).toBe("/resetar-senha");
    expect(url.searchParams.get("mode")).toBe("update");
    expect(url.searchParams.has("code")).toBe(false);
  });

  it("link de acesso vencido leva a pedir um novo, não à confirmação de cadastro", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    const url = location(await get("token_hash=abc&type=recovery"));
    expect(url.pathname).toBe("/resetar-senha");
    expect(url.searchParams.get("expirado")).toBe("1");
  });

  it("confirmação de cadastro vencida continua indo para /confirmar", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    const url = location(await get("token_hash=abc&type=signup"));
    expect(url.pathname).toBe("/confirmar");
    expect(url.searchParams.get("error")).toBe("token_invalido_ou_expirado");
  });

  it("magic link válido segue para o next", async () => {
    const url = location(await get("token_hash=abc&type=magiclink&next=/minha-trilha"));
    expect(url.pathname).toBe("/confirmar");
    expect(url.searchParams.get("status")).toBe("sucesso");
    expect(url.searchParams.get("next")).toBe("/minha-trilha");
  });
});
