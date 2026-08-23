import { describe, expect, it } from "vitest";
import {
  DEFAULT_ASSISTANT_SOURCES,
  reachFor,
  type AssistantKnowledgeSources,
} from "@/types/platformAssistant";
import {
  buildPlatformKnowledgeContext,
  buildPlatformMap,
  normalizeKnowledgeSources,
  selectPlatformSources,
  type PlatformIndex,
} from "./platformAssistantKnowledge";

function indexFixture(): PlatformIndex {
  return {
    builtAt: Date.now(),
    courses: [
      {
        id: "course-lideranca",
        slug: "lideranca",
        title: "Liderança na Prática",
        category: "Gestão",
        level: "Essencial",
        shortDescription: "Formar líderes de equipe",
        isGallery: false,
        modules: [
          {
            id: "mod-1",
            title: "Fundamentos",
            lessons: [
              {
                id: "lesson-delegacao",
                slug: "delegacao",
                courseId: "course-lideranca",
                title: "Delegação eficaz",
                moduleTitle: "Fundamentos",
                shortDescription: "Como distribuir tarefas sem microgerenciar",
                objective: "Delegar com clareza",
                topics: ["delegacao", "autonomia"],
                solves: [],
                durationInMinutes: 12,
                order: 0,
              },
            ],
          },
        ],
      },
      {
        id: "course-financas",
        slug: "financas",
        title: "Finanças para Não Financeiros",
        category: "Finanças",
        level: "Intermediário",
        isGallery: false,
        modules: [
          {
            id: "mod-2",
            title: "Indicadores",
            lessons: [
              {
                id: "lesson-fluxo",
                slug: "fluxo-de-caixa",
                courseId: "course-financas",
                title: "Fluxo de caixa descontado",
                moduleTitle: "Indicadores",
                shortDescription: "Projeção de caixa e valuation",
                topics: ["fluxo de caixa", "valuation"],
                solves: [],
                durationInMinutes: 20,
                order: 0,
              },
            ],
          },
        ],
      },
    ],
    articles: [
      { slug: "reembolso", title: "Política de reembolso", category: "Suporte", excerpt: "Prazo de sete dias." },
    ],
    plans: [
      { id: "plan-pro", name: "Pro", description: "Acesso completo", price: 99, frequency: "monthly", features: ["Certificados"] },
    ],
    pilulas: [
      { id: "pil-1", title: "Escuta ativa", category: "Comunicação", format: "texto", summary: "Ouça antes de responder.", challenge: "", estimatedMinutes: 3 },
    ],
  };
}

const ALL: AssistantKnowledgeSources = { ...DEFAULT_ASSISTANT_SOURCES };

describe("alcance do Assistente IA", () => {
  it("libera a plataforma fora de um curso em qualquer modo", () => {
    expect(reachFor("course_strict", "platform")).toBe("platform");
    expect(reachFor("adaptive", "platform")).toBe("platform");
    expect(reachFor("platform_always", "platform")).toBe("platform");
  });

  it("aplica o modo escolhido quando há um curso aberto", () => {
    expect(reachFor("course_strict", "course")).toBe("course");
    expect(reachFor("adaptive", "course")).toBe("course_first");
    expect(reachFor("platform_always", "course")).toBe("platform");
  });
});

describe("fontes autorizadas", () => {
  it("mantém o padrão para chave ausente e respeita o que foi desligado", () => {
    const sources = normalizeKnowledgeSources({ transcriptions: false, inexistente: true });
    expect(sources.transcriptions).toBe(false);
    expect(sources.lessons).toBe(true);
    expect(sources).not.toHaveProperty("inexistente");
  });

  it("ignora valor inválido e cai no padrão", () => {
    expect(normalizeKnowledgeSources("texto solto").articles).toBe(true);
    expect(normalizeKnowledgeSources({ articles: "sim" }).articles).toBe(true);
  });
});

describe("mapa da plataforma", () => {
  it("lista cursos, aulas, artigos e planos, marcando o acesso do aluno", () => {
    const map = buildPlatformMap(indexFixture(), ALL, new Set(["course-lideranca"]));
    expect(map?.content).toContain("Liderança na Prática");
    expect(map?.content).toContain("Delegação eficaz");
    expect(map?.content).toContain("Fluxo de caixa descontado");
    expect(map?.content).toContain("acesso liberado");
    expect(map?.content).toContain("sem matrícula");
    expect(map?.content).toContain("Política de reembolso");
    expect(map?.content).toContain("Pro");
  });

  it("resume para módulos e depois para cursos quando o orçamento aperta", () => {
    const index = indexFixture();
    // Cada orçamento é derivado do nível anterior: um caractere a menos que o
    // detalhado obriga a cair para módulos, e assim por diante.
    const completo = buildPlatformMap(index, ALL, new Set(), 100_000)!;
    expect(completo.content).toContain("Delegação eficaz");

    const porModulo = buildPlatformMap(index, ALL, new Set(), completo.content.length - 1)!;
    expect(porModulo.content).toContain("Módulos: Fundamentos");
    expect(porModulo.content).not.toContain("Delegação eficaz");

    const soCursos = buildPlatformMap(index, ALL, new Set(), porModulo.content.length - 1)!;
    expect(soCursos.content).toContain("Liderança na Prática");
    expect(soCursos.content).not.toContain("Módulos:");
  });

  it("omite as fontes que o admin desligou", () => {
    const map = buildPlatformMap(indexFixture(), { ...ALL, articles: false, plans: false }, new Set());
    expect(map?.content).not.toContain("Política de reembolso");
    expect(map?.content).not.toContain("ARTIGOS");
    expect(map?.content).not.toContain("PLANOS");
    expect(map?.content).toContain("Liderança na Prática");
  });
});

