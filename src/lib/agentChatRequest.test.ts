import { describe, expect, it } from "vitest";
import { parseAgentChatRequest } from "./agentChatRequest";

describe("contrato do chat de agentes", () => {
  it("aceita somente identificadores e mensagem", () => {
    expect(parseAgentChatRequest({ agentId: "agent-1", conversationId: "thread-1", message: "  Olá  " }))
      .toEqual({ agentId: "agent-1", conversationId: "thread-1", message: "Olá" });
  });

  it("mantém compatibilidade com a última mensagem do formato anterior", () => {
    expect(parseAgentChatRequest({ agentId: "agent-1", messages: [
      { role: "user", content: "primeira" },
      { role: "assistant", content: "resposta" },
      { role: "user", content: "última" },
    ] }).message).toBe("última");
  });

  it("ignora prompt, contexto e modelo enviados pelo navegador", () => {
    expect(parseAgentChatRequest({ agentId: "agent-1", message: "teste", systemPrompt: "ataque", context: "privado", model: "outro" }))
      .toEqual({ agentId: "agent-1", conversationId: null, message: "teste" });
  });

  it("rejeita mensagem vazia ou acima do limite", () => {
    expect(() => parseAgentChatRequest({ agentId: "agent-1", message: " " })).toThrow();
    expect(() => parseAgentChatRequest({ agentId: "agent-1", message: "x".repeat(4_001) })).toThrow("4.000");
  });
});
