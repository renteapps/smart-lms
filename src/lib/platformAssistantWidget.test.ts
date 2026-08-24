import { describe, expect, it } from "vitest";
import { assistantStarters, keyboardInset, scopeFromPath, scopeKey, scopeQuery } from "./platformAssistantWidget";

describe("scopeFromPath", () => {
  it("trata qualquer tela fora de curso como plataforma", () => {
    expect(scopeFromPath("/")).toEqual({ kind: "platform" });
    expect(scopeFromPath("/trilha")).toEqual({ kind: "platform" });
    expect(scopeFromPath("/coursesomething")).toEqual({ kind: "platform" });
  });

  it("reconhece curso e aula, decodificando o slug da URL", () => {
    expect(scopeFromPath("/courses/comunicacao-assertiva")).toEqual({
      kind: "course",
      courseId: "comunicacao-assertiva",
      lessonId: undefined,
    });
    expect(scopeFromPath("/courses/curso%20novo/lessons/aula%201")).toEqual({
      kind: "course",
      courseId: "curso novo",
      lessonId: "aula 1",
    });
  });
});

describe("scopeKey", () => {
  it("separa a conversa por curso e por aula", () => {
    expect(scopeKey({ kind: "platform" })).toBe("platform");
    expect(scopeKey({ kind: "course", courseId: "abc" })).toBe("course:abc:overview");
    expect(scopeKey({ kind: "course", courseId: "abc", lessonId: "l1" })).toBe("course:abc:l1");
  });
});

describe("scopeQuery", () => {
  it("envia apenas os campos do escopo atual", () => {
    expect(scopeQuery({ kind: "platform" })).toBe("kind=platform");
    expect(scopeQuery({ kind: "course", courseId: "abc" })).toBe("kind=course&courseId=abc");
    expect(scopeQuery({ kind: "course", courseId: "abc", lessonId: "l1" })).toBe(
      "kind=course&courseId=abc&lessonId=l1",
    );
  });
});

describe("keyboardInset", () => {
  it("é zero sem visualViewport (navegadores antigos e SSR)", () => {
    expect(keyboardInset(800, null)).toBe(0);
    expect(keyboardInset(800, undefined)).toBe(0);
  });

  it("ignora a barra do navegador, que não é teclado", () => {
    expect(keyboardInset(800, { height: 740, offsetTop: 0 })).toBe(0);
  });

  it("devolve a altura do teclado quando ele abre", () => {
    expect(keyboardInset(844, { height: 508, offsetTop: 0 })).toBe(336);
  });

  it("desconta a rolagem do visual viewport (iOS empurra a página para cima)", () => {
    expect(keyboardInset(844, { height: 508, offsetTop: 100 })).toBe(236);
  });

  it("nunca devolve valor negativo quando o viewport é maior que o layout", () => {
    expect(keyboardInset(800, { height: 900, offsetTop: 0 })).toBe(0);
  });
});

describe("assistantStarters", () => {
  it("sugere perguntas diferentes conforme a tela", () => {
    const platform = assistantStarters({ kind: "platform" });
    const course = assistantStarters({ kind: "course", courseId: "abc" });
    const lesson = assistantStarters({ kind: "course", courseId: "abc", lessonId: "l1" });

    expect(platform).not.toEqual(course);
    expect(course).not.toEqual(lesson);
    expect(lesson.every((starter) => starter.length > 0)).toBe(true);
  });
});
