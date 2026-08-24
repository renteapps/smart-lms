'use client';

import React, { useState, useEffect } from 'react';
import { Pilula } from '@/types/pilula';
import { Lightbulb, Clock, CheckCircle2, Heart, BookOpen, Play, Volume2, Target, Sparkles, AlertCircle } from 'lucide-react';
import { StatusBadge } from '@/components/ui/editorial';
import { Button, Chip, Modal, Separator } from '@heroui/react';

interface PilulaPreviewModalProps {
  pilula: Pilula | null;
  onClose: () => void;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    if (url.includes('youtube.com/watch')) {
      const parsed = new URL(url);
      const v = parsed.searchParams.get('v');
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

function getVimeoEmbedUrl(url: string): string | null {
  try {
    const match = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    return match && match[1] ? `https://player.vimeo.com/video/${match[1]}` : null;
  } catch {
    return null;
  }
}

export function PilulaPreviewModal({ pilula, onClose }: PilulaPreviewModalProps) {
  const [completed, setCompleted] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    setCompleted(false);
    setLiked(false);
  }, [pilula?.id]);

  if (!pilula) return null;

  const ytEmbed = pilula.mediaUrl ? getYouTubeEmbedUrl(pilula.mediaUrl) : null;
  const vimeoEmbed = pilula.mediaUrl ? getVimeoEmbedUrl(pilula.mediaUrl) : null;

  return (
    <Modal.Root
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog className="max-w-2xl sm:w-[42rem]">
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
                  <span>{pilula.estimatedMinutes} min de prática</span>
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

              {/* Media renderer (video / audio) */}
              {pilula.format === 'video' && (
                <div className="overflow-hidden rounded-xl bg-background-secondary border border-border">
                  {ytEmbed ? (
                    <iframe
                      src={ytEmbed}
                      className="aspect-video w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={pilula.title}
                    />
                  ) : vimeoEmbed ? (
                    <iframe
                      src={vimeoEmbed}
                      className="aspect-video w-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      title={pilula.title}
                    />
                  ) : pilula.mediaUrl ? (
                    <video
                      controls
                      className="aspect-video w-full bg-black"
                      src={pilula.mediaUrl}
                    >
                      Seu navegador não suporta a tag de vídeo.
                    </video>
                  ) : (
                    <div className="relative flex aspect-video flex-col items-center justify-center gap-3 p-6 text-center">
                      <span className="grid size-12 place-items-center rounded-full bg-accent text-accent-foreground shadow-surface">
                        <Play className="size-6 fill-current" aria-hidden="true" />
                      </span>
                      <p className="text-xs font-medium text-muted">Vídeo da pílula (adicione uma URL na edição para reproduzir)</p>
                    </div>
                  )}
                </div>
              )}

              {pilula.format === 'audio' && (
                <div className="space-y-3 rounded-xl border border-border bg-background-secondary p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <Volume2 className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">Áudio / Podpill da Prática</p>
                      <p className="text-[11px] text-muted">{pilula.estimatedMinutes} min de escuta guiada</p>
                    </div>
                  </div>

                  {pilula.mediaUrl ? (
                    <audio controls className="w-full mt-2" src={pilula.mediaUrl}>
                      Seu navegador não suporta o elemento de áudio.
                    </audio>
                  ) : (
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <AlertCircle className="size-3.5 text-warning" />
                      Nenhuma URL de áudio informada para esta pílula.
                    </p>
                  )}
                </div>
              )}

              {/* Summary / concept */}
              <div className="space-y-2 rounded-xl border border-border bg-background-secondary p-4">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted uppercase">
                  <Lightbulb className="size-3.5 text-warning" aria-hidden="true" />
                  Conceito chave
                </h4>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{pilula.summary}</p>
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

                <p className="text-sm leading-relaxed font-medium text-foreground whitespace-pre-line">{pilula.challenge}</p>
              </div>

              <Separator />

              {/* Interactive footer (likes) */}
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant={liked ? "danger-soft" : "outline"}
                  size="sm"
                  onClick={() => setLiked(!liked)}
                  aria-pressed={liked}
                  className="flex items-center gap-2"
                >
                  <Heart className={`size-4 ${liked ? 'fill-current text-danger' : 'text-muted'}`} aria-hidden="true" />
                  <span className="font-semibold">{(pilula.likesCount || 0) + (liked ? 1 : 0)}</span>
                  <span className="text-xs text-muted">curtidas</span>
                </Button>

                <span className="text-xs text-muted">Prévia interativa de curtida</span>
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
