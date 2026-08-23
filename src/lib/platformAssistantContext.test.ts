import { describe, expect, it } from "vitest";
import type { Course, Lesson } from "@/types/course";
import type { AssistantMessage } from "@/types/platformAssistant";
import {
  assistantQueryTerms,
  buildCourseAssistantContext,
  buildPlatformAssistantContext,
  conversationTitle,
  mergeAssistantContexts,
  rankSources,
  stripMarkup,
  trimAssistantHistory,
  type AssistantContextSource,
} from "./platformAssistantContext";

function lesson(id: string, title: string, content: string, isPublished = true): Lesson {
  return {
    id,
    title,
    type: "text",
    content,
    blocks: [],
    attachments: [],
    durationInMinutes: 10,
    isPublished,
  };
}

function courseFixture(): Course {
  return {
    id: "course-a",
    slug: "curso-a",
    title: "Curso A",
    description: "Descrição exclusiva do curso A",
    category: "Gestão",
    level: "Essencial",
    isPublished: true,
    layout: "modules",
    modules: [
      {
        id: "module-a",
        title: "Fundamentos",
        order: 0,
        lessons: [
          lesson("lesson-first", "Primeira aula", "Conceitos introdutórios"),
          lesson("lesson-current", "Feedback", "Aula atual sobre feedback estruturado"),
          lesson("lesson-draft", "Rascunho sigiloso", "CONTEUDO_NAO_PUBLICADO", false),
        ],
      },
      {
        id: "module-b",
        title: "Prática",
        order: 1,
        lessons: [lesson("lesson-related", "Conversas", "Feedback estruturado em conversas difíceis")],
      },
    ],
  };
}

