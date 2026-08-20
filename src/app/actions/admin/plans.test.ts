import { describe, it, expect } from "vitest";
import { mapPlan } from "@/lib/data/plans";

describe("Plans Data Mapping (mapPlan)", () => {
  it("mapeia plano com formato legado de features em array", () => {
    const rawRow = {
      id: "11111111-1111-1111-1111-111111111111",
      slug: "plano-basico",
      name: "Plano Básico",
      description: "Acesso aos cursos",
      price: "49.90",
      frequency: "monthly",
      seats: null,
      features: ["cursos", "comentarios"],
      is_b2b: false,
      is_active: true,
      is_highlighted: false,
      gateway_product_id: "EDZ-12345",
      order_index: 1,
      created_at: "2026-08-20T10:00:00Z",
      updated_at: "2026-08-20T10:00:00Z",
    };

    const plan = mapPlan(rawRow);

    expect(plan.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(plan.name).toBe("Plano Básico");
    expect(plan.slug).toBe("plano-basico");
    expect(plan.price).toBe(49.9);
    expect(plan.frequency).toBe("monthly");
    expect(plan.features).toEqual(["cursos", "comentarios"]);
    expect(plan.isActive).toBe(true);
    expect(plan.isB2B).toBe(false);
    expect(plan.gatewayProductId).toBe("EDZ-12345");
    expect(plan.courseAccessType).toBe("all");
    expect(plan.aiTokensUnlimited).toBe(true);
  });

  it("mapeia plano com features estruturadas em JSONB", () => {
    const rawRow = {
      id: "22222222-2222-2222-2222-222222222222",
      slug: "plano-pro-anual",
      name: "Plano Pro Anual",
      description: "Acesso completo e tutores de IA",
      price: 997,
      frequency: "yearly",
      seats: 5,
      features: {
        items: ["cursos", "agentes", "anotacoes", "Suporte VIP"],
        courseAccessType: "specific",
        specificCourses: ["course-uuid-1", "course-uuid-2"],
        aiTokensUnlimited: false,
        aiTokensWeekly: 100000,
        accessTimeDays: 365,
        gateway: "Eduzz",
        producerId: "37296411",
        productId: "EDZ-99999",
        offerId: "OFR-12",
        checkoutUrl: "https://sun.eduzz.com/99999",
      },
      is_b2b: true,
      is_active: true,
      is_highlighted: true,
      gateway_product_id: "EDZ-99999",
      order_index: 0,
      created_at: "2026-08-20T10:00:00Z",
      updated_at: "2026-08-20T10:00:00Z",
    };

    const plan = mapPlan(rawRow);

    expect(plan.id).toBe("22222222-2222-2222-2222-222222222222");
    expect(plan.name).toBe("Plano Pro Anual");
    expect(plan.price).toBe(997);
    expect(plan.frequency).toBe("yearly");
    expect(plan.isB2B).toBe(true);
    expect(plan.seats).toBe(5);
    expect(plan.isHighlighted).toBe(true);
    expect(plan.features).toEqual(["cursos", "agentes", "anotacoes", "Suporte VIP"]);
    expect(plan.courseAccessType).toBe("specific");
    expect(plan.specificCourses).toEqual(["course-uuid-1", "course-uuid-2"]);
    expect(plan.aiTokensUnlimited).toBe(false);
    expect(plan.aiTokensWeekly).toBe(100000);
    expect(plan.accessTimeDays).toBe(365);
    expect(plan.gateway).toBe("Eduzz");
    expect(plan.producerId).toBe("37296411");
    expect(plan.offerId).toBe("OFR-12");
    expect(plan.checkoutUrl).toBe("https://sun.eduzz.com/99999");
    expect(plan.gatewayProductId).toBe("EDZ-99999");
  });

  it("trata valores nulos ou vazios graciosamente", () => {
    const rawRow = {
      id: "33333333-3333-3333-3333-333333333333",
      name: "Plano Grátis",
      created_at: "2026-08-20T10:00:00Z",
      updated_at: "2026-08-20T10:00:00Z",
    };

    const plan = mapPlan(rawRow);

    expect(plan.id).toBe("33333333-3333-3333-3333-333333333333");
    expect(plan.name).toBe("Plano Grátis");
    expect(plan.price).toBe(0);
    expect(plan.frequency).toBe("monthly");
    expect(plan.features).toEqual([]);
    expect(plan.isActive).toBe(true);
    expect(plan.isB2B).toBe(false);
    expect(plan.courseAccessType).toBe("all");
    expect(plan.specificCourses).toEqual([]);
    expect(plan.aiTokensUnlimited).toBe(true);
  });
});

describe("savePlan Validation Logic", () => {
  it("valida obrigatoriedade de nome e preço válido", async () => {
    const { savePlan } = await import("./platform");

    // Sem nome
    const res1 = await savePlan({ name: "", price: 100 });
    expect(res1.success).toBe(false);
    expect(res1.message).toContain("nome");

    // Preço inválido / negativo
    const res2 = await savePlan({ name: "Plano Teste", price: -10 });
    expect(res2.success).toBe(false);
    expect(res2.message).toContain("preço");
  });

  it("valida exclusão com ID inválido ou 'novo'", async () => {
    const { deletePlan } = await import("./platform");

    const res = await deletePlan("novo");
    expect(res.success).toBe(false);
    expect(res.message).toContain("inválido");
  });
});
