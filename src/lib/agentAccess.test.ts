import { describe, expect, it, vi } from "vitest";
import {
  checkAgentAccess,
  formatAgentAccessSummary,
  getAgentUserAccessContext,
  getAvailableCourses,
  getAvailablePlans,
} from "./data/agentAccess";
import type { Agent } from "@/types/agente";
import type { DB, Row } from "./data/types";

function makeMockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "ag-test",
    slug: "test-agent",
    name: "Agente Teste",
    role: "Tutor",
    description: "Descrição de teste",
    category: "Comunicação",
    status: "Disponível",
    avatar: "tutor",
    createdBy: "Admin",
    courseTitle: "Curso Geral",
    skills: [],
    conversationsCount: 0,
    rating: 5,
    avgMinutes: 5,
    greeting: "Olá",
    starters: [],
    replies: [],
    fallbacks: [],
    ...overrides,
  };
}

describe("checkAgentAccess", () => {
  it("concede acesso irrestrito para administradores", () => {
    const agent = makeMockAgent({
      courseIds: ["c1", "c2"],
      planIds: ["2", "3"],
    });

    const result = checkAgentAccess(agent, { isAdmin: true });
    expect(result.hasAccess).toBe(true);
    expect(result.reason).toBe("admin");
  });

  it("concede acesso livre quando o agente não possui cursos nem planos vinculados", () => {
    const agent = makeMockAgent({
      courseIds: [],
      planIds: [],
    });

    const result = checkAgentAccess(agent, {
      userId: "user-1",
      enrolledCourseIds: [],
      activePlanIds: [],
    });

    expect(result.hasAccess).toBe(true);
    expect(result.isRestricted).toBe(false);
    expect(result.reason).toBe("unrestricted");
  });

  it("bloqueia aluno sem matrícula quando o agente exige cursos específicos", () => {
    const agent = makeMockAgent({
      courseIds: ["c1", "c4"],
      courseTitles: ["Comunicação", "Feedback"],
    });

    const result = checkAgentAccess(agent, {
      userId: "user-1",
      enrolledCourseIds: ["c2"],
      activePlanIds: [],
    });

    expect(result.hasAccess).toBe(false);
    expect(result.isRestricted).toBe(true);
    expect(result.reason).toBe("no_access");
  });

  it("libera acesso quando o aluno está matriculado em pelo menos um dos cursos vinculados", () => {
    const agent = makeMockAgent({
      courseIds: ["c1", "c4"],
      courseTitles: ["Comunicação", "Feedback"],
    });

    const result = checkAgentAccess(agent, {
      userId: "user-1",
      enrolledCourseIds: ["c4"],
      activePlanIds: [],
    });

    expect(result.hasAccess).toBe(true);
    expect(result.reason).toBe("enrolled_course");
  });

  it("libera acesso quando o aluno possui um dos planos vinculados", () => {
    const agent = makeMockAgent({
      planIds: ["2", "3"],
      planNames: ["Plano Pro", "Plano Vitalício"],
    });

    const result = checkAgentAccess(agent, {
      userId: "user-1",
      enrolledCourseIds: [],
      activePlanIds: ["2"],
    });

    expect(result.hasAccess).toBe(true);
    expect(result.reason).toBe("active_plan");
  });

  it("libera acesso se o aluno tiver ou o curso OU o plano vinculado", () => {
    const agent = makeMockAgent({
      courseIds: ["c4"],
      courseTitles: ["Feedback que transforma"],
      planIds: ["3"],
      planNames: ["Plano Vitalício"],
    });

    // Caso 1: tem apenas o curso
    const res1 = checkAgentAccess(agent, {
      enrolledCourseIds: ["c4"],
      activePlanIds: ["1"], // plano básico, não é o 3
    });
    expect(res1.hasAccess).toBe(true);
    expect(res1.reason).toBe("enrolled_course");

    // Caso 2: tem apenas o plano
    const res2 = checkAgentAccess(agent, {
      enrolledCourseIds: ["c1"], // outro curso
      activePlanIds: ["3"], // plano vitalício
    });
    expect(res2.hasAccess).toBe(true);
    expect(res2.reason).toBe("active_plan");

    // Caso 3: não tem nenhum dos dois
    const res3 = checkAgentAccess(agent, {
      enrolledCourseIds: ["c1"],
      activePlanIds: ["1"],
    });
    expect(res3.hasAccess).toBe(false);
    expect(res3.reason).toBe("no_access");
  });
});

