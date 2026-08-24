'use client';

import React from 'react';
import { Pilula } from '@/types/pilula';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { AlertDialog, Button } from '@heroui/react';

interface PilulaDeleteDialogProps {
  pilula: Pilula | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  isPending?: boolean;
}

export function PilulaDeleteDialog({ pilula, onClose, onConfirm, isPending = false }: PilulaDeleteDialogProps) {
  if (!pilula) return null;

  return (
    <AlertDialog.Root
      isOpen
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
    >
      <AlertDialog.Backdrop>
        <AlertDialog.Container size="md">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </AlertDialog.Icon>
              <AlertDialog.Heading>Excluir pílula de conhecimento?</AlertDialog.Heading>
            </AlertDialog.Header>

            <AlertDialog.Body>
              <p>Esta ação não pode ser desfeita.</p>

              <div className="mt-4 rounded-lg border border-border bg-background-secondary p-4">
                <p className="text-sm font-semibold text-foreground">{pilula.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{pilula.challenge}</p>
              </div>
            </AlertDialog.Body>

            <AlertDialog.Footer>
              <Button variant="tertiary" onClick={onClose} isDisabled={isPending}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => onConfirm(pilula.id)} isDisabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Excluindo…
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" aria-hidden="true" />
                    Excluir pílula
                  </>
                )}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog.Root>
  );
}
