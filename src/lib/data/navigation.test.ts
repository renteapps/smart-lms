import { describe, expect, it } from "vitest";
import { getNavigationConfig } from "./navigation";
import type { DB, Row } from "./types";
import { DEFAULT_NAVIGATION, parseNavigationConfig } from "@/types/navigation";

function createFakeDb(row: Row | null): DB {
  return {
    from: (_table: string) => {
      const builder = {
        select: (_cols?: string) => builder,
        eq: (_col: string, _val: unknown) => builder,
        maybeSingle: async () => ({ data: row, error: null }),
      };
      return builder;
    },
  } as unknown as DB;
}

describe("parseNavigationConfig", () => {
  it("cai no padrão quando não há nada gravado", () => {
    expect(parseNavigationConfig(null)).toEqual(DEFAULT_NAVIGATION);
    expect(parseNavigationConfig(undefined)).toEqual(DEFAULT_NAVIGATION);
    expect(parseNavigationConfig("menu")).toEqual(DEFAULT_NAVIGATION);
    expect(parseNavigationConfig([])).toEqual(DEFAULT_NAVIGATION);
  });

  it("mantém o rodapé padrão quando só o menu foi configurado", () => {
    const config = parseNavigationConfig({ menu: [] });
    expect(config.menu).toEqual([]);
    expect(config.footer.groups).toEqual(DEFAULT_NAVIGATION.footer.groups);
  });

  it("descarta itens sem rótulo ou sem destino", () => {
    const config = parseNavigationConfig({
      menu: [
        { id: "a", label: "Cursos", href: "/cursos" },
        { id: "b", label: "", href: "/vazio" },
        { id: "c", label: "Sem destino", href: "   " },
        "lixo",
      ],
    });
    expect(config.menu.map((item) => item.id)).toEqual(["a"]);
  });

  it("normaliza ícone e visibilidade inválidos", () => {
    const [item] = parseNavigationConfig({
      menu: [{ id: "a", label: "Cursos", href: "/cursos", icon: "foguete", visibility: "chefe" }],
    }).menu;
    expect(item.icon).toBe("link");
    expect(item.visibility).toBe("all");
  });

  it("infere link externo a partir do destino", () => {
    const config = parseNavigationConfig({
      menu: [
        { id: "a", label: "Comunidade", href: "https://discord.com" },
        { id: "b", label: "Cursos", href: "/cursos" },
      ],
    });
    expect(config.menu[0].external).toBe(true);
    expect(config.menu[1].external).toBe(false);
  });

  it("gera id para itens sem id e desempata repetidos", () => {
    const config = parseNavigationConfig({
      menu: [
        { label: "Cursos", href: "/cursos" },
        { id: "a", label: "Trilha", href: "/minha-trilha" },
        { id: "a", label: "Notas", href: "/notas" },
      ],
    });
    const ids = config.menu.map((item) => item.id);
    expect(ids[0]).toBe("menu-item-0");
    expect(new Set(ids).size).toBe(3);
  });

  it("respeita o limite de colunas do rodapé e descarta grupo sem título", () => {
    const config = parseNavigationConfig({
      menu: [],
      footer: {
        groups: [
          { id: "g1", title: "Um", items: [{ id: "i1", label: "Cursos", href: "/cursos" }] },
          { id: "g2", title: "", items: [] },
          { id: "g3", title: "Três", items: [] },
          { id: "g4", title: "Quatro", items: [] },
          { id: "g5", title: "Cinco", items: [] },
        ],
      },
    });
    expect(config.footer.groups.map((group) => group.id)).toEqual(["g1", "g3", "g4"]);
  });
});

describe("getNavigationConfig", () => {
  it("devolve o padrão quando a chave não existe", async () => {
    await expect(getNavigationConfig(createFakeDb(null))).resolves.toEqual(DEFAULT_NAVIGATION);
  });

  it("normaliza o valor gravado", async () => {
    const config = await getNavigationConfig(
      createFakeDb({ value: { menu: [{ id: "a", label: "Cursos", href: "/cursos", enabled: false }] } }),
    );
    expect(config.menu).toEqual([
      {
        id: "a",
        pageKey: null,
        label: "Cursos",
        href: "/cursos",
        icon: "link",
        external: false,
        visibility: "all",
        enabled: false,
      },
    ]);
  });
});
