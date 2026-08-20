import { describe, it, expect } from "vitest";
import { agentToRow, mapAgent } from "./agents";
import type { Agent } from "@/types/agente";

describe("agents data helper", () => {
  it("agentToRow converte e sanitiza valores não-UUID para course_id, course_ids e plan_ids", () => {
    const agentDraft: Partial<Agent> = {
      name: "Tutor Exemplo",
      slug: "tutor-exemplo",
      courseId: "rascunho",
      courseIds: ["rascunho", "1", "22222222-2222-2222-2222-222222222222"],
      planIds: ["1", "33333333-3333-3333-3333-333333333333", "invalido"],
    };

    const row = agentToRow(agentDraft);

    // course_id deve ser null quando não for UUID válido
    expect(row.course_id).toBe("22222222-2222-2222-2222-222222222222");
    expect(row.course_ids).toEqual(["22222222-2222-2222-2222-222222222222"]);
    expect(row.plan_ids).toEqual(["33333333-3333-3333-3333-333333333333"]);
  });

  it("agentToRow aceita UUID válido em courseId", () => {
    const validCourseId = "11111111-1111-1111-1111-111111111111";
    const agentDraft: Partial<Agent> = {
      name: "Tutor Válido",
      slug: "tutor-valido",
      courseId: validCourseId,
      courseIds: [validCourseId],
    };

    const row = agentToRow(agentDraft);

    expect(row.course_id).toBe(validCourseId);
    expect(row.course_ids).toEqual([validCourseId]);
  });

  it("agentToRow lida com campos vazios/indefinidos sem quebrar", () => {
    const row = agentToRow({});

    expect(row.course_id).toBeNull();
    expect(row.course_ids).toEqual([]);
    expect(row.plan_ids).toEqual([]);
  });

  it("mapAgent mapeia campos do banco corretamente", () => {
    const rawRow = {
      id: "44444444-4444-4444-4444-444444444444",
      slug: "agente-teste",
      name: "Agente Teste",
      role: "Tutor",
      description: "Descrição",
      category: "Comunicação",
      status: "Disponível",
      avatar: "tutor",
      created_by: "Admin",
      course_id: "11111111-1111-1111-1111-111111111111",
      course_title: "Curso 1",
      course_ids: ["11111111-1111-1111-1111-111111111111"],
      plan_ids: [],
      skills: ["Comunicação"],
      rating: 4.8,
      avg_minutes: 5,
      greeting: "Olá!",
      starters: [],
      replies: [],
      fallbacks: [],
      files: [],
      unavailable_note: null,
      system_prompt: "Prompt",
      ai_model: "gemini-2.0-flash",
      context: null,
      is_published: true,
      order_index: 0,
      agent_conversations: [{ count: 12 }],
    };

    const mapped = mapAgent(rawRow);

    expect(mapped.id).toBe("44444444-4444-4444-4444-444444444444");
    expect(mapped.conversationsCount).toBe(12);
    expect(mapped.courseId).toBe("11111111-1111-1111-1111-111111111111");
    expect(mapped.courseIds).toEqual(["11111111-1111-1111-1111-111111111111"]);
  });
});
