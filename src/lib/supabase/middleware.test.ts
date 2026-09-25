import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let currentUser: { id: string } | null = null;
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
    // Perfil completo: o gate de /completar-cadastro não interfere nestes testes.
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              role: "student", full_name: "Ana", username: "ana", phone: "1",
              birth_date: "2000-01-01", gender: "f", career_role: "x",
            },
          }),
        }),
      }),
    }),
  }),
}));
vi.mock("./env", () => ({ getSupabaseUrl: () => "http://sb", getSupabaseAnonKey: () => "anon" }));

import { updateSession } from "./middleware";

const run = (path: string) => updateSession(new NextRequest(`http://localhost${path}`));
const redirectedTo = (response: Response) => {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
};

describe("updateSession", () => {
  beforeEach(() => { currentUser = null; });

  /*
   * O link de recuperação cria a sessão em /auth/confirm e manda para
   * /resetar-senha?mode=update. Se o middleware tratar isso como "tela de
   * login com usuário logado", a pessoa vai para "/" e nunca define a senha.
   */
  it("deixa quem acabou de validar o link de recuperação definir a senha", async () => {
    currentUser = { id: "u1" };
    expect(redirectedTo(await run("/resetar-senha?mode=update"))).toBeNull();
  });

  it("continua tirando o usuário logado da tela de pedir recuperação", async () => {
    currentUser = { id: "u1" };
    expect(redirectedTo(await run("/resetar-senha"))).toBe("/");
  });

  it("abre o convite de empresa sem login", async () => {
    expect(redirectedTo(await run("/convite/abc"))).toBeNull();
  });

  it("segue exigindo login nas rotas protegidas", async () => {
    expect(redirectedTo(await run("/minha-trilha"))).toBe("/acessar");
  });
});
