'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tabs } from '@heroui/react';
import { ONBOARDING_TAB_PARAMS, type OnboardingTab } from './tabs';
import { Reorder } from 'framer-motion';
import {
  Save, PlayCircle, BarChart3, ListChecks, Plus, TriangleAlert, CheckCircle2,
  Clock3, History, UploadCloud, Undo2, X, Loader2, HelpCircle,
} from 'lucide-react';
import { toast } from "@/lib/toast";
import { Questionnaire, Question, ContentMapping, QuestionnaireVersion, EligibleLesson } from '@/types/trilha';
import { createContentIndex, type ContentItem } from '@/lib/contentCatalog';
import { validateQuestionnaire } from '@/lib/matching';
import { analyzeQuestionnaire } from '@/lib/adminTrailDiagnostics';
import {
  saveQuestionnaireDraft, publishQuestionnaire, restoreQuestionnaireVersion,
  discardQuestionnaireDraft, getQuestionnaireVersions,
} from '@/app/actions/admin/content';
import { QuestionEditor } from '@/components/admin/onboarding/QuestionEditor';
import { AvailabilityQuestionCard } from '@/components/admin/onboarding/AvailabilityQuestionCard';
import { ContentPickerModal } from '@/components/admin/onboarding/ContentPickerModal';
import { TrailPreview } from '@/components/admin/onboarding/TrailPreview';
import { VersionHistoryPanel } from '@/components/admin/onboarding/VersionHistoryPanel';
import { TrailHealthPanel } from '@/components/admin/onboarding/TrailHealthPanel';
import { PageHeader, StatusBadge } from '@/components/ui/editorial';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { OnboardingVariableDefinition } from '@/lib/userVariables';

const BACKUP_KEY = 'smartlms_onboarding_draft_backup_v1';

/** Quantas perguntas a publicação cria, altera e remove em relação à versão no ar. */
function diffQuestions(published: Question[], next: Question[]) {
  const before = new Map(published.map((question) => [question.id, JSON.stringify(question)]));
  const after = new Set(next.map((question) => question.id));
  return {
    added: next.filter((question) => !before.has(question.id)).length,
    changed: next.filter((question) => before.has(question.id) && before.get(question.id) !== JSON.stringify(question)).length,
    removed: published.filter((question) => !after.has(question.id)).length,
  };
}

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
  initialTab?: OnboardingTab;
}

