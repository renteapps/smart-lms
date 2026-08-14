"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { AlertDialog, Button } from "@heroui/react";
import type { Agent } from "@/types/agente";

type AgentDeleteDialogProps = {
  agent: Agent | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
};

export function AgentDeleteDialog({ agent, onClose, onConfirm }: AgentDeleteDialogProps) {
  if (!agent) return null;

  return (
    <AlertDialog.Root
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialog.Backdrop>
        <AlertDialog.Container size="md">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </AlertDialog.Icon>
              <AlertDialog.Heading>Excluir agente?</AlertDialog.Heading>
            </AlertDialog.Header>

            <AlertDialog.Body>
              <p>
                O roteiro inteiro vai junto — saudação, sugestões, respostas e fallbacks. Esta ação não pode
                ser desfeita.
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
                  <strong className="font-semibold text-foreground">Em manutenção</strong> — o aluno vê o
                  aviso em vez de um link quebrado.
                </p>
              )}
            </AlertDialog.Body>

            <AlertDialog.Footer>
              <Button variant="tertiary" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => onConfirm(agent.id)}>
                <Trash2 className="size-4" aria-hidden="true" />
                Excluir agente
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog.Root>
  );
}