describe("formatAgentAccessSummary", () => {
  it("formata acesso livre quando não há vínculos", () => {
    const agent = makeMockAgent({ courseIds: [], planIds: [] });
    expect(formatAgentAccessSummary(agent)).toBe("Acesso livre para todos os alunos da plataforma");
  });

  it("formata resumo para um único curso vinculado", () => {
    const agent = makeMockAgent({
      courseIds: ["c1"],
      courseTitles: ["Comunicação que move pessoas"],
    });
    expect(formatAgentAccessSummary(agent)).toBe("Disponível para alunos de Curso “Comunicação que move pessoas”");
  });

  it("formata resumo para múltiplos cursos vinculados", () => {
    const agent = makeMockAgent({
      courseIds: ["c1", "c2", "c3"],
      courseTitles: ["C1", "C2", "C3"],
    });
    expect(formatAgentAccessSummary(agent)).toBe("Disponível para alunos de 3 cursos vinculados");
  });

  it("formata resumo para um único plano vinculado", () => {
    const agent = makeMockAgent({
      planIds: ["2"],
      planNames: ["Plano Pro"],
    });
    expect(formatAgentAccessSummary(agent)).toBe("Disponível para alunos de Plano “Plano Pro”");
  });

  it("formata resumo combinado de cursos e planos", () => {
    const agent = makeMockAgent({
      courseIds: ["c1", "c2"],
      courseTitles: ["C1", "C2"],
      planIds: ["2", "3"],
      planNames: ["Plano Pro", "Plano Vitalício"],
    });
    expect(formatAgentAccessSummary(agent)).toBe("Disponível para alunos de 2 cursos vinculados ou 2 planos vinculados");
  });
});

describe("getAvailableCourses e getAvailablePlans", () => {
  it("devolve cursos padrão quando db não é fornecido", async () => {
    const courses = await getAvailableCourses();
    expect(courses.length).toBeGreaterThan(0);
    expect(courses[0]).toHaveProperty("id");
    expect(courses[0]).toHaveProperty("name");
  });

  it("devolve planos padrão quando db não é fornecido", async () => {
    const plans = await getAvailablePlans();
    expect(plans.length).toBeGreaterThan(0);
    expect(plans[0]).toHaveProperty("id");
    expect(plans[0]).toHaveProperty("name");
  });
});

function makeMockDb(params: {
  profile?: Row | null;
  enrollments?: Row[];
  subscriptions?: Row[];
}): DB {
  const { profile = null, enrollments = [], subscriptions = [] } = params;

  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: profile, error: null }) }) }),
        };
      }
      if (table === "enrollments") {
        return {
          select: () => ({ eq: () => Promise.resolve({ data: enrollments, error: null }) }),
        };
      }
      if (table === "subscriptions") {
        return {
          select: () => ({ eq: () => Promise.resolve({ data: subscriptions, error: null }) }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("getAgentUserAccessContext", () => {
  it("marca isAdmin a partir de profiles.role", async () => {
    const db = makeMockDb({ profile: { role: "admin" } });
    const context = await getAgentUserAccessContext(db, "user-1");
    expect(context.isAdmin).toBe(true);
  });

  it("só inclui matrículas ativas e não vencidas", async () => {
    const db = makeMockDb({
      enrollments: [
        { course_id: "c1", status: "active", expires_at: null },
        { course_id: "c2", status: "active", expires_at: "2020-01-01T00:00:00Z" },
        { course_id: "c3", status: "canceled", expires_at: null },
      ],
    });
    const context = await getAgentUserAccessContext(db, "user-1");
    expect(context.enrolledCourseIds).toEqual(["c1"]);
  });

  it("só inclui assinaturas ativas de planos ativos", async () => {
    const db = makeMockDb({
      subscriptions: [
        { plan_id: "p1", status: "active", current_period_end: null, plans: { is_active: true } },
        { plan_id: "p2", status: "canceled", current_period_end: "2020-01-01T00:00:00Z", plans: { is_active: true } },
        { plan_id: "p3", status: "active", current_period_end: null, plans: { is_active: false } },
      ],
    });
    const context = await getAgentUserAccessContext(db, "user-1");
    expect(context.activePlanIds).toEqual(["p1"]);
  });
});
