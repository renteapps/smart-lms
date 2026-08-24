import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OnboardingIntro } from "./OnboardingIntro";

const baseProps = {
  questionCount: 6,
  estimatedMinutes: 3,
  isPreparing: false,
  hasExistingTrail: false,
  onStart: () => {},
};

describe("OnboardingIntro", () => {
  it("abre explicando o porquê do teste e convida a começar", () => {
    const html = renderToStaticMarkup(<OnboardingIntro {...baseProps} />);

    expect(html).toContain("Antes de começar");
    expect(html).toContain("Conteúdo para o seu problema");
    expect(html).toContain("6 perguntas");
    expect(html).toContain("Cerca de 3 minutos");
    expect(html).toContain("Começar");
    expect(html).not.toContain('disabled=""');
  });

  it("fala em refazer quando a pessoa já tem trilha", () => {
    const html = renderToStaticMarkup(<OnboardingIntro {...baseProps} hasExistingTrail />);

    expect(html).toContain("Atualizar seu perfil");
    expect(html).toContain("Refazer diagnóstico");
    expect(html).not.toContain("Antes de começar");
  });

  it("segura o botão enquanto o questionário não chegou, sem prometer números", () => {
    const html = renderToStaticMarkup(<OnboardingIntro {...baseProps} isPreparing questionCount={0} />);

    expect(html).toContain("Preparando as perguntas");
    expect(html).toContain('disabled=""');
    expect(html).not.toContain("0 perguntas");
  });
});
