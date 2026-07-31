'use client';

import React, { useState } from 'react';
import { Pilula } from '@/types/pilula';
import { X, Lightbulb, Clock, CheckCircle2, Heart, BookOpen, Share2, Play, Volume2, Target, Sparkles } from 'lucide-react';
import { StatusBadge } from '@/components/ui/editorial';

interface PilulaPreviewModalProps {
  pilula: Pilula | null;
  onClose: () => void;
}

export function PilulaPreviewModal({ pilula, onClose }: PilulaPreviewModalProps) {
  const [completed, setCompleted] = useState(false);
  const [liked, setLiked] = useState(false);

  if (!pilula) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg rounded-3xl bg-surface border border-border/80 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Banner Bar Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-canvas-soft border-b border-border/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-text-mute">
              Prévia Visual do Aluno
            </span>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-text-mute hover:bg-canvas-alt hover:text-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Student View Shell (Mock Mobile/Card Container) */}
        <div className="p-6 space-y-5 bg-surface">
          {/* Top badges */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-accent-orange/12 text-accent-orange">
                {pilula.category}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-canvas-soft text-text-soft uppercase tracking-wider">
                {pilula.format}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-text-mute font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{pilula.estimatedMinutes} min de leitura</span>
            </div>
          </div>

          {/* Title */}
          <div>
            <h3 className="text-2xl font-extrabold text-ink leading-tight">
              {pilula.title}
            </h3>
            {pilula.courseTitle && (
              <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-primary">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{pilula.courseTitle}</span>
              </div>
            )}
          </div>

          {/* Media Player Mock (if format video or audio) */}
          {pilula.format === 'video' && (
            <div className="relative aspect-video rounded-2xl bg-black/90 flex flex-col items-center justify-center p-4 text-white overflow-hidden group">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-lg group-hover:scale-105 transition-transform cursor-pointer">
                <Play className="h-6 w-6 fill-current ml-0.5" />
              </div>
              <p className="text-xs text-white/80 mt-3 font-medium">Vídeo demonstrativo da pílula</p>
            </div>
          )}

          {pilula.format === 'audio' && (
            <div className="p-4 rounded-2xl bg-canvas-soft border border-border/60 flex items-center gap-4">
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white">
                <Volume2 className="h-5 w-5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink truncate">Áudio Explicativo</p>
                <div className="h-2 w-full bg-border rounded-full mt-2 overflow-hidden">
                  <div className="h-full w-1/3 bg-primary rounded-full" />
                </div>
              </div>
              <span className="text-xs font-mono text-text-mute">01:30</span>
            </div>
          )}

          {/* Summary / Concept */}
          <div className="p-4 rounded-2xl bg-canvas-soft border border-border/40 space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-mute flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-accent-orange" />
              Conceito Chave
            </h4>
            <p className="text-sm leading-relaxed text-ink">{pilula.summary}</p>
          </div>

          {/* Practical Challenge Card */}
          <div className="p-5 rounded-2xl bg-accent-orange/8 border border-accent-orange/20 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-accent-orange flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                Prática Sugerida do Dia
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-orange/15 text-accent-orange">
                Ação Prática
              </span>
            </div>

            <p className="text-sm font-semibold leading-relaxed text-ink">
              {pilula.challenge}
            </p>

            <button
              type="button"
              onClick={() => setCompleted(!completed)}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                completed
                  ? 'bg-positive text-white shadow-sm'
                  : 'bg-surface text-ink border border-border hover:bg-canvas-soft'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 ${completed ? 'text-white' : 'text-text-mute'}`} />
              <span>{completed ? 'Prática Concluída!' : 'Marcar Prática como Feita'}</span>
            </button>
          </div>

          {/* Interactive footer (Likes & Share) */}
          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            <button
              onClick={() => setLiked(!liked)}
              className={`flex items-center gap-2 text-xs font-bold transition-colors ${
                liked ? 'text-negative' : 'text-text-mute hover:text-text'
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-negative text-negative' : ''}`} />
              <span>{(pilula.likesCount || 0) + (liked ? 1 : 0)} curtidas</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-text-mute">
              <span>{pilula.completionsCount || 0} alunos concluíram</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-canvas-soft border-t border-border/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold text-sm bg-surface border border-border text-ink hover:bg-canvas-alt transition-colors"
          >
            Fechar Prévia
          </button>
        </div>
      </div>
    </div>
  );
}
