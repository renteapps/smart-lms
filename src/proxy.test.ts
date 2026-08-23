import { describe, expect, it } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "./proxy";

const matches = (path: string) => unstable_doesMiddlewareMatch({
  config,
  nextConfig: {},
  url: `https://smart-lms.test${path}`,
});

describe("matcher do proxy", () => {
  it.each(["/admin", "/admin/cursos", "/agentes/tutor", "/courses/curso/aulas", "/notas", "/acessar", "/", "/blog", "/blog/artigo", "/api/ai/chat", "/api/webhooks/eduzz"])(
    "protege ou atualiza sessão em %s",
    (path) => expect(matches(path)).toBe(true),
  );

  it.each(["/_next/static/app.js", "/_next/image/sample.png", "/favicon.ico", "/imagem.png", "/foto.jpg", "/icone.svg"])(
    "não executa proxy em %s",
    (path) => expect(matches(path)).toBe(false),
  );
});