describe("seleção global de fontes", () => {
  it("encontra a aula certa mesmo quando ela está em outro curso", () => {
    const selected = selectPlatformSources({
      index: indexFixture(),
      sources: ALL,
      question: "como projetar o fluxo de caixa da empresa?",
      limit: 2,
    });
    expect(selected[0].id).toBe("lesson-fluxo");
  });

  it("não repete o curso aberto, que já entra pelo bloco dedicado", () => {
    const selected = selectPlatformSources({
      index: indexFixture(),
      sources: ALL,
      question: "delegação",
      limit: 10,
      excludeCourseId: "course-lideranca",
    });
    expect(selected.some((item) => item.id === "lesson-delegacao")).toBe(false);
    expect(selected.some((item) => item.id === "course-lideranca")).toBe(false);
  });

  it("some com os artigos quando a fonte está desligada", () => {
    const selected = selectPlatformSources({
      index: indexFixture(),
      sources: { ...ALL, articles: false },
      question: "reembolso",
      limit: 10,
    });
    expect(selected.some((item) => item.kind === "article")).toBe(false);
  });
});

describe("contexto global do assistente", () => {
  const selected = () =>
    selectPlatformSources({
      index: indexFixture(),
      sources: ALL,
      question: "fluxo de caixa descontado",
      limit: 3,
    });

  it("anexa corpo e transcrição da aula quando o aluno tem acesso", () => {
    const context = buildPlatformKnowledgeContext({
      index: indexFixture(),
      sources: ALL,
      manualKnowledge: "",
      selected: selected(),
      budget: 40_000,
      accessibleCourseIds: new Set(["course-financas"]),
      bodies: new Map([
        ["lesson:lesson-fluxo", { content: "CORPO_DA_AULA", transcription: "TRANSCRICAO_DA_AULA" }],
      ]),
    });
    expect(context.text).toContain("CORPO_DA_AULA");
    expect(context.text).toContain("TRANSCRICAO_DA_AULA");
    expect(context.text).not.toContain("sem matrícula neste curso");
  });

  it("entrega apenas a ementa e avisa quando o aluno não tem acesso ao curso", () => {
    const context = buildPlatformKnowledgeContext({
      index: indexFixture(),
      sources: ALL,
      manualKnowledge: "",
      selected: selected(),
      budget: 40_000,
      accessibleCourseIds: new Set(),
      bodies: new Map([
        ["lesson:lesson-fluxo", { content: "CORPO_DA_AULA", transcription: "TRANSCRICAO_DA_AULA" }],
      ]),
    });
    expect(context.text).not.toContain("CORPO_DA_AULA");
    expect(context.text).toContain("Projeção de caixa e valuation");
    expect(context.text).toContain("sem matrícula neste curso");
  });

  it("mantém o conteúdo da aula mas corta a transcrição quando a fonte é desligada", () => {
    const sources = { ...ALL, transcriptions: false };
    const context = buildPlatformKnowledgeContext({
      index: indexFixture(),
      sources,
      manualKnowledge: "",
      selected: selectPlatformSources({ index: indexFixture(), sources, question: "fluxo de caixa", limit: 3 }),
      budget: 40_000,
      accessibleCourseIds: new Set(["course-financas"]),
      bodies: new Map([["lesson:lesson-fluxo", { content: "CORPO_DA_AULA", transcription: "TRANSCRICAO_DA_AULA" }]]),
    });
    expect(context.text).toContain("CORPO_DA_AULA");
    expect(context.text).not.toContain("TRANSCRICAO_DA_AULA");
  });

  it("não lê o corpo de aula nenhuma quando o conteúdo das aulas está desligado", () => {
    const sources = { ...ALL, lessons: false };
    const context = buildPlatformKnowledgeContext({
      index: indexFixture(),
      sources,
      manualKnowledge: "",
      selected: selectPlatformSources({ index: indexFixture(), sources, question: "fluxo de caixa", limit: 3 }),
      budget: 40_000,
      accessibleCourseIds: new Set(["course-financas"]),
      bodies: new Map([["lesson:lesson-fluxo", { content: "CORPO_DA_AULA" }]]),
    });
    expect(context.text).not.toContain("CORPO_DA_AULA");
    expect(context.text).toContain("Fluxo de caixa descontado");
  });

  it("abre com a base manual e inclui o mapa antes das fontes ranqueadas", () => {
    const context = buildPlatformKnowledgeContext({
      index: indexFixture(),
      sources: ALL,
      manualKnowledge: "Atendimento de segunda a sexta.",
      selected: selected(),
      budget: 40_000,
      accessibleCourseIds: new Set(),
    });
    expect(context.sources[0].id).toBe("manual");
    expect(context.sources[1].id).toBe("platform-map");
    expect(context.text).toContain("Atendimento de segunda a sexta.");
  });
});
