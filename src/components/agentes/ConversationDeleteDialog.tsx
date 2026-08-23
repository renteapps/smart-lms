"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { AlertDialog, Button } from "@heroui/react";
import type { AgentConversation } from "@/types/agente";

type ConversationDeleteDialogProps = {
  conversation: AgentConversation | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
};

export function ConversationDeleteDialog({ conversation, onClose, onConfirm }: ConversationDeleteDialogProps) {
  if (!conversation) return null;

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
              <AlertDialog.Heading>Excluir conversa?</AlertDialog.Heading>
            </AlertDialog.Header>

            <AlertDialog.Body>
              <p>Esta ação não pode ser desfeita — todas as mensagens desta conversa serão perdidas.</p>

              <div className="mt-4 rounded-lg border border-border bg-background-secondary p-4">
                <p className="truncate text-sm font-semibold text-foreground">{conversation.title}</p>
              </div>
            </AlertDialog.Body>

            <AlertDialog.Footer>
              <Button variant="tertiary" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => onConfirm(conversation.id)}>
                <Trash2 className="size-4" aria-hidden="true" />
                Excluir conversa
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog.Root>
  );
}
