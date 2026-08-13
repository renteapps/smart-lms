'use client';

import React, { useState } from 'react';
import { Pilula } from '@/types/pilula';
import { Lightbulb, Clock, CheckCircle2, Heart, BookOpen, Play, Volume2, Target, Sparkles } from 'lucide-react';
import { StatusBadge } from '@/components/ui/editorial';
import { Button, Chip, Modal, ProgressBar, Separator } from '@heroui/react';

interface PilulaPreviewModalProps {
  pilula: Pilula | null;
  onClose: () => void;
}

export function PilulaPreviewModal({ pilula, onClose }: PilulaPreviewModalProps) {
  const [completed, setCompleted] = useState(false);
  const [liked, setLiked] = useState(false);

  if (!pilula) return null;

  return (
    <Modal.Root
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.Header>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent" aria-hidden="true" />
                <Modal.Heading className="text-xs font-semibold tracking-wider text-muted uppercase">
                  Prévia visual do aluno
                </Modal.Heading>
              </div>
            </Modal.Header>

            <Modal.Body className="space-y-5 py-2">
              {/* Top badges */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="primary">{pilula.category}</StatusBadge>
                  <Chip color="default" variant="soft" size="sm">
                    {pilula.format}
                  </Chip>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  <Clock className="size-3.5" aria-hidden="true" />
                  <span>{pilula.estimatedMinutes} min de leitura</span>
                </div>
              </div>

              {/* Title */}
              <div>
                <h3 className="font-display text-2xl leading-tight font-bold text-foreground">{pilula.title}</h3>
                {pilula.courseTitle && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-accent">
                    <BookOpen className="size-3.5" aria-hidden="true" />
                    <span>{pilula.courseTitle}</span>
                  </p>
                )}
              </div>

              {/* Media mock (video / audio) */}
              {pilula.format === 'video' && (
                <div className="relative flex aspect-video flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-background-secondary">
                  <span className="grid size-12 place-items-center rounded-full bg-accent text-accent-foreground shadow-surface">
                    <Play className="size-6 fill-current" aria-hidden="true" />
                  </span>
                  <p className="text-xs font-medium text-muted">Vídeo demonstrativo da pílula</p>
                </div>
              )}

              {pilula.format === 'audio' && (
                <div className="flex items-center gap-4 rounded-xl border border-border bg-background-secondary p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Volume2 className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">Áudio explicativo</p>
                    <ProgressBar value={33} color="accent" size="sm" aria-label="Progresso do áudio" className="mt-2">
                      <ProgressBar.Track>
                        <ProgressBar.Fill />
                      </ProgressBar.Track>
                    </ProgressBar>
                  </div>
                  <span className="text-xs tabular-nums text-muted">01:30</span>
                </div>
              )}

              {/* Summary / concept */}
              <div className="space-y-2 rounded-xl border border-border bg-background-secondary p-4">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted uppercase">
                  <Lightbulb className="size-3.5 text-warning" aria-hidden="true" />
                  Conceito chave
                </h4>
                <p className="text-sm leading-relaxed text-foreground">{pilula.summary}</p>
              </div>

              {/* Practical challenge */}
              <div className="space-y-3 rounded-xl border border-warning/30 bg-warning-soft p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-warning-soft-foreground uppercase">
                    <Target className="size-4" aria-hidden="true" />
                    Prática sugerida do dia
                  </h4>
                  <Chip color="warning" variant="soft" size="sm">
                    Ação prática
                  </Chip>
                </div>

                <p className="text-sm leading-relaxed font-medium text-foreground">{pilula.challenge}</p>

                <Button
                  variant={completed ? 'primary' : 'outline'}
                  fullWidth
                  onClick={() => setCompleted(!completed)}
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  {completed ? 'Prática concluída!' : 'Marcar prática como feita'}
                </Button>
              </div>

              <Separator />

              {/* Interactive footer (likes & completions) */}
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLiked(!liked)}
                  aria-pressed={liked}
                  className={liked ? 'text-danger' : 'text-muted'}
                >
                  <Heart className={`size-4 ${liked ? 'fill-current' : ''}`} aria-hidden="true" />
                  {(pilula.likesCount || 0) + (liked ? 1 : 0)} curtidas
                </Button>

                <span className="text-xs text-muted">{pilula.completionsCount || 0} alunos concluíram</span>
              </div>
            </Modal.Body>

            <Modal.Footer>
              <Button variant="secondary" onClick={onClose}>
                Fechar prévia
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
