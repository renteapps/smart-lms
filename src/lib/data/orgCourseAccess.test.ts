import { describe, expect, it, vi } from "vitest";
import {
  grantOrgEnrollments,
  orgAllowedCourseIds,
  planAllowsCourse,
  subscriptionGrantsAccess,
} from "./orgCourseAccess";
import type { DB } from "./types";

const A = "aaaaaaaa-0000-0000-0000-000000000001";
const B = "bbbbbbbb-0000-0000-0000-000000000002";

describe("planAllowsCourse (espelho de public.plan_allows_course)", () => {
  it("libera tudo sem features ou com acesso all", () => {
    expect(planAllowsCourse(null, A)).toBe(true);
    expect(planAllowsCourse({}, A)).toBe(true);
    expect(planAllowsCourse({ courseAccessType: "all", specificCourses: [B] }, A)).toBe(true);
  });

  it("restringe aos cursos específicos", () => {
    expect(planAllowsCourse({ courseAccessType: "specific", specificCourses: [B] }, A)).toBe(false);
    expect(planAllowsCourse({ courseAccessType: "specific", specificCourses: [B] }, B)).toBe(true);
    expect(planAllowsCourse({ specificCourses: [B] }, A)).toBe(false);
    expect(planAllowsCourse({ courseAccessType: "specific" }, A)).toBe(false);
  });
});

describe("subscriptionGrantsAccess (espelho de public.subscription_grants_access)", () => {
  const now = new Date("2026-09-19T12:00:00Z");
  it("ativa vale até o fim do período; cancelada só enquanto o período pago dura", () => {
    expect(subscriptionGrantsAccess("active", null, now)).toBe(true);
    expect(subscriptionGrantsAccess("active", "2026-09-01T00:00:00Z", now)).toBe(false);
    expect(subscriptionGrantsAccess("canceled", null, now)).toBe(false);
    expect(subscriptionGrantsAccess("canceled", "2026-10-01T00:00:00Z", now)).toBe(true);
    expect(subscriptionGrantsAccess("expired", "2026-10-01T00:00:00Z", now)).toBe(false);
  });
});

function queryResult(data: unknown) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in"]) builder[method] = vi.fn(() => builder);
  builder.then = (resolve: (value: unknown) => unknown) => resolve({ data, error: null });
  return builder;
}

describe("orgAllowedCourseIds", () => {
  it("só conta assinaturas da org que dão acesso agora, com plano ativo", async () => {
    const db = {
      from: vi.fn(() =>
        queryResult([
          { status: "active", current_period_end: null, plans: { is_active: true, features: { specificCourses: [A] } } },
          { status: "expired", current_period_end: null, plans: { is_active: true, features: {} } },
          { status: "active", current_period_end: null, plans: { is_active: false, features: {} } },
        ]),
      ),
    } as unknown as DB;

    const allowed = await orgAllowedCourseIds(db, "org", [A, B]);
    expect([...allowed]).toEqual([A]);
  });

  it("sem assinatura ativa, nenhum curso é liberado", async () => {
    const db = { from: vi.fn(() => queryResult([])) } as unknown as DB;
    expect((await orgAllowedCourseIds(db, "org", [A])).size).toBe(0);
  });
});

describe("grantOrgEnrollments", () => {
  it("não sobrescreve matrícula ativa que o aluno já tem por outra origem", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const db = {
      from: vi.fn(() => ({
        ...queryResult([{ course_id: A, status: "active", gateway: "hotmart" }]),
        upsert,
      })),
    } as unknown as DB;

    await grantOrgEnrollments(db, "org-1", "user-1", [A, B]);

    expect(upsert).toHaveBeenCalledTimes(1);
    const rows = upsert.mock.calls[0][0] as { course_id: string; gateway: string; gateway_subscription_id: string }[];
    expect(rows.map((row) => row.course_id)).toEqual([B]);
    expect(rows[0]).toMatchObject({ gateway: "organization", gateway_subscription_id: "org-1" });
  });
});
