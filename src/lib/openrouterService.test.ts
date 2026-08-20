import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getOpenRouterResponseText,
  getOpenRouterServerConfig,
  getOpenRouterUnavailableReason,
} from "./openrouterService";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("disponibilidade do OpenRouter para agentes", () => {
  it("bloqueia integração desativada ou sem chave antes de consumir crédito", () => {
    expect(getOpenRouterUnavailableReason({ enabled: false, apiKey: "sk-or", status: "connected" }))
      .toBe("disabled");
    expect(getOpenRouterUnavailableReason({ enabled: true, apiKey: "", status: "disconnected" }))
      .toBe("missing_api_key");
  });

  it("bloqueia chave inválida e limite atingido", () => {
    expect(getOpenRouterUnavailableReason({ enabled: true, apiKey: "sk-or", status: "invalid_key" }))
      .toBe("invalid_key");
    expect(getOpenRouterUnavailableReason({ enabled: true, apiKey: "sk-or", status: "rate_limited" }))
      .toBe("rate_limited");
  });

  it("aceita configuração ativa com chave", () => {
    expect(getOpenRouterUnavailableReason({ enabled: true, apiKey: "sk-or", status: "connected" }))
      .toBeNull();
  });

  it("usa a chave de ambiente quando não há service role para ler a tabela administrativa", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", " sk-or-env ");
    vi.stubEnv("OPENROUTER_DEFAULT_MODEL", "openai/gpt-4o-mini");

    const config = await getOpenRouterServerConfig();

    expect(config).toMatchObject({
      apiKey: "sk-or-env",
      defaultModel: "openai/gpt-4o-mini",
      enabled: true,
      status: "connected",
    });
  });
});

describe("resposta real do OpenRouter", () => {
  it("rejeita simulação, erro e conteúdo vazio", () => {
    expect(getOpenRouterResponseText({ success: true, text: "demo", simulated: true })).toBeNull();
    expect(getOpenRouterResponseText({ success: false, error: "falhou" })).toBeNull();
    expect(getOpenRouterResponseText({ success: true, text: "   " })).toBeNull();
  });

  it("normaliza o texto real antes de persistir", () => {
    expect(getOpenRouterResponseText({ success: true, text: "  Resposta real  " })).toBe("Resposta real");
  });
});
