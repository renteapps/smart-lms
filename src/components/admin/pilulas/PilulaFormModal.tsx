'use client';

import React, { useState, useEffect } from 'react';
import { Pilula, PilulaCategory, PilulaFormat, PilulaStatus } from '@/types/pilula';
import { Sparkles, Lightbulb, FileText, Video, Headphones, Target, Clock, BookOpen, Calendar, Link as LinkIcon, Loader2, Bot, Wand2, Tag, Hourglass } from 'lucide-react';
import {
  Button,
  Chip,
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
} from '@heroui/react';
import { toast } from 'sonner';
import { generatePilulaWithAI } from '@/app/actions/admin/ai-generation';
import TagInputField from '@/components/admin/TagInputField';

interface ShallowCourse {
  id: string;
  title: string;
  category?: string;
}

interface PilulaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pilulaData: Omit<Pilula, 'id' | 'createdAt' | 'updatedAt' | 'completionsCount' | 'likesCount' | 'dismissalsCount'> & { id?: string }) => void;
  pilulaToEdit?: Pilula | null;
  courses?: ShallowCourse[];
  availableTags?: string[];
  isPending?: boolean;
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

export function PilulaFormModal({
  isOpen,
  onClose,
  onSave,
  pilulaToEdit,
  courses = [],
  availableTags = [],
  isPending = false,
}: PilulaFormModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Comunicação');
  const [customCategory, setCustomCategory] = useState('');
  const [format, setFormat] = useState<PilulaFormat>('desafio');
  const [summary, setSummary] = useState('');
  const [challenge, setChallenge] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(3);
  const [selectedCourseKey, setSelectedCourseKey] = useState<string>('none');
  const [mediaUrl, setMediaUrl] = useState('');
  const [status, setStatus] = useState<PilulaStatus>('Ativa');
  const [publishDate, setPublishDate] = useState('');
  const [daysAfterSignup, setDaysAfterSignup] = useState<string>('');
  const [targetTags, setTargetTags] = useState<string[]>([]);

  // AI Assist State
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    if (pilulaToEdit) {
      setTitle(pilulaToEdit.title || '');
      if (CATEGORIES.includes(pilulaToEdit.category as PilulaCategory)) {
        setCategory(pilulaToEdit.category);
        setCustomCategory('');
      } else {
        setCategory('Outra');
        setCustomCategory(pilulaToEdit.category || '');
      }
      setFormat(pilulaToEdit.format || 'desafio');
      setSummary(pilulaToEdit.summary || '');
      setChallenge(pilulaToEdit.challenge || '');
      setEstimatedMinutes(pilulaToEdit.estimatedMinutes || 3);
      
      // Course key selection
      if (pilulaToEdit.courseId) {
        setSelectedCourseKey(pilulaToEdit.courseId);
      } else if (pilulaToEdit.courseTitle) {
        const found = courses.find((c) => c.title.toLowerCase() === pilulaToEdit.courseTitle?.toLowerCase());
        setSelectedCourseKey(found ? found.id : 'none');
      } else {
        setSelectedCourseKey('none');
      }

      setMediaUrl(pilulaToEdit.mediaUrl || '');
      setStatus(pilulaToEdit.status || 'Ativa');
      setPublishDate(pilulaToEdit.publishDate ? pilulaToEdit.publishDate.slice(0, 10) : '');
      setDaysAfterSignup(
        pilulaToEdit.daysAfterSignup !== null && pilulaToEdit.daysAfterSignup !== undefined
          ? String(pilulaToEdit.daysAfterSignup)
          : '',
      );
      setTargetTags(Array.isArray(pilulaToEdit.targetTags) ? pilulaToEdit.targetTags : []);
    } else {
      // Reset form
      setTitle('');
      setCategory('Comunicação');
      setCustomCategory('');
      setFormat('desafio');
      setSummary('');
      setChallenge('');
      setEstimatedMinutes(3);
      setSelectedCourseKey('none');
      setMediaUrl('');
      setStatus('Ativa');
      setPublishDate('');
      setDaysAfterSignup('');
      setTargetTags([]);
      setShowAiAssist(false);
      setAiTopic('');
    }
  }, [pilulaToEdit, isOpen, courses]);

  if (!isOpen) return null;

  const handleGenerateAi = async () => {
    if (!aiTopic.trim()) {
      toast.error('Informe o tema ou ideia para gerar a pílula.');
      return;
    }

    setIsGeneratingAi(true);
    try {
      const selectedCourse = courses.find((c) => c.id === selectedCourseKey);
      const res = await generatePilulaWithAI(aiTopic.trim(), {
        category: category !== 'Outra' ? category : undefined,
        courseTitle: selectedCourse?.title,
        format,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || 'Erro ao gerar conteúdo com IA.');
        return;
      }

      const generated = res.data;
      if (generated.title) setTitle(generated.title);
      if (generated.summary) setSummary(generated.summary);
      if (generated.challenge) setChallenge(generated.challenge);
      if (generated.estimatedMinutes) setEstimatedMinutes(generated.estimatedMinutes);
      if (generated.category && CATEGORIES.includes(generated.category as PilulaCategory)) {
        setCategory(generated.category);
      }
      if (generated.format && FORMATS.some((f) => f.value === generated.format)) {
        setFormat(generated.format);
      }

      toast.success('Pílula gerada com sucesso pela IA! Revise os campos antes de salvar.');
      setShowAiAssist(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro inesperado ao gerar com IA.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

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
      toast.error('Informe a data de publicação para pílulas programadas.');
      return;
    }

    const finalCategory = category === 'Outra' ? (customCategory.trim() || 'Geral') : category;
    
    let courseId: string | undefined = undefined;
    let courseTitle: string | undefined = undefined;

    if (selectedCourseKey && selectedCourseKey !== 'none') {
      const matchedCourse = courses.find((c) => c.id === selectedCourseKey);
      if (matchedCourse) {
        courseId = matchedCourse.id;
        courseTitle = matchedCourse.title;
      }
    }

    const parsedDays = daysAfterSignup.trim() !== '' ? Math.max(0, parseInt(daysAfterSignup, 10)) : null;

    onSave({
      id: pilulaToEdit?.id,
      title: title.trim(),
      category: finalCategory,
      format,
      summary: summary.trim(),
      challenge: challenge.trim(),
      estimatedMinutes: Number(estimatedMinutes) || 3,
      courseId,
      courseTitle,
      mediaUrl: mediaUrl.trim() || undefined,
      publishDate: publishDate || undefined,
      daysAfterSignup: parsedDays,
      targetTags,
      status,
    });
  };

  return (
    <Modal.Root
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isPending && !isGeneratingAi) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog className="max-w-3xl sm:w-[48rem]">
            <Modal.Header>
              <div className="flex items-center justify-between gap-3 w-full pr-6">
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

                {!pilulaToEdit && (
                  <Button
                    type="button"
                    variant={showAiAssist ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setShowAiAssist(!showAiAssist)}
                  >
                    <Wand2 className="size-3.5 text-accent" aria-hidden="true" />
                    {showAiAssist ? 'Fechar IA' : 'Gerar com IA'}
                  </Button>
                )}
              </div>
            </Modal.Header>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <Modal.Body className="space-y-6 py-2">
                {/* AI Assistant Banner / Box */}
                {showAiAssist && (
                  <div className="rounded-xl border border-accent/30 bg-accent-soft p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider">
                      <Bot className="size-4" aria-hidden="true" />
                      Assistente de Criação com Inteligência Artificial
                    </div>
                    <p className="text-xs text-muted">
                      Digite o tema ou objetivo da prática. A IA gerará um título instigante, o conceito-chave e um desafio prático de alto impacto.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="Ex.: Comunicação assertiva em reuniões de alinhamento..."
                        className="flex-1"
                        disabled={isGeneratingAi}
                      />
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleGenerateAi}
                        isDisabled={isGeneratingAi || !aiTopic.trim()}
                      >
                        {isGeneratingAi ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                            Gerando…
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3.5" aria-hidden="true" />
                            Gerar rascunho
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

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
                    onChange={(value) => setEstimatedMinutes(Math.max(1, parseInt(value, 10) || 1))}
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
                      <Description>A pílula se tornará ativa a partir desta data.</Description>
                    </TextField>
                  </div>
                )}

                {/* Gatilhos e Segmentação Inteligente */}
                <div className="rounded-xl border border-border bg-background-secondary p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Hourglass className="size-4 text-accent" aria-hidden="true" />
                    <h4 className="text-sm font-semibold text-foreground">
                      Gatilhos de Entrega & Segmentação Inteligente
                    </h4>
                  </div>
                  <p className="text-xs text-muted">
                    Configure regras para liberar esta pílula apenas para alunos com determinados comportamentos, tempo de casa ou interesses do onboarding.
                  </p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Days after signup */}
                    <TextField
                      value={daysAfterSignup}
                      onChange={setDaysAfterSignup}
                      fullWidth
                    >
                      <Label>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5 text-muted" aria-hidden="true" />
                          Tempo de cadastro mínimo (dias)
                        </span>
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Ex.: 0 = Imediato, 3 = Após 3 dias…"
                      />
                      <Description>
                        O aluno só receberá esta pílula após estar há X dias na plataforma.
                      </Description>
                    </TextField>

                    {/* Target Tags (from onboarding questions) */}
                    <div className="space-y-1.5">
                      <TagInputField
                        label="Tags de Resposta do Onboarding"
                        hint="Pressione Enter ou vírgula para adicionar tags."
                        placeholder="Ex.: lideranca, comunicacao, foco…"
                        values={targetTags}
                        onChange={setTargetTags}
                      />
                      {availableTags.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <span className="text-[11px] font-medium text-muted">Sugestões do Questionário:</span>
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                            {availableTags
                              .filter((tag) => !targetTags.includes(tag))
                              .slice(0, 10)
                              .map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setTargetTags([...targetTags, tag])}
                                  className="rounded-md bg-surface px-2 py-0.5 text-[11px] text-muted hover:bg-accent-soft hover:text-accent-soft-foreground border border-border transition-colors"
                                >
                                  +{tag}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

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
                  <div className="space-y-1.5">
                    <Select
                      selectedKey={selectedCourseKey}
                      onSelectionChange={(key) => setSelectedCourseKey(String(key))}
                      className="w-full"
                    >
                      <Label>
                        <span className="inline-flex items-center gap-1.5">
                          <BookOpen className="size-4 text-muted" aria-hidden="true" />
                          Curso / trilha associado
                        </span>
                      </Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBoxItem key="none" id="none">
                            Acesso Geral (Sem curso específico)
                          </ListBoxItem>
                          {courses.map((course) => (
                            <ListBoxItem key={course.id} id={course.id}>
                              {course.title}
                            </ListBoxItem>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    <p className="text-xs text-muted">Opcional. Vincula a pílula a um curso do catálogo.</p>
                  </div>

                  <TextField value={mediaUrl} onChange={setMediaUrl} fullWidth>
                    <Label>
                      <span className="inline-flex items-center gap-1.5">
                        <LinkIcon className="size-4 text-muted" aria-hidden="true" />
                        URL de mídia ({format === 'video' ? 'Vídeo' : format === 'audio' ? 'Áudio' : 'Opcional'})
                      </span>
                    </Label>
                    <Input
                      type="url"
                      placeholder={
                        format === 'video'
                          ? 'https://youtube.com/... ou .mp4'
                          : format === 'audio'
                            ? 'https://.../audio.mp3'
                            : 'https://...'
                      }
                    />
                    <Description>
                      {format === 'video'
                        ? 'Aceita YouTube, Vimeo ou link direto MP4.'
                        : format === 'audio'
                          ? 'Aceita link de áudio MP3 ou podcast.'
                          : 'Link de apoio ou leitura adicional.'}
                    </Description>
                  </TextField>
                </div>
              </Modal.Body>

              <Modal.Footer>
                <Button variant="tertiary" type="button" onClick={onClose} isDisabled={isPending}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" isDisabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Salvando…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" aria-hidden="true" />
                      {pilulaToEdit ? 'Salvar alterações' : 'Criar pílula'}
                    </>
                  )}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
