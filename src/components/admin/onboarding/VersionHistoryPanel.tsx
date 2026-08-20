'use client';

import React, { useState } from 'react';
import { QuestionnaireVersion } from '@/types/trilha';
import { History, Eye, RotateCcw, CheckCircle2, FileClock, Archive } from 'lucide-react';
import { StatusBadge } from '@/components/ui/editorial';

interface VersionHistoryPanelProps {
  versions: QuestionnaireVersion[];
  onPreview: (version: QuestionnaireVersion) => void;
  onRestore: (version: QuestionnaireVersion) => void;
  restoringVersion?: number | null;
}

const statusMeta: Record<QuestionnaireVersion['status'], { label: string; tone: 'positive' | 'warning' | 'neutral'; icon: React.ElementType }> = {
  published: { label: 'Publicado', tone: 'positive', icon: CheckCircle2 },
  draft: { label: 'Rascunho', tone: 'warning', icon: FileClock },
  archived: { label: 'Arquivado', tone: 'neutral', icon: Archive },
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({ versions, onPreview, onRestore, restoringVersion }) => {
  const [confirmingVersion, setConfirmingVersion] = useState<number | null>(null);

  if (versions.length === 0) {
    return (
      <div className="editorial-card p-8 text-center text-sm text-muted">
        <History className="mx-auto mb-3 h-8 w-8 opacity-30" />
        Nenhuma versão publicada ainda. Publique o questionário para começar o histórico.
      </div>
    );
  }

  return (
    <div className="editorial-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="eyebrow">Auditoria</p>
          <h3 className="mt-1 text-xl font-extrabold text-foreground">Histórico de versões</h3>
        </div>
        <History className="h-6 w-6 text-accent" />
      </div>

      <div className="flex flex-col divide-y divide-border/40">
        {versions.map((version) => {
          const meta = statusMeta[version.status];
          const Icon = meta.icon;
          const isConfirming = confirmingVersion === version.version;
          return (
            <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3 min-w-0">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-background-secondary text-muted">
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-foreground">v{version.version}</strong>
                    <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                    <span className="text-xs text-muted">{version.questions.length} perguntas</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {version.status === 'published' ? `Publicado em ${formatDate(version.publishedAt)}` : `Criado em ${formatDate(version.createdAt)}`}
                  </p>
                  {version.notes && <p className="mt-1 text-xs italic text-muted">“{version.notes}”</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onPreview(version)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
                >
                  <Eye size={14} />
                  Pré-visualizar
                </button>
                {version.status !== 'draft' && (
                  isConfirming ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setConfirmingVersion(null); onRestore(version); }}
                        disabled={restoringVersion === version.version}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground hover:bg-accent-hover disabled:opacity-50 transition-colors"
                      >
                        {restoringVersion === version.version ? 'Restaurando…' : 'Confirmar'}
                      </button>
                      <button
                        onClick={() => setConfirmingVersion(null)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-hover transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingVersion(version.version)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/5 transition-colors"
                    >
                      <RotateCcw size={14} />
                      Restaurar para rascunho
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