describe("contexto do Assistente IA", () => {
  it("remove HTML, scripts, comentários e mantém somente texto seguro", () => {
    expect(stripMarkup('<h1>Título</h1><script>alert("x")</script><p>Texto &amp; apoio</p><!-- segredo -->'))
      .toBe("Título Texto & apoio");
  });

  it("prioriza a aula atual e exclui aulas não publicadas", () => {
    const context = buildCourseAssistantContext(courseFixture(), "Como estruturar feedback?", "lesson-current");
    expect(context.sources.map((source) => source.id)).toEqual([
      "lesson-current",
      "course-a",
      "lesson-related",
      "lesson-first",
    ]);
    expect(context.text).not.toContain("CONTEUDO_NAO_PUBLICADO");
  });

  it("respeita o orçamento e nunca introduz conteúdo de outro curso", () => {
    const fixture = courseFixture();
    fixture.modules[0].lessons[0].content = `${"conteúdo ".repeat(2_000)} MARCADOR_CURSO_A`;
    const context = buildCourseAssistantContext(fixture, "conteúdo", undefined, 600);
    expect(context.text.length).toBeLessThanOrEqual(600);
    expect(context.text).not.toContain("MARCADOR_CURSO_B");
  });

  it("mantém a aula atual como primeira fonte mesmo quando o orçamento é pequeno", () => {
    const fixture = courseFixture();
    fixture.description = "descrição do curso ".repeat(500);
    const context = buildCourseAssistantContext(fixture, "feedback", "lesson-current", 180);
    expect(context.sources[0].id).toBe("lesson-current");
    expect(context.text).toContain("Aula atual sobre feedback");
  });

  it("inclui a base manual e seleciona no máximo seis fontes gerais relevantes", () => {
    const sources: AssistantContextSource[] = Array.from({ length: 9 }, (_, index) => ({
      id: `article-${index}`,
      kind: "article",
      title: `Artigo ${index}`,
      content: index === 8 ? "política de cancelamento e reembolso" : `conteúdo genérico ${index}`,
    }));
    const context = buildPlatformAssistantContext("Atendimento de segunda a sexta.", sources, "Como funciona o reembolso?");
    expect(context.sources[0].id).toBe("manual");
    expect(context.sources).toHaveLength(7);
    expect(context.sources[1].id).toBe("article-8");
  });

  it("reserva orçamento para fontes automáticas mesmo com uma base manual extensa", () => {
    const context = buildPlatformAssistantContext(
      "manual ".repeat(1_000),
      [{ id: "plan", kind: "plan", title: "Plano ativo", content: "Detalhes do plano" }],
      "plano",
      400,
    );
    expect(context.sources.map((source) => source.id)).toEqual(["manual", "plan"]);
    expect(context.text.length).toBeLessThanOrEqual(400);
  });

  it("mantém somente o final do histórico dentro do orçamento", () => {
    const messages: AssistantMessage[] = [
      { id: "1", author: "user", content: "a".repeat(100), createdAt: "2026-01-01" },
      { id: "2", author: "assistant", content: "b".repeat(100), createdAt: "2026-01-01" },
      { id: "3", author: "user", content: "pergunta recente", createdAt: "2026-01-01" },
    ];
    expect(trimAssistantHistory(messages, 80).map((message) => message.id)).toEqual(["3"]);
  });

  it("descarta stopwords da pergunta e mantém os termos que discriminam", () => {
    expect(assistantQueryTerms("Como funciona o certificado do curso?")).toEqual(["funciona", "certificado"]);
  });

  it("volta aos termos brutos quando a pergunta só tem stopwords", () => {
    expect(assistantQueryTerms("Como posso ajuda?")).toEqual(["como", "posso", "ajuda"]);
  });

  it("prefere a fonte que cobre mais termos da pergunta", () => {
    const cobre: AssistantContextSource = {
      id: "cobre",
      kind: "article",
      title: "Prazo e valor do certificado digital",
      content: "Explicação",
    };
    const repete: AssistantContextSource = {
      id: "repete",
      kind: "article",
      title: "Certificados",
      content: "certificado ".repeat(40),
    };
    expect(rankSources([repete, cobre], "prazo do certificado digital", 2)[0].id).toBe("cobre");
  });

  it("não lê o corpo da aula quando a fonte de conteúdo está desligada", () => {
    const fixture = courseFixture();
    fixture.modules[0].lessons[1].content = "CORPO_INTERNO_DA_AULA";
    fixture.modules[0].lessons[1].transcription = "TRANSCRICAO_DA_AULA";
    fixture.modules[0].lessons[1].shortDescription = "Ementa pública da aula";

    const context = buildCourseAssistantContext(fixture, "feedback", "lesson-current", 120_000, {
      includeLessonBody: false,
    });
    expect(context.text).not.toContain("CORPO_INTERNO_DA_AULA");
    expect(context.text).not.toContain("TRANSCRICAO_DA_AULA");
    expect(context.text).toContain("Ementa pública da aula");
  });

  it("mantém a aula e corta só a transcrição quando ela é desligada", () => {
    const fixture = courseFixture();
    fixture.modules[0].lessons[1].content = "CORPO_INTERNO_DA_AULA";
    fixture.modules[0].lessons[1].transcription = "TRANSCRICAO_DA_AULA";

    const context = buildCourseAssistantContext(fixture, "feedback", "lesson-current", 120_000, {
      includeTranscriptions: false,
    });
    expect(context.text).toContain("CORPO_INTERNO_DA_AULA");
    expect(context.text).not.toContain("TRANSCRICAO_DA_AULA");
  });

  it("une blocos empacotados sem repetir a mesma fonte", () => {
    const bloco = { text: "[Fonte: A]\nconteúdo", sources: [{ id: "a", kind: "course" as const, title: "A", characters: 8 }] };
    const merged = mergeAssistantContexts(bloco, bloco);
    expect(merged.sources).toHaveLength(1);
    expect(merged.text).toContain("[Fonte: A]");
  });

  it("gera títulos curtos sem carregar marcação", () => {
    const title = conversationTitle(`<strong>${"Uma pergunta longa ".repeat(10)}</strong>`);
    expect(title).not.toContain("<strong>");
    expect(title.length).toBeLessThanOrEqual(80);
  });
});
