import { describe, it, expect, beforeEach } from "vitest";
import {
  getResendConfig,
  saveResendConfig,
  validateResendApiKey,
  sendEmail,
  getEmailLogs,
  clearEmailLogs,
  DEFAULT_RESEND_CONFIG,
} from "./resendService";
import {
  generateEmailHtml,
  interpolateVariables,
  saveCustomTemplate,
  resetCustomTemplate,
  getCustomTemplates,
  getDefaultTemplateDefinitions,
} from "./emailTemplates";
import { CustomEmailTemplate } from "@/types/resend";

describe("Resend Integration Service", () => {
  beforeEach(() => {
    clearEmailLogs();
    saveResendConfig(DEFAULT_RESEND_CONFIG);
  });

  it("should return default configuration", () => {
    const config = getResendConfig();
    expect(config.fromName).toBe("Smart LMS");
    expect(config.categories.platform.welcome).toBe(true);
    expect(config.categories.notifications.newContent).toBe(true);
  });

  it("should update and persist configuration changes", () => {
    const updated = saveResendConfig({
      fromName: "Nova Academia Digital",
      fromEmail: "contato@academia.com",
    });

    expect(updated.fromName).toBe("Nova Academia Digital");
    expect(updated.fromEmail).toBe("contato@academia.com");

    const current = getResendConfig();
    expect(current.fromName).toBe("Nova Academia Digital");
  });

  it("should validate API key formats properly", async () => {
    const emptyResult = await validateResendApiKey("");
    expect(emptyResult.valid).toBe(false);

    const invalidResult = await validateResendApiKey("sk_test_12345");
    expect(invalidResult.valid).toBe(false);

    // Key starting with re_ with successful fetch mock
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    try {
      const validFormatResult = await validateResendApiKey("re_123456789_abcdefg");
      expect(validFormatResult.valid).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should interpolate dynamic tags in templates", () => {
    const templateStr = "Olá {{nome}}, seu acesso ao curso {{nome_curso}} na plataforma {{nome_plataforma}} está liberado!";
    const result = interpolateVariables(templateStr, {
      nome: "Mariana Souza",
      nome_curso: "Design System Avançado",
      nome_plataforma: "Smart LMS",
    });

    expect(result).toBe("Olá Mariana Souza, seu acesso ao curso Design System Avançado na plataforma Smart LMS está liberado!");
  });

  it("should save and use custom HTML template", () => {
    const defaultWelcome = getDefaultTemplateDefinitions().find((t) => t.type === "welcome")!;
    const customTemplate: CustomEmailTemplate = {
      ...defaultWelcome,
      subject: "Especial para você, {{nome}}!",
      html: "<div class='custom-email'><h1>Bem-vindo {{nome}} ao {{nome_plataforma}}</h1></div>",
      isCustomized: true,
    };

    saveCustomTemplate(customTemplate);

    const generated = generateEmailHtml("welcome", {
      nome: "Roberto Carlos",
      nome_plataforma: "Smart LMS Pro",
    });

    expect(generated.subject).toBe("Especial para você, Roberto Carlos!");
    expect(generated.html).toContain("Bem-vindo Roberto Carlos ao Smart LMS Pro");

    // Resetting template
    const reset = resetCustomTemplate("welcome");
    expect(reset.isCustomized).toBe(false);
  });

  it("should generate HTML templates for all template types", () => {
    const types = [
      "welcome",
      "password_reset",
      "course_enrollment",
      "certificate",
      "subscription",
      "inactivity",
      "notification",
    ] as const;

    for (const type of types) {
      const result = generateEmailHtml(type, {
        name: "Carlos Teste",
        courseTitle: "Next.js Avançado",
      });

      expect(result.subject).toBeTruthy();
      expect(result.html).toContain("Smart LMS");
      expect(result.html).toContain("<!DOCTYPE html>");
    }
  });

  it("should simulate email send when no real API key is configured", async () => {
    const result = await sendEmail({
      to: "aluno@teste.com",
      subject: "Boas-vindas",
      template: "welcome",
      data: { name: "Aluno Teste" },
    });

    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
    expect(result.id).toMatch(/^sim_/);

    const logs = getEmailLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].to).toBe("aluno@teste.com");
    expect(logs[0].status).toBe("simulated");
  });

  it("should handle disabled email integration", async () => {
    saveResendConfig({ enabled: false });

    const result = await sendEmail({
      to: "aluno@teste.com",
      subject: "Teste",
      text: "Mensagem de teste",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("desabilitado");
  });
});
