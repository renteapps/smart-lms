"use client";

import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button, Chip, Input, Label, TextField } from "@heroui/react";
import { AgentAvatar } from "@/components/agentes/AgentAvatar";
import { getAgentReply, matchScriptedReply, normalizeText } from "@/lib/agentChat";
import type { Agent } from "@/types/agente";

/** Resultado de um teste de roteiro: qual resposta casou e por quê. */
type TestResult = {
  message: string;
  text: string;
  matchedId: string | null;
  matchedKeywords: string[];
};

/**
 * Roda a engine real contra o roteiro — o mesmo `matchScriptedReply` que atende
 * o aluno, sem `typingDelay`: aqui a espera não ensina nada, só atrapalha quem
 * está ajustando palavra-chave.
 *
 * Serve tanto para agente salvo quanto para rascunho em edição; quem chama monta
 * o `Agent`.
 */
export function AgentScriptTester({ agent }: { agent: Agent }) {
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const match = matchScriptedReply(agent, trimmed);
    setResult({
      message: trimmed,
      text: getAgentReply(agent, trimmed),
      matchedId: match?.id ?? null,
      // Mostra exatamente quais termos dispararam — é o que o admin precisa
      // para entender por que o roteiro caiu (ou não) onde ele esperava.
      matchedKeywords: match
        ? match.keywords.filter((keyword) => normalizeText(trimmed).includes(normalizeText(keyword)))
        : [],
    });
    setDraft("");
  };

  return (
    <section>
      <p className="eyebrow mb-1">Testar o roteiro</p>
      <p className="mb-3 text-xs text-muted">
        Escreva como um aluno escreveria. Mostramos qual resposta casou e por quais palavras-chave.
      </p>

      {agent.starters.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {agent.starters.map((starter) => (
            <li key={starter.id}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => runTest(starter.message)}
              >
                {starter.label || "Sugestão sem texto"}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <TextField value={draft} onChange={setDraft} fullWidth className="flex-1">
          <Label className="sr-only">Mensagem de teste</Label>
          <Input
            placeholder="Ex.: preciso dar um feedback difícil"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              runTest(draft);
            }}
          />
        </TextField>
        <Button type="button" variant="secondary" onClick={() => runTest(draft)}>
          <Sparkles className="size-4" aria-hidden="true" />
          Testar
        </Button>
      </div>

      {result && (
        <div className="mt-4 space-y-3">
          <p className="ml-auto max-w-lg rounded-2xl rounded-tr-sm bg-accent-soft px-4 py-3 text-sm leading-relaxed text-accent-soft-foreground">
            {result.message}
          </p>

          <div className="flex items-start gap-3">
            <AgentAvatar 
              avatar={agent.avatar} 
              themeColor={agent.themeColor}
              iconSvg={agent.iconSvg}
              photoUrl={agent.photoUrl}
              size="sm" 
            />
            <div className="min-w-0 flex-1">
              <p className="max-w-lg rounded-2xl rounded-tl-sm bg-surface-secondary px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-foreground">
                {result.text}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                {result.matchedId ? (
                  <>
                    <Chip color="success" variant="soft" size="sm">
                      Resposta roteirizada
                    </Chip>
                    <span>casou por:</span>
                    {result.matchedKeywords.map((keyword) => (
                      <Chip key={keyword} color="default" variant="soft" size="sm">
                        {keyword}
                      </Chip>
                    ))}
                  </>
                ) : agent.fallbacks.length === 0 ? (
                  // Caso invisível: sem fallback escrito, a engine devolve uma
                  // frase do sistema que o admin nunca redigiu.
                  <>
                    <Chip color="danger" variant="soft" size="sm">
                      Frase do sistema
                    </Chip>
                    <span>Você não escreveu nenhum fallback — esta resposta não é sua.</span>
                  </>
                ) : (
                  <>
                    <Chip color="warning" variant="soft" size="sm">
                      Fallback
                    </Chip>
                    <span>Nenhuma palavra-chave casou com essa mensagem.</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