export function OnboardingClient({
  initialDraft, initialPublished, initialVersions, contentItems, eligibleLessons, initialVariableDefinitions,
  initialTab = 'questions',
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

  const [activeTab, setActiveTabState] = useState<OnboardingTab>(initialTab);
  const [previewVersion, setPreviewVersion] = useState<QuestionnaireVersion | null>(null);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activePickerContext, setActivePickerContext] = useState<{ questionId: string; optionIndex: number } | null>(null);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

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
  const publishDiff = useMemo(() => diffQuestions(publishedQuestions, questions), [publishedQuestions, questions]);

  /** Troca de aba sem navegação: só reescreve `?aba=` para o link e o recarregar caírem na mesma aba. */
  const setActiveTab = (tab: OnboardingTab) => {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    if (tab === 'questions') url.searchParams.delete('aba');
    else url.searchParams.set('aba', ONBOARDING_TAB_PARAMS[tab]);
    window.history.replaceState(window.history.state, '', url);
  };

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

  // No celular a faixa de abas rola: a aba aberta (inclusive a vinda de `?aba=`) precisa ficar à vista.
  useEffect(() => {
    // Um quadro depois: na montagem a faixa ainda não tem a largura final.
    const frame = requestAnimationFrame(() => {
      document
        .querySelector('[aria-label="Seções do onboarding"] [role="tab"][aria-selected="true"]')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  // ⌘S / Ctrl+S salva o rascunho em vez de abrir o "salvar página" do navegador.
  const saveShortcutRef = React.useRef<() => void>(() => {});
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveShortcutRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /** Diagnóstico da aba de resultados → pergunta correspondente no editor. */
  const handleOpenQuestion = (questionId: string) => {
    setActiveTab('questions');
    // Dois quadros: um para a aba montar o painel, outro para o editor existir no DOM.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = document.getElementById(`question-${questionId}`);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Um pulso no contorno para o olho achar a pergunta depois da rolagem.
      target.animate?.(
        [{ boxShadow: '0 0 0 3px var(--accent)' }, { boxShadow: '0 0 0 3px var(--accent)', offset: 0.6 }, { boxShadow: '0 0 0 0 transparent' }],
        { duration: 1800, easing: 'ease-out' },
      );
    }));
  };

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
    if (isSavingDraft || !isDirty) return;
    setIsSavingDraft(true);
    try {
      const res = await saveQuestionnaireDraft(questions);
      if (!res.success || !res.data) {
        toast.danger(res.message || 'Erro ao salvar rascunho.');
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

  useEffect(() => { saveShortcutRef.current = handleSaveDraft; });

  const handleConfirmPublish = async () => {
    setIsPublishing(true);
    try {
      const res = await publishQuestionnaire(questions, publishNotes.trim() || undefined);
      if (!res.success || !res.data) {
        toast.danger(res.message || 'Erro ao publicar.');
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
      toast.danger('Não foi possível publicar o questionário.', {
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDiscardDraft = () => {
    setIsDiscardConfirmOpen(true);
  };

  const confirmDiscard = async () => {
    setIsDiscarding(true);
    try {
      const res = await discardQuestionnaireDraft();
      if (!res.success) {
        toast.danger(res.message || 'Erro ao descartar rascunho.');
        return;
      }
      setQuestions(publishedQuestions);
      setHasDraft(false);
      setDraftVersion(null);
      setSavedSnapshot(JSON.stringify(publishedQuestions));
      clearBackup();
      toast.success('Rascunho descartado.');
      setIsDiscardConfirmOpen(false);
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleRestoreVersion = async (version: QuestionnaireVersion) => {
    setRestoringVersion(version.version);
    try {
      const res = await restoreQuestionnaireVersion(version.version);
      if (!res.success || !res.data) {
        toast.danger(res.message || 'Erro ao restaurar versão.');
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
              disabled={isSavingDraft || !isDirty}
              title={isDirty ? 'Salvar rascunho (⌘S)' : 'Nenhuma alteração para salvar'}
              className="flex min-h-10 items-center gap-2 rounded-full border border-border/60 bg-surface px-4 text-sm font-bold text-foreground hover:bg-surface-hover disabled:opacity-50 transition-colors"
            >
              {isSavingDraft ? <Loader2 size={17} className="animate-spin" /> : isDirty ? <Save size={17} /> : <CheckCircle2 size={17} />}
              {isSavingDraft ? 'Salvando…' : isDirty ? 'Salvar rascunho' : 'Tudo salvo'}
            </button>
            <button
              onClick={() => canPublish ? setIsPublishDialogOpen(true) : toast.danger('Revise as pendências antes de publicar.')}
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

      <Tabs.Root
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(String(key) as OnboardingTab)}
        className="flex min-w-0 flex-col"
      >
        <Tabs.List aria-label="Seções do onboarding" className="hide-scrollbar w-full max-w-full gap-1 overflow-x-auto">
          <Tabs.Tab id="questions" className="w-auto shrink-0 gap-2 whitespace-nowrap font-semibold sm:w-full">
            <ListChecks size={17} aria-hidden="true" />
            Perguntas & Mapeamentos
            {validationErrors.length > 0 && (
              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger" aria-label={`${validationErrors.length} pendências`}>
                {validationErrors.length}
              </span>
            )}
          </Tabs.Tab>
          <Tabs.Tab id="preview" className="w-auto shrink-0 gap-2 whitespace-nowrap font-semibold sm:w-full">
            <PlayCircle size={17} aria-hidden="true" />
            Prévia da Trilha
          </Tabs.Tab>
          <Tabs.Tab id="stats" className="w-auto shrink-0 gap-2 whitespace-nowrap font-semibold sm:w-full">
            <BarChart3 size={17} aria-hidden="true" />
            Saúde & Resultados
          </Tabs.Tab>
          <Tabs.Tab id="history" className="w-auto shrink-0 gap-2 whitespace-nowrap font-semibold sm:w-full">
            <History size={17} aria-hidden="true" />
            Histórico
            {versions.length > 0 && <span className="text-xs font-semibold text-muted" data-numeric>{versions.length}</span>}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel id="questions" className="min-h-[500px] pt-6">
        {validationErrors.length > 0 && (
          <div className="mb-5 rounded-xl border border-warning/30 bg-warning/8 p-4 text-sm text-warning">
            <p className="flex items-center gap-2 font-bold"><TriangleAlert size={17} /> Pendências para publicar</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        )}

        
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
                className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-accent/35 rounded-2xl text-accent font-bold hover:border-accent hover:bg-accent-soft/45 transition-all"
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
        </Tabs.Panel>

        <Tabs.Panel id="preview" className="min-h-[500px] pt-6">
        
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
        </Tabs.Panel>

        <Tabs.Panel id="stats" className="min-h-[500px] pt-6">
        
          <TrailHealthPanel
            questions={publishedQuestions.length ? publishedQuestions : questions}
            isUsingDraft={publishedQuestions.length === 0}
            diagnostics={diagnostics}
            onOpenQuestion={handleOpenQuestion}
          />
        </Tabs.Panel>

        <Tabs.Panel id="history" className="min-h-[500px] pt-6">
        
          <div className="max-w-4xl">
            <VersionHistoryPanel
              versions={versions}
              onPreview={handlePreviewVersion}
              onRestore={handleRestoreVersion}
              restoringVersion={restoringVersion}
            />
          </div>
        </Tabs.Panel>
      </Tabs.Root>

      {/* Modals */}
      <ContentPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onAddMappings={handleAddMappings}
        index={index}
      />

      <ConfirmDialog
        isOpen={isPublishDialogOpen}
        onOpenChange={setIsPublishDialogOpen}
        title="Publicar questionário"
        tone="primary"
        confirmLabel="Publicar para todos"
        confirmIcon={<UploadCloud size={16} aria-hidden="true" />}
        isLoading={isPublishing}
        loadingLabel="Publicando…"
        onConfirm={handleConfirmPublish}
        description={(
          <div className="space-y-4 text-sm text-muted">
            <p>
              {publishedInfo
                ? `A v${publishedInfo.version} será arquivada e esta versão passa a valer para quem fizer o onboarding a partir de agora.`
                : 'Esta será a primeira versão publicada — o onboarding passa a usá-la imediatamente.'}
            </p>
            {publishedInfo && (
              <ul className="flex flex-wrap gap-2" aria-label="Resumo das mudanças">
                {publishDiff.added > 0 && <li className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">+{publishDiff.added} {publishDiff.added === 1 ? 'pergunta nova' : 'perguntas novas'}</li>}
                {publishDiff.changed > 0 && <li className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">{publishDiff.changed} {publishDiff.changed === 1 ? 'alterada' : 'alteradas'}</li>}
                {publishDiff.removed > 0 && <li className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-bold text-danger">−{publishDiff.removed} {publishDiff.removed === 1 ? 'removida' : 'removidas'}</li>}
                {publishDiff.added + publishDiff.changed + publishDiff.removed === 0 && <li className="text-xs">Nenhuma pergunta mudou em relação à versão no ar.</li>}
              </ul>
            )}
            <label className="block">
              <span className="text-xs font-semibold text-muted">Nota da versão (opcional)</span>
              <textarea
                value={publishNotes}
                onChange={(event) => setPublishNotes(event.target.value)}
                placeholder="O que mudou nesta versão?"
                rows={3}
                className="mt-1.5 w-full resize-none rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </label>
          </div>
        )}
      />

      <ConfirmDialog
        isOpen={isDiscardConfirmOpen}
        onOpenChange={setIsDiscardConfirmOpen}
        title="Descartar rascunho"
        description="Tem certeza que deseja descartar o rascunho atual e voltar para o questionário publicado? Todas as alterações não salvas serão perdidas."
        confirmLabel="Descartar rascunho"
        confirmTone="danger"
        isLoading={isDiscarding}
        onConfirm={confirmDiscard}
      />
    </div>
  );
}
