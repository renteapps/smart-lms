'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Reorder } from 'framer-motion';
import {
  Save, PlayCircle, BarChart3, ListChecks, Plus, TriangleAlert, Activity,
  CheckCircle2, Clock3, RefreshCw, History, UploadCloud, Undo2, X, Loader2, HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Questionnaire, Question, ContentMapping, QuestionnaireVersion, EligibleLesson } from '@/types/trilha';
import { createContentIndex, type ContentItem } from '@/lib/contentCatalog';
import { validateQuestionnaire } from '@/lib/matching';
import { analyzeQuestionnaire } from '@/lib/adminTrailDiagnostics';
import { summarizeTrailAnalytics, TrailAnalyticsSummary } from '@/lib/trailAnalytics';
import { getAdminTrailAnalytics } from '@/app/actions/trail';
import {
  saveQuestionnaireDraft, publishQuestionnaire, restoreQuestionnaireVersion,
  discardQuestionnaireDraft, getQuestionnaireVersions,
} from '@/app/actions/admin/content';
import { QuestionEditor } from '@/components/admin/onboarding/QuestionEditor';
import { AvailabilityQuestionCard } from '@/components/admin/onboarding/AvailabilityQuestionCard';
import { ContentPickerModal } from '@/components/admin/onboarding/ContentPickerModal';
import { TrailPreview } from '@/components/admin/onboarding/TrailPreview';
import { VersionHistoryPanel } from '@/components/admin/onboarding/VersionHistoryPanel';
import { PageHeader, StatusBadge } from '@/components/ui/editorial';
import type { OnboardingVariableDefinition } from '@/lib/userVariables';

const BACKUP_KEY = 'smartlms_onboarding_draft_backup_v1';

function createEmptyQuestion(): Question {
  return {
    id: `q_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    type: 'single',
    text: 'Nova Pergunta',
    role: 'perfil',
    visualType: 'list',
    options: [{ label: 'Opção 1', tags: [], contentMappings: [] }],
  };
}

function createDefaultAvailabilityQuestion(): Question {
  return {
    id: `q_disponibilidade_${Date.now().toString(36)}`,
    type: 'availability',
    text: 'Quando você prefere estudar?',
    role: 'disponibilidade',
    options: [],
    availabilityConfig: { minutePresets: [15, 30, 45, 60, 90], minMinutes: 10, maxMinutes: 240, allowPerDayMinutes: true },
  };
}

function createEmptyOpenQuestion(): Question {
  return {
    id: `q_contexto_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    type: 'open',
    text: 'O que mais devemos saber sobre o seu momento, {{nome}}?',
    role: 'contexto',
    options: [],
    placeholder: 'Conte em poucas palavras o que seria mais útil para você agora.',
    maxLength: 700,
  };
}

