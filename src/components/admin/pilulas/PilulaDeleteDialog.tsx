'use client';

import React from 'react';
import { Pilula } from '@/types/pilula';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface PilulaDeleteDialogProps {
  pilula: Pilula | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export function PilulaDeleteDialog({ pilula, onClose, onConfirm }: PilulaDeleteDialogProps) {
  if (!pilula) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog Container */}
      <div className="relative w-full max-w-md rounded-3xl bg-surface border border-border/80 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-negative/12 text-negative">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold text-ink leading-tight">
              Excluir Pílula de Conhecimento?
            </h3>
            <p className="text-xs text-text-mute mt-1">
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-text-mute hover:bg-canvas-alt hover:text-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-canvas-soft border border-border/60">
          <p className="text-sm font-bold text-ink">{pilula.title}</p>
          <p className="text-xs text-text-soft mt-1 line-clamp-2">{pilula.challenge}</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-bold text-sm text-text-soft hover:bg-canvas-soft transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(pilula.id)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-negative text-white hover:opacity-90 transition-all shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir Pílula</span>
          </button>
        </div>
      </div>
    </div>
  );
}
