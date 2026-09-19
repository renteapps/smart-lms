'use client';

import { Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Pilula } from '@/types/pilula';

interface PilulaDeleteDialogProps {
  pilula: Pilula | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  isPending?: boolean;
}

export function PilulaDeleteDialog({ pilula, onClose, onConfirm, isPending = false }: PilulaDeleteDialogProps) {
  if (!pilula) return null;

  return (
    <ConfirmDialog
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      tone="danger"
      title="Excluir pílula de conhecimento?"
      confirmLabel="Excluir pílula"
      confirmIcon={<Trash2 className="size-4" aria-hidden="true" />}
      isLoading={isPending}
      loadingLabel="Excluindo…"
      onConfirm={() => onConfirm(pilula.id)}
      description={
        <>
          <p>Esta ação não pode ser desfeita.</p>

          <div className="mt-4 rounded-lg border border-border bg-background-secondary p-4">
            <p className="text-sm font-semibold text-foreground">{pilula.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted">{pilula.challenge}</p>
          </div>
        </>
      }
    />
  );
}
