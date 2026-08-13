'use client';

import React, { useState, useEffect } from 'react';
import { Pilula, PilulaCategory, PilulaFormat, PilulaStatus } from '@/types/pilula';
import { Sparkles, Lightbulb, FileText, Video, Headphones, Target, Clock, BookOpen, Calendar, Link as LinkIcon } from 'lucide-react';
import {
  Button,
  Description,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Modal,
  Radio,
  RadioGroup,
  Select,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';

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

const STATUS_OPTIONS: { value: PilulaStatus; label: string }[] = [
  { value: 'Ativa', label: 'Ativa (visível agora)' },
  { value: 'Programada', label: 'Programada (agendada)' },
  { value: 'Rascunho', label: 'Rascunho' },
  { value: 'Arquivada', label: 'Arquivada' },
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
      toast.danger('Informe o título da pílula.');
      return;
    }

    if (!summary.trim()) {
      toast.danger('Informe o resumo/conceito da pílula.');
      return;
    }

    if (!challenge.trim()) {
      toast.danger('Informe a prática sugerida ou desafio do dia.');
      return;
    }

    if (status === 'Programada' && !publishDate) {
      toast.danger('Informe a data de agendamento para pílulas programadas.');
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
    <Modal.Root
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog className="max-w-3xl sm:w-[48rem]">
            <Modal.Header>
              <div className="flex items-center gap-3">
                <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
                  <Lightbulb className="size-5" aria-hidden="true" />
                </Modal.Icon>
                <div>
                  <Modal.Heading className="font-display text-lg font-bold">
                    {pilulaToEdit ? 'Editar pílula de conhecimento' : 'Nova pílula de conhecimento'}
                  </Modal.Heading>
                  <p className="text-xs text-muted">
                    Crie microconteúdos dinâmicos para engajar os alunos no dia a dia.
                  </p>
                </div>
              </div>
            </Modal.Header>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <Modal.Body className="space-y-6 py-2">
                {/* Title */}
                <TextField value={title} onChange={setTitle} isRequired fullWidth>
                  <Label>Título da pílula</Label>
                  <Input placeholder="Ex.: Escuta ativa na prática" />
                </TextField>

                {/* Category, status & duration */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Select
                      selectedKey={category}
                      onSelectionChange={(key) => setCategory(String(key))}
                    >
                      <Label>Categoria</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {[...CATEGORIES.map((cat) => ({ id: cat, label: cat })), { id: 'Outra', label: 'Outra…' }].map(
                            (opt) => (
                              <ListBoxItem key={opt.id} id={opt.id}>
                                {opt.label}
                              </ListBoxItem>
                            ),
                          )}
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    {category === 'Outra' && (
                      <TextField value={customCategory} onChange={setCustomCategory} fullWidth>
                        <Label className="sr-only">Categoria personalizada</Label>
                        <Input placeholder="Especifique a categoria" />
                      </TextField>
                    )}
                  </div>

                  <Select
                    selectedKey={status}
                    onSelectionChange={(key) => setStatus(String(key) as PilulaStatus)}
                  >
                    <Label>Status</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {STATUS_OPTIONS.map((opt) => (
                          <ListBoxItem key={opt.value} id={opt.value}>
                            {opt.label}
                          </ListBoxItem>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>

                  <TextField
                    value={String(estimatedMinutes)}
                    onChange={(value) => setEstimatedMinutes(parseInt(value, 10) || 1)}
                    fullWidth
                  >
                    <Label>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-4 text-muted" aria-hidden="true" />
                        Tempo (min)
                      </span>
                    </Label>
                    <Input type="number" min={1} max={60} inputMode="numeric" />
                  </TextField>
                </div>

                {/* Schedule date (only when scheduled) */}
                {status === 'Programada' && (
                  <div className="rounded-xl border border-accent/30 bg-accent-soft p-4">
                    <TextField value={publishDate} onChange={setPublishDate} isRequired fullWidth>
                      <Label>
                        <span className="inline-flex items-center gap-2">
                          <Calendar className="size-4" aria-hidden="true" />
                          Data de publicação programada
                        </span>
                      </Label>
                      <Input type="date" />
                    </TextField>
                  </div>
                )}

                {/* Format selector */}
                <RadioGroup
                  value={format}
                  onChange={(value) => setFormat(value as PilulaFormat)}
                  className="gap-3"
                >
                  <Label>Formato da pílula</Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {FORMATS.map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <Radio key={option.value} value={option.value} className="w-full">
                          <Radio.Content className="w-full items-start gap-3 rounded-xl border border-border bg-background-secondary p-3.5 text-left data-[selected]:border-accent data-[selected]:bg-accent-soft">
                            <Radio.Control className="mt-1">
                              <Radio.Indicator />
                            </Radio.Control>
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-muted">
                              <IconComponent className="size-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                              <span className="mt-0.5 block text-xs leading-tight font-normal text-muted">
                                {option.description}
                              </span>
                            </span>
                          </Radio.Content>
                        </Radio>
                      );
                    })}
                  </div>
                </RadioGroup>

                {/* Summary */}
                <TextField value={summary} onChange={setSummary} isRequired fullWidth>
                  <Label>Conceito / resumo da pílula</Label>
                  <TextArea rows={3} placeholder="Explique o insight ou teoria em poucas frases para o aluno…" />
                  <Description>O aluno lê isso antes de executar a prática.</Description>
                </TextField>

                {/* Challenge */}
                <TextField value={challenge} onChange={setChallenge} isRequired fullWidth>
                  <Label>
                    <span className="inline-flex items-center gap-1.5">
                      <Target className="size-4 text-warning" aria-hidden="true" />
                      Prática sugerida / desafio do dia
                    </span>
                  </Label>
                  <TextArea
                    rows={3}
                    placeholder="Instrução prática acionável. Ex.: 'Hoje, aguarde 2 segundos antes de responder…'"
                  />
                </TextField>

                {/* Course relation & media URL */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField value={courseTitle} onChange={setCourseTitle} fullWidth>
                    <Label>
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen className="size-4 text-muted" aria-hidden="true" />
                        Curso / trilha associado
                      </span>
                    </Label>
                    <Input placeholder="Ex.: Comunicação Assertiva & Feedback" />
                    <Description>Opcional.</Description>
                  </TextField>

                  <TextField value={mediaUrl} onChange={setMediaUrl} fullWidth>
                    <Label>
                      <span className="inline-flex items-center gap-1.5">
                        <LinkIcon className="size-4 text-muted" aria-hidden="true" />
                        URL de mídia (vídeo/áudio)
                      </span>
                    </Label>
                    <Input type="url" placeholder="https://…" />
                    <Description>Opcional.</Description>
                  </TextField>
                </div>
              </Modal.Body>

              <Modal.Footer>
                <Button variant="tertiary" type="button" onClick={onClose}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit">
                  <Sparkles className="size-4" aria-hidden="true" />
                  {pilulaToEdit ? 'Salvar alterações' : 'Criar pílula'}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
