"use client";

import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Agent } from "@/types/agente";

type AgentDeleteDialogProps = {
  agent: Agent | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
};

export function AgentDeleteDialog({ agent, onClose, onConfirm }: AgentDeleteDialogProps) {
  if (!agent) return null;

  return (
    <ConfirmDialog
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      tone="danger"
      title="Excluir agente?"
      confirmLabel="Excluir agente"
      confirmIcon={<Trash2 className="size-4" aria-hidden="true" />}
      onConfirm={() => onConfirm(agent.id)}
      description={
        <>
          <p>
            O roteiro inteiro vai junto — saudação, sugestões, respostas e fallbacks. Esta ação não pode ser
            desfeita.
          </p>

          <div className="mt-4 rounded-lg border border-border bg-background-secondary p-4">
            <p className="text-sm font-semibold text-foreground">
              {agent.name} · <span className="font-normal text-muted">{agent.role}</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              /agentes/{agent.slug} · <span data-numeric>{agent.conversationsCount}</span> conversas ·{" "}
              <span data-numeric>{agent.replies.length}</span> respostas no roteiro
            </p>
          </div>

          {agent.conversationsCount > 0 && (
            <p className="mt-3 text-sm text-muted">
              Se a ideia é só tirar do ar, prefira mudar o status para{" "}
              <strong className="font-semibold text-foreground">Em manutenção</strong> — o aluno vê o aviso em
              vez de um link quebrado.
            </p>
          )}
        </>
      }
    />
  );
}
