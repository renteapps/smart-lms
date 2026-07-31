'use client';

import React, { useState, useEffect } from 'react';
import { Pilula, PilulaCategory, PilulaFormat, PilulaStatus } from '@/types/pilula';
import { X, Sparkles, Lightbulb, FileText, Video, Headphones, Target, Clock, BookOpen, Calendar, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

interface PilulaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pilulaData: Omit<Pilula, 'id' | 'createdAt' | 'updatedAt' | 'completionsCount' | 'likesCount'> & { id?: string }) => void;
  pilulaToEdit?: Pilula | null;
}

const CATEGORIES: PilulaCategory[] = [
  'Liderança',
  'Produtividade',
  'Comunicação',
  'Bem-estar',
  'Vendas',
  'Inovação',
  'Geral',
];

const FORMATS: { value: PilulaFormat; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'desafio', label: 'Desafio Prático', icon: Target, description: 'Exercício direto de aplicação diária' },
  { value: 'texto', label: 'Texto Curto', icon: FileText, description: 'Leitura rápida de conceito ou insight' },
  { value: 'video', label: 'Vídeo pílula', icon: Video, description: 'Vídeo expositivo ou explicativo curto' },
  { value: 'audio', label: 'Áudio / Podpill', icon: Headphones, description: 'Áudio explicativo para escuta rápida' },
];