function readBackup(): Question[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

interface OnboardingClientProps {
  initialDraft: Questionnaire | null;
  initialPublished: Questionnaire | null;
  initialVersions: QuestionnaireVersion[];
  contentItems: ContentItem[];
  eligibleLessons: EligibleLesson[];
  initialVariableDefinitions: OnboardingVariableDefinition[];
}

export function OnboardingClient({
  initialDraft, initialPublished, initialVersions, contentItems, eligibleLessons, initialVariableDefinitions,
}: OnboardingClientProps) {
  const router = useRouter();
  const index = useMemo(() => createContentIndex(contentItems, eligibleLessons), [contentItems, eligibleLessons]);

  const initialQuestions = initialDraft?.questions ?? initialPublished?.questions ?? [];

  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [hasDraft, setHasDraft] = useState(!!initialDraft);
  const [draftVersion, setDraftVersion] = useState<number | null>(initialDraft?.version ?? null);
  const [publishedInfo, setPublishedInfo] = useState<{ version: number } | null>(
    initialPublished ? { version: initialPublished.version } : null,
  );
  const [publishedQuestions, setPublishedQuestions] = useState<Question[]>(initialPublished?.questions ?? []);
  const [variableDefinitions, setVariableDefinitions] = useState(initialVariableDefinitions);
  const [versions, setVersions] = useState<QuestionnaireVersion[]>(initialVersions);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialQuestions));

  const [activeTab, setActiveTab] = useState<'questions' | 'preview' | 'stats' | 'history'>('questions');
  const [previewVersion, setPreviewVersion] = useState<QuestionnaireVersion | null>(null);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activePickerContext, setActivePickerContext] = useState<{ questionId: string; optionIndex: number } | null>(null);

  const [analytics, setAnalytics] = useState<TrailAnalyticsSummary | null>(null);

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [publishNotes, setPublishNotes] = useState('');
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  const [recoveryBackup] = useState<Question[] | null>(() => {
    const backup = readBackup();
    if (!backup) return null;
    return JSON.stringify(backup) !== JSON.stringify(initialQuestions) ? backup : null;
  });
  const [dismissedRecovery, setDismissedRecovery] = useState(false);

  const contentQuestions = useMemo(() => questions.filter((q) => q.type !== 'availability'), [questions]);
  const availabilityQuestion = useMemo(() => questions.find((q) => q.type === 'availability'), [questions]);

  const questionnaireForValidation: Questionnaire = useMemo(
    () => ({ version: draftVersion ?? 0, status: 'draft', questions }),
    [draftVersion, questions],
  );
  const lockedVariableKeys = useMemo(
    () => Object.fromEntries(variableDefinitions.map((definition) => [definition.questionId, definition.key])),
    [variableDefinitions],
  );
  const validationErrors = useMemo(
    () => validateQuestionnaire(questionnaireForValidation, index, { lockedVariableKeys }),
    [questionnaireForValidation, index, lockedVariableKeys],
  );
  const diagnostics = useMemo(
    () => analyzeQuestionnaire(questionnaireForValidation, index),
    [questionnaireForValidation, index],
  );
  const issuesByQuestionId = useMemo(() => {
    const map = new Map<string, number>();
    diagnostics.forEach((item) => {
      if (item.questionId) map.set(item.questionId, (map.get(item.questionId) || 0) + 1);
    });
    return map;
  }, [diagnostics]);

  const isDirty = JSON.stringify(questions) !== savedSnapshot;
  const canPublish = validationErrors.length === 0;

  // Backup local: se salvar falhar, a próxima visita oferece recuperar em vez de perder a edição.
  useEffect(() => {
    if (typeof window === 'undefined' || !isDirty) return;
    try { window.localStorage.setItem(BACKUP_KEY, JSON.stringify(questions)); } catch { /* armazenamento indisponível — segue sem backup */ }
  }, [questions, isDirty]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    if (activeTab !== 'stats') return;
    let isMounted = true;
    async function loadAnalytics() {
      try {
        const res = await getAdminTrailAnalytics();
        if (res.success && res.data && isMounted) {
          setAnalytics(summarizeTrailAnalytics(res.data, res.trails || []));
        }
      } catch (err) {
        console.error('Erro ao carregar analytics da trilha', err);
      }
    }
    loadAnalytics();
    return () => { isMounted = false; };
  }, [activeTab]);

  const clearBackup = () => {
    try { window.localStorage.removeItem(BACKUP_KEY); } catch { /* nada a limpar */ }
  };

  const refreshVersions = async () => {
    const res = await getQuestionnaireVersions();
    if (res.success && res.data) setVersions(res.data.versions);
  };

  const handleUpdateQuestion = (id: string, updated: Question) => {
    setQuestions((current) => current.map((q) => (q.id === id ? updated : q)));
  };

  const handleAddQuestion = () => {
    setQuestions((current) => {
      const availabilityIdx = current.findIndex((q) => q.type === 'availability');
      const next = [...current];
      next.splice(availabilityIdx < 0 ? next.length : availabilityIdx, 0, createEmptyQuestion());
      return next;
    });
  };

  const handleAddOpenQuestion = () => {
    setQuestions((current) => {
      const availabilityIdx = current.findIndex((q) => q.type === 'availability');
      const next = [...current];
      next.splice(availabilityIdx < 0 ? next.length : availabilityIdx, 0, createEmptyOpenQuestion());
      return next;
    });
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions((current) => current.filter((q) => q.id !== id));
  };

  const handleDuplicateQuestion = (id: string) => {
    setQuestions((current) => {
      const idx = current.findIndex((q) => q.id === id);
      if (idx === -1) return current;
      const copy: Question = {
        ...current[idx],
        id: `q_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        text: `${current[idx].text} (cópia)`,
        variableKey: undefined,
      };
      const next = [...current];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const handleReorderContentQuestions = (newOrder: Question[]) => {
    setQuestions((current) => {
      const availability = current.find((q) => q.type === 'availability');
      return availability ? [...newOrder, availability] : newOrder;
    });
  };

  const handleAddAvailabilityQuestion = () => {
    setQuestions((current) => [...current, createDefaultAvailabilityQuestion()]);
  };

  const openPicker = (questionId: string, optionIndex: number) => {
    setActivePickerContext({ questionId, optionIndex });
    setIsPickerOpen(true);
  };

  const handleAddMappings = (newMappings: ContentMapping[]) => {
    if (!activePickerContext) return;
    const { questionId, optionIndex } = activePickerContext;
    setQuestions((current) => current.map((question) => {
      if (question.id !== questionId) return question;
      const option = question.options[optionIndex];
      if (!option) return question;
      const existingIds = new Set((option.contentMappings || []).map((m) => m.id));
      const toAdd = newMappings.filter((m) => !existingIds.has(m.id));
      const updatedOption = { ...option, contentMappings: [...(option.contentMappings || []), ...toAdd] };
      return { ...question, options: question.options.map((o, i) => (i === optionIndex ? updatedOption : o)) };
    }));
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const res = await saveQuestionnaireDraft(questions);
      if (!res.success || !res.data) {
        toast.error(res.message || 'Erro ao salvar rascunho.');
        return;
      }
      setHasDraft(true);
      setDraftVersion(res.data.version);
      setSavedSnapshot(JSON.stringify(questions));
      clearBackup();
      toast.success('Rascunho salvo.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleConfirmPublish = async () => {
    setIsPublishing(true);
    try {
      const res = await publishQuestionnaire(questions, publishNotes.trim() || undefined);
      if (!res.success || !res.data) {
        toast.error(res.message || 'Erro ao publicar.');
        return;
      }
      const publishedVersion = res.data.version;
      setHasDraft(false);
      setDraftVersion(null);
      setPublishedInfo({ version: publishedVersion });
      setPublishedQuestions(questions);
      setVariableDefinitions((current) => {
        const activeKeys = new Set(questions.map((question) => question.variableKey).filter(Boolean));
        const previous = current.map((definition) => ({ ...definition, active: activeKeys.has(definition.key) }));
        questions.forEach((question) => {
          if (!question.variableKey || previous.some((definition) => definition.key === question.variableKey)) return;
          if (question.type === 'availability') return;
          previous.push({
            key: question.variableKey,
            questionId: question.id,
            questionText: question.text,
            questionType: question.type,
            active: true,
            publishedVersion,
          });
        });
        return previous;
      });
      setSavedSnapshot(JSON.stringify(questions));
      setPublishNotes('');
      setIsPublishDialogOpen(false);
      clearBackup();
      toast.success(`Questionário publicado — v${res.data.version}.`);
      refreshVersions();
      router.refresh();
    } catch (error) {
      console.error('Erro inesperado ao publicar questionário:', error);
      toast.error('Não foi possível publicar o questionário.', {
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!window.confirm('Descartar o rascunho e voltar para o que está publicado?')) return;
    setIsDiscarding(true);
    try {
      const res = await discardQuestionnaireDraft();
      if (!res.success) {
        toast.error(res.message || 'Erro ao descartar rascunho.');
        return;
      }
      setQuestions(publishedQuestions);
      setHasDraft(false);
      setDraftVersion(null);
      setSavedSnapshot(JSON.stringify(publishedQuestions));
      clearBackup();
      toast.success('Rascunho descartado.');
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleRestoreVersion = async (version: QuestionnaireVersion) => {
    setRestoringVersion(version.version);
    try {
      const res = await restoreQuestionnaireVersion(version.version);
      if (!res.success || !res.data) {
        toast.error(res.message || 'Erro ao restaurar versão.');
        return;
      }
      setQuestions(version.questions);
      setHasDraft(true);
      setDraftVersion(res.data.version);
      setSavedSnapshot(JSON.stringify(version.questions));
      setPreviewVersion(null);
      setActiveTab('questions');
      clearBackup();
      toast.success(`Versão v${version.version} copiada para o rascunho — revise e publique.`);
      refreshVersions();
    } finally {
      setRestoringVersion(null);
    }
  };

  const handlePreviewVersion = (version: QuestionnaireVersion) => {
    setPreviewVersion(version);
    setActiveTab('preview');
  };

  const statusTone = hasDraft ? 'warning' : publishedInfo ? 'positive' : 'neutral';
  const statusLabel = hasDraft
    ? `Rascunho${draftVersion ? ` (base v${draftVersion})` : ''}`
    : publishedInfo
      ? `Publicado (v${publishedInfo.version})`
      : 'Sem publicação';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-8 pb-12">
      <PageHeader
        eyebrow="Learning Paths Engine"
        title="Onboarding & Trilhas"
        description="Gerencie o questionário inicial do aluno e defina a regra de liberação de conteúdos baseada em cada resposta para gerar trilhas exclusivas."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
                {isDirty && <StatusBadge tone="warning">Alterações não salvas</StatusBadge>}
              </div>
              {/* Documentação das regras do motor — discreta, ao lado do status. */}
              <Link
                href="/admin/onboarding/function"
                title="Como as trilhas são criadas"
                aria-label="Ver as regras de criação das trilhas"
                className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-accent"
              >
                <HelpCircle size={17} />
              </Link>
            </div>
            {hasDraft && (
              <button
                onClick={handleDiscardDraft}
                disabled={isDiscarding}
                className="flex min-h-10 items-center gap-2 rounded-full border border-border/60 px-4 text-sm font-semibold text-muted hover:bg-surface-hover disabled:opacity-50 transition-colors"
              >
                <Undo2 size={16} />
                Descartar rascunho
              </button>
            )}
            <button
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="flex min-h-10 items-center gap-2 rounded-full border border-border/60 bg-surface px-4 text-sm font-bold text-foreground hover:bg-surface-hover disabled:opacity-50 transition-colors"
            >
              {isSavingDraft ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              Salvar rascunho
            </button>
            <button
              onClick={() => canPublish ? setIsPublishDialogOpen(true) : toast.error('Revise as pendências antes de publicar.')}
              disabled={!canPublish}
              title={!canPublish ? validationErrors.join(' ') : undefined}
              className="flex min-h-10 items-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-accent-foreground hover:bg-accent-hover disabled:opacity-40 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <UploadCloud size={17} />
              Publicar
            </button>
          </div>
        }
      />

      {recoveryBackup && !dismissedRecovery && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/8 p-4 text-sm text-warning">
          <span className="flex items-center gap-2"><TriangleAlert size={16} /> Encontramos uma edição não salva neste navegador.</span>
          <div className="flex gap-2">
            <button
              onClick={() => { setQuestions(recoveryBackup); setDismissedRecovery(true); }}
              className="rounded-lg bg-warning/20 px-3 py-1.5 font-bold hover:bg-warning/30 transition-colors"
            >
              Recuperar
            </button>
            <button
              onClick={() => { clearBackup(); setDismissedRecovery(true); }}
              className="rounded-lg px-3 py-1.5 font-semibold hover:bg-warning/10 transition-colors"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'questions' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <ListChecks size={18} />
          Perguntas & Mapeamentos
          {validationErrors.length > 0 && (
            <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">{validationErrors.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'preview' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <PlayCircle size={18} />
          Prévia da Trilha
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'stats' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <BarChart3 size={18} />
          Saúde & Resultados
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'history' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          <History size={18} />
          Histórico
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'questions' && validationErrors.length > 0 && (
          <div className="mb-5 rounded-xl border border-warning/30 bg-warning/8 p-4 text-sm text-warning">
            <p className="flex items-center gap-2 font-bold"><TriangleAlert size={17} /> Pendências para publicar</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="flex flex-col gap-4 max-w-5xl">
            <Reorder.Group as="div" axis="y" values={contentQuestions} onReorder={handleReorderContentQuestions} className="flex flex-col gap-4">
              {contentQuestions.map((question, idx) => (
                <Reorder.Item as="div" key={question.id} value={question}>
                  <QuestionEditor
                    question={question}
                    index={idx}
                    onUpdate={(updated) => handleUpdateQuestion(question.id, updated)}
                    onOpenContentPicker={(optIdx) => openPicker(question.id, optIdx)}
                    onDelete={() => handleDeleteQuestion(question.id)}
                    onDuplicate={() => handleDuplicateQuestion(question.id)}
                    contentIndex={index}
                    issueCount={issuesByQuestionId.get(question.id) || 0}
                    lockedVariableKey={lockedVariableKeys[question.id]}
                    availableVariableKeys={questions
                      .slice(0, questions.findIndex((item) => item.id === question.id))
                      .map((item) => item.variableKey)
                      .filter((key): key is string => Boolean(key))}
                  />
                </Reorder.Item>
              ))}
            </Reorder.Group>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={handleAddQuestion}
                className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border/60 rounded-2xl text-muted font-bold hover:border-accent hover:text-accent hover:bg-accent/5 transition-all"
              >
                <Plus size={20} />
                Pergunta de escolha
              </button>
              <button
                onClick={handleAddOpenQuestion}
                className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-primary/35 rounded-2xl text-primary font-bold hover:border-primary hover:bg-primary-pale/45 transition-all"
              >
                <Plus size={20} />
                Pergunta aberta para IA
              </button>
            </div>

            {availabilityQuestion ? (
              <AvailabilityQuestionCard
                question={availabilityQuestion}
                onUpdate={(updated) => handleUpdateQuestion(availabilityQuestion.id, updated)}
              />
            ) : (
              <button
                onClick={handleAddAvailabilityQuestion}
                className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-accent/40 rounded-2xl text-accent font-bold hover:bg-accent/5 transition-all"
              >
                <Clock3 size={20} />
                Adicionar pergunta de disponibilidade (obrigatória)
              </button>
            )}
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="max-w-6xl">
            {previewVersion && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm text-accent-soft-foreground">
                <span>Pré-visualizando a versão v{previewVersion.version} do histórico — não afeta seu rascunho atual.</span>
                <button onClick={() => setPreviewVersion(null)} className="flex items-center gap-1 font-bold hover:underline">
                  <X size={14} /> Voltar ao rascunho atual
                </button>
              </div>
            )}
            <TrailPreview questionnaire={previewVersion ?? questionnaireForValidation} index={index} />
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="max-w-6xl space-y-8">
            <section>
              <div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Efetividade</p><h2 className="mt-1 text-2xl font-extrabold text-foreground">Sinais da experiência do aluno</h2></div><Activity className="h-6 w-6 text-accent" /></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="editorial-card p-5"><CheckCircle2 className="h-5 w-5 text-success" /><p className="mt-4 text-xs font-semibold text-muted">Sessões concluídas</p><p className="mt-1 text-3xl font-extrabold text-foreground">{analytics?.completedSessions || 0}<span className="text-base text-muted">/{analytics?.plannedSessions || 0}</span></p><p className="mt-2 text-xs text-muted">{analytics?.completionRate || 0}% do plano atual</p></div>
                <div className="editorial-card p-5"><Clock3 className="h-5 w-5 text-accent-orange" /><p className="mt-4 text-xs font-semibold text-muted">Carga suportada</p><p className="mt-1 text-3xl font-extrabold text-foreground">{analytics?.averageSupportedMinutes || 0}<span className="text-base text-muted"> min</span></p><p className="mt-2 text-xs text-muted">Média de sessões leves ou adequadas</p></div>
                <div className="editorial-card p-5"><RefreshCw className="h-5 w-5 text-accent" /><p className="mt-4 text-xs font-semibold text-muted">Taxa de replanejamento</p><p className="mt-1 text-3xl font-extrabold text-foreground">{analytics?.replanRate || 0}%</p><p className="mt-2 text-xs text-muted">{analytics?.replanCount || 0} ajustes registrados</p></div>
                <div className="editorial-card p-5"><BarChart3 className="h-5 w-5 text-accent" /><p className="mt-4 text-xs font-semibold text-muted">Onboarding concluído</p><p className="mt-1 text-3xl font-extrabold text-foreground">{analytics?.onboardingCompletionRate || 0}%</p><p className="mt-2 text-xs text-muted">{analytics?.onboardingCompletions || 0} de {analytics?.onboardingStarts || 0} inícios</p></div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="editorial-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">Diagnóstico</p><h3 className="mt-1 text-xl font-extrabold text-foreground">Saúde da curadoria</h3></div><span className="rounded-full bg-background-secondary px-3 py-1 text-xs font-bold text-muted">{diagnostics.length} sinais</span></div>{diagnostics.length === 0 ? <div className="mt-6 flex items-center gap-3 rounded-lg border border-positive/20 bg-success/5 p-4 text-sm text-success"><CheckCircle2 size={19} /> Nenhuma inconsistência encontrada na configuração atual.</div> : <div className="mt-5 space-y-3">{diagnostics.map((item) => <article key={item.id} className={`rounded-lg border p-4 ${item.severity === 'error' ? 'border-danger/25 bg-danger/5' : item.severity === 'warning' ? 'border-warning/25 bg-warning/5' : 'border-accent/20 bg-accent/5'}`}><div className="flex items-start gap-3"><TriangleAlert className={`mt-0.5 h-4 w-4 shrink-0 ${item.severity === 'error' ? 'text-danger' : item.severity === 'warning' ? 'text-warning' : 'text-accent'}`} /><div><h4 className="text-sm font-bold text-foreground">{item.title}</h4><p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p></div></div></article>)}</div>}</div>

              <div className="space-y-6"><div className="editorial-card p-5 sm:p-6"><p className="eyebrow">Abandono por etapa</p><h3 className="mt-1 text-xl font-extrabold text-foreground">Funil do onboarding</h3>{analytics?.stepViews.length ? <div className="mt-5 space-y-3">{analytics.stepViews.map((step) => <div key={step.step}><div className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold text-muted">{step.step}. {step.label}</span><strong className="text-foreground">-{step.dropRate}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-background-secondary"><div className="h-full rounded-full bg-accent" style={{ width: `${analytics.onboardingStarts ? Math.min(100, (step.views / analytics.onboardingStarts) * 100) : 0}%` }} /></div></div>)}</div> : <p className="mt-5 text-sm text-muted">O funil aparecerá após uma passagem pelo onboarding.</p>}</div><div className="editorial-card p-5 sm:p-6"><p className="eyebrow">Conteúdos ignorados</p><h3 className="mt-1 text-xl font-extrabold text-foreground">Removidos pelos alunos</h3>{analytics?.ignoredContents.length ? <div className="mt-4 space-y-2">{analytics.ignoredContents.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-background-secondary px-3 py-2 text-sm"><span className="truncate font-semibold text-muted">{item.title}</span><strong className="text-foreground">{item.count}×</strong></div>)}</div> : <p className="mt-5 text-sm text-muted">Nenhum conteúdo foi removido em toda a base de alunos.</p>}</div></div>
            </section>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-4xl">
            <VersionHistoryPanel
              versions={versions}
              onPreview={handlePreviewVersion}
              onRestore={handleRestoreVersion}
              restoringVersion={restoringVersion}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <ContentPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onAddMappings={handleAddMappings}
        index={index}
      />

      {isPublishDialogOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setIsPublishDialogOpen(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/50 bg-surface shadow-2xl p-6">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><UploadCloud size={19} className="text-accent" /> Publicar questionário</h2>
            <p className="mt-2 text-sm text-muted">
              A versão atualmente publicada será arquivada e esta se torna a nova versão ativa para todos os alunos.
            </p>
            <label className="mt-4 block text-xs font-semibold text-muted">Nota da versão (opcional)</label>
            <textarea
              value={publishNotes}
              onChange={(event) => setPublishNotes(event.target.value)}
              placeholder="O que mudou nesta versão?"
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent resize-none"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setIsPublishDialogOpen(false)}
                className="px-5 py-2.5 rounded-lg font-semibold text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPublish}
                disabled={isPublishing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-50 transition-colors shadow-sm"
              >
                {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                {isPublishing ? 'Publicando…' : 'Confirmar publicação'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