export function PilulaFormModal({ isOpen, onClose, onSave, pilulaToEdit }: PilulaFormModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Comunicação');
  const [customCategory, setCustomCategory] = useState('');
  const [format, setFormat] = useState<PilulaFormat>('desafio');
  const [summary, setSummary] = useState('');
  const [challenge, setChallenge] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(3);
  const [courseTitle, setCourseTitle] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [status, setStatus] = useState<PilulaStatus>('Ativa');
  const [publishDate, setPublishDate] = useState('');

  useEffect(() => {
    if (pilulaToEdit) {
      setTitle(pilulaToEdit.title);
      if (CATEGORIES.includes(pilulaToEdit.category as PilulaCategory)) {
        setCategory(pilulaToEdit.category);
        setCustomCategory('');
      } else {
        setCategory('Outra');
        setCustomCategory(pilulaToEdit.category);
      }
      setFormat(pilulaToEdit.format);
      setSummary(pilulaToEdit.summary);
      setChallenge(pilulaToEdit.challenge);
      setEstimatedMinutes(pilulaToEdit.estimatedMinutes);
      setCourseTitle(pilulaToEdit.courseTitle || '');
      setMediaUrl(pilulaToEdit.mediaUrl || '');
      setStatus(pilulaToEdit.status);
      setPublishDate(pilulaToEdit.publishDate || '');
    } else {
      // Reset form
      setTitle('');
      setCategory('Comunicação');
      setCustomCategory('');
      setFormat('desafio');
      setSummary('');
      setChallenge('');
      setEstimatedMinutes(3);
      setCourseTitle('');
      setMediaUrl('');
      setStatus('Ativa');
      setPublishDate('');
    }
  }, [pilulaToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Informe o título da pílula.');
      return;
    }

    if (!summary.trim()) {
      toast.error('Informe o resumo/conceito da pílula.');
      return;
    }

    if (!challenge.trim()) {
      toast.error('Informe a prática sugerida ou desafio do dia.');
      return;
    }

    if (status === 'Programada' && !publishDate) {
      toast.error('Informe a data de agendamento para pílulas programadas.');
      return;
    }

    const finalCategory = category === 'Outra' ? (customCategory.trim() || 'Geral') : category;

    onSave({
      id: pilulaToEdit?.id,
      title: title.trim(),
      category: finalCategory,
      format,
      summary: summary.trim(),
      challenge: challenge.trim(),
      estimatedMinutes: Number(estimatedMinutes) || 3,
      courseTitle: courseTitle.trim() || undefined,
      mediaUrl: mediaUrl.trim() || undefined,
      publishDate: publishDate || undefined,
      status,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-3xl rounded-3xl bg-surface border border-border/80 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-5 bg-canvas-soft/50">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-pale text-primary font-bold">
              <Lightbulb className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-ink">
                {pilulaToEdit ? 'Editar Pílula de Conhecimento' : 'Nova Pílula de Conhecimento'}
              </h2>
              <p className="text-xs text-text-soft">
                Crie microconteúdos dinâmicos para engajar os alunos no dia a dia.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-text-mute hover:bg-canvas-alt hover:text-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-ink mb-1.5">
              Título da Pílula <span className="text-negative">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Escuta Ativa na Prática"
              className="w-full h-11 rounded-xl border border-border bg-canvas-soft px-4 text-sm text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none transition-all font-medium"
              required
            />
          </div>

          {/* Grid Category & Status & Estimated Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-canvas-soft px-3.5 text-sm text-text focus:border-primary focus:bg-surface focus:outline-none transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Outra">Outra...</option>
              </select>
              {category === 'Outra' && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Especifique a categoria"
                  className="mt-2 w-full h-10 rounded-xl border border-border bg-canvas-soft px-3.5 text-sm focus:border-primary focus:bg-surface focus:outline-none"
                />
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PilulaStatus)}
                className="w-full h-11 rounded-xl border border-border bg-canvas-soft px-3.5 text-sm text-text focus:border-primary focus:bg-surface focus:outline-none transition-all"
              >
                <option value="Ativa">Ativa (Visível agora)</option>
                <option value="Programada">Programada (Agendada)</option>
                <option value="Rascunho">Rascunho</option>
                <option value="Arquivada">Arquivada</option>
              </select>
            </div>

            {/* Estimated Minutes */}
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-text-mute" />
                Tempo (min)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 1)}
                className="w-full h-11 rounded-xl border border-border bg-canvas-soft px-4 text-sm text-text focus:border-primary focus:bg-surface focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Schedule Date (if programmed) */}
          {status === 'Programada' && (
            <div className="p-4 rounded-2xl bg-primary-pale/30 border border-primary/20">
              <label className="block text-sm font-bold text-primary-active mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Data de Publicação Programada
              </label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-surface px-4 text-sm focus:border-primary focus:outline-none"
                required
              />
            </div>
          )}

          {/* Format Selector */}
          <div>
            <label className="block text-sm font-bold text-ink mb-2">Formato da Pílula</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FORMATS.map((f) => {
                const IconComponent = f.icon;
                const isSelected = format === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFormat(f.value)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary-pale/40 ring-1 ring-primary/30'
                        : 'border-border bg-canvas-soft hover:bg-canvas-alt'
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        isSelected ? 'bg-primary text-on-primary' : 'bg-surface text-text-mute border border-border'
                      }`}
                    >
                      <IconComponent className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-ink'}`}>
                        {f.label}
                      </p>
                      <p className="text-xs text-text-soft leading-tight mt-0.5">{f.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-bold text-ink mb-1.5">
              Conceito / Resumo da Pílula <span className="text-negative">*</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="Explique o insight ou teoria em poucas frases para o aluno..."
              className="w-full rounded-xl border border-border bg-canvas-soft p-4 text-sm text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none transition-all resize-none"
              required
            />
          </div>

          {/* Challenge / Action */}
          <div>
            <label className="block text-sm font-bold text-ink mb-1.5 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-accent-orange" />
              Prática Sugerida / Desafio do Dia <span className="text-negative">*</span>
            </label>
            <textarea
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              rows={3}
              placeholder="Instrução prática acionável. Ex: 'Hoje, aguarde 2 segundos antes de responder...'"
              className="w-full rounded-xl border border-border bg-canvas-soft p-4 text-sm text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none transition-all resize-none"
              required
            />
          </div>

          {/* Course relation & Media URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Course Title */}
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-text-mute" />
                Curso / Trilha Associado (Opcional)
              </label>
              <input
                type="text"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="Ex: Comunicação Assertiva & Feedback"
                className="w-full h-11 rounded-xl border border-border bg-canvas-soft px-4 text-sm text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none transition-all"
              />
            </div>

            {/* Media URL (Optional) */}
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="w-4 h-4 text-text-mute" />
                URL de Mídia (Vídeo/Áudio - Opcional)
              </label>
              <input
                type="url"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full h-11 rounded-xl border border-border bg-canvas-soft px-4 text-sm text-text placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-text-soft hover:bg-canvas-soft transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-primary text-on-primary hover:bg-primary-active transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>{pilulaToEdit ? 'Salvar Alterações' : 'Criar Pílula'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
