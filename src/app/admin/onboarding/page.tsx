'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Route, Save, PlayCircle, BarChart3, ListChecks, Plus, TriangleAlert, Activity, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';
import { Questionnaire, Question, ContentMapping } from '@/types/trilha';
import { mockQuestionnaire } from '@/lib/seed/questionnaire';
import { QuestionEditor } from '@/components/admin/onboarding/QuestionEditor';
import { ContentPickerModal } from '@/components/admin/onboarding/ContentPickerModal';
import { TrailPreview } from '@/components/admin/onboarding/TrailPreview';
import { toast } from 'sonner';
import { loadQuestionnaire, saveQuestionnaire } from '@/lib/trailStorage';
import { validateQuestionnaire } from '@/lib/matching';
import { analyzeQuestionnaire } from '@/lib/adminTrailDiagnostics';
import { readTrailAnalytics, summarizeTrailAnalytics, TrailAnalyticsSummary } from '@/lib/trailAnalytics';
import { readLearningTrail } from '@/lib/trailStorage';

export default function AdminOnboardingPage() {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire>(mockQuestionnaire);
  const [activeTab, setActiveTab] = useState<'questions' | 'preview' | 'stats'>('questions');
  
  // Modal state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activePickerContext, setActivePickerContext] = useState<{ qIdx: number, oIdx: number } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<TrailAnalyticsSummary | null>(null);
  const diagnostics = useMemo(() => analyzeQuestionnaire(questionnaire), [questionnaire]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setQuestionnaire(loadQuestionnaire()));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (activeTab !== 'stats') return;
    const frame = requestAnimationFrame(() => setAnalytics(summarizeTrailAnalytics(readTrailAnalytics(), readLearningTrail().data)));
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

  const handleUpdateQuestion = (index: number, updatedQuestion: Question) => {
    const newQuestions = [...questionnaire.questions];
    newQuestions[index] = updatedQuestion;
    setQuestionnaire({ ...questionnaire, questions: newQuestions });
  };

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      type: 'single',
      text: 'Nova Pergunta',
      role: 'perfil',
      visualType: 'list',
      options: [
        { label: 'Opção 1', tags: [], contentMappings: [] }
      ]
    };
    const availabilityIndex = questionnaire.questions.findIndex((question) => question.type === 'availability');
    const questions = [...questionnaire.questions];
    questions.splice(availabilityIndex < 0 ? questions.length : availabilityIndex, 0, newQuestion);
    setQuestionnaire({ ...questionnaire, questions });
  };

  const openPicker = (qIdx: number, oIdx: number) => {
    setActivePickerContext({ qIdx, oIdx });
    setIsPickerOpen(true);
  };

  const handleAddMappings = (newMappings: ContentMapping[]) => {
    if (!activePickerContext) return;
    const { qIdx, oIdx } = activePickerContext;
    
    const question = questionnaire.questions[qIdx];
    const option = question.options[oIdx];
    
    const currentMappings = option.contentMappings || [];
    
    // Evitar duplicatas exatas de id
    const existingIds = new Set(currentMappings.map(m => m.id));
    const toAdd = newMappings.filter(m => !existingIds.has(m.id));

    const updatedOption = {
      ...option,
      contentMappings: [...currentMappings, ...toAdd]
    };

    handleUpdateQuestion(qIdx, {
      ...question,
      options: question.options.map((o, i) => i === oIdx ? updatedOption : o)
    });
  };

  const handleSave = () => {
    const errors = validateQuestionnaire(questionnaire);
    setValidationErrors(errors);
    if (errors.length > 0) {
      toast.error('Revise as pendências antes de salvar.');
      return;
    }
    const saved = { ...questionnaire, version: questionnaire.version + 1, status: 'published' as const };
    saveQuestionnaire(saved);
    setQuestionnaire(saved);
    toast.success('Questionário publicado e conectado ao onboarding.');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1">
            <Route className="w-5 h-5" />
            <span>Learning Paths Engine</span>
          </div>
          <h1 className="text-3xl font-display font-black text-ink-deep">
            Onboarding & Trilhas
          </h1>
          <p className="text-text-soft text-sm mt-1 max-w-2xl">
            Gerencie o questionário inicial do aluno e defina a regra de liberação de conteúdos baseada em cada resposta para gerar trilhas exclusivas.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-surface-card rounded-full border border-border/60 text-sm font-semibold">
            <span className={`w-2 h-2 rounded-full ${questionnaire.status === 'published' ? 'bg-positive' : 'bg-warning'}`}></span>
            {questionnaire.status === 'published' ? 'Publicado' : 'Rascunho'} (v{questionnaire.version})
          </div>
          <button 
            onClick={handleSave}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold hover:bg-primary-active transition-all flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Save size={18} />
            Salvar Alterações
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'questions' ? 'border-primary text-primary' : 'border-transparent text-text-mute hover:text-text'
          }`}
        >
          <ListChecks size={18} />
          Perguntas & Mapeamentos
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'preview' ? 'border-primary text-primary' : 'border-transparent text-text-mute hover:text-text'
          }`}
        >
          <PlayCircle size={18} />
          Prévia da Trilha
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'stats' ? 'border-primary text-primary' : 'border-transparent text-text-mute hover:text-text'
          }`}
        >
          <BarChart3 size={18} />
          Saúde & Resultados
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {validationErrors.length > 0 && (
          <div className="mb-5 rounded-[12px] border border-warning/30 bg-warning/8 p-4 text-sm text-warning">
            <p className="flex items-center gap-2 font-bold"><TriangleAlert size={17} /> Pendências para publicar</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        )}
        {activeTab === 'questions' && (
          <div className="flex flex-col gap-4 max-w-5xl">
            {questionnaire.questions.map((question, idx) => (
              <QuestionEditor 
                key={question.id}
                question={question}
                index={idx}
                onUpdate={(updated) => handleUpdateQuestion(idx, updated)}
                onOpenContentPicker={(optIdx) => openPicker(idx, optIdx)}
              />
            ))}
            
            <button 
              onClick={handleAddQuestion}
              className="mt-4 flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-border/60 rounded-2xl text-text-mute font-bold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
            >
              <Plus size={20} />
              Adicionar Nova Pergunta
            </button>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="max-w-6xl">
            <TrailPreview questionnaire={questionnaire} />
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="max-w-6xl space-y-8">
            <div className="rounded-[12px] border border-primary/20 bg-primary/5 p-4 text-sm text-text-soft"><strong className="text-primary-active">Protótipo local:</strong> os indicadores abaixo representam a atividade registrada neste navegador e já usam os mesmos eventos que poderão ser enviados ao backend futuramente.</div>

            <section>
              <div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Efetividade</p><h2 className="mt-1 text-2xl font-extrabold text-ink">Sinais da experiência do aluno</h2></div><Activity className="h-6 w-6 text-primary" /></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="editorial-card p-5"><CheckCircle2 className="h-5 w-5 text-positive" /><p className="mt-4 text-xs font-semibold text-text-mute">Sessões concluídas</p><p className="mt-1 text-3xl font-extrabold text-ink">{analytics?.completedSessions || 0}<span className="text-base text-text-mute">/{analytics?.plannedSessions || 0}</span></p><p className="mt-2 text-xs text-text-soft">{analytics?.completionRate || 0}% do plano atual</p></div>
                <div className="editorial-card p-5"><Clock3 className="h-5 w-5 text-accent-orange" /><p className="mt-4 text-xs font-semibold text-text-mute">Carga suportada</p><p className="mt-1 text-3xl font-extrabold text-ink">{analytics?.averageSupportedMinutes || 0}<span className="text-base text-text-mute"> min</span></p><p className="mt-2 text-xs text-text-soft">Média de sessões leves ou adequadas</p></div>
                <div className="editorial-card p-5"><RefreshCw className="h-5 w-5 text-primary" /><p className="mt-4 text-xs font-semibold text-text-mute">Taxa de replanejamento</p><p className="mt-1 text-3xl font-extrabold text-ink">{analytics?.replanRate || 0}%</p><p className="mt-2 text-xs text-text-soft">{analytics?.replanCount || 0} ajustes registrados</p></div>
                <div className="editorial-card p-5"><BarChart3 className="h-5 w-5 text-primary" /><p className="mt-4 text-xs font-semibold text-text-mute">Onboarding concluído</p><p className="mt-1 text-3xl font-extrabold text-ink">{analytics?.onboardingCompletionRate || 0}%</p><p className="mt-2 text-xs text-text-soft">{analytics?.onboardingCompletions || 0} de {analytics?.onboardingStarts || 0} inícios</p></div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="editorial-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">Diagnóstico</p><h3 className="mt-1 text-xl font-extrabold text-ink">Saúde da curadoria</h3></div><span className="rounded-full bg-canvas-soft px-3 py-1 text-xs font-bold text-text-soft">{diagnostics.length} sinais</span></div>{diagnostics.length === 0 ? <div className="mt-6 flex items-center gap-3 rounded-[10px] border border-positive/20 bg-positive/5 p-4 text-sm text-positive"><CheckCircle2 size={19} /> Nenhuma inconsistência encontrada na configuração atual.</div> : <div className="mt-5 space-y-3">{diagnostics.map((item) => <article key={item.id} className={`rounded-[10px] border p-4 ${item.severity === 'error' ? 'border-negative/25 bg-negative/5' : item.severity === 'warning' ? 'border-warning/25 bg-warning/5' : 'border-primary/20 bg-primary/5'}`}><div className="flex items-start gap-3"><TriangleAlert className={`mt-0.5 h-4 w-4 shrink-0 ${item.severity === 'error' ? 'text-negative' : item.severity === 'warning' ? 'text-warning' : 'text-primary'}`} /><div><h4 className="text-sm font-bold text-ink">{item.title}</h4><p className="mt-1 text-xs leading-5 text-text-soft">{item.detail}</p></div></div></article>)}</div>}</div>

              <div className="space-y-6"><div className="editorial-card p-5 sm:p-6"><p className="eyebrow">Abandono por etapa</p><h3 className="mt-1 text-xl font-extrabold text-ink">Funil do onboarding</h3>{analytics?.stepViews.length ? <div className="mt-5 space-y-3">{analytics.stepViews.map((step) => <div key={step.step}><div className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold text-text-soft">{step.step}. {step.label}</span><strong className="text-ink">-{step.dropRate}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas-soft"><div className="h-full rounded-full bg-primary" style={{ width: `${analytics.onboardingStarts ? Math.min(100, (step.views / analytics.onboardingStarts) * 100) : 0}%` }} /></div></div>)}</div> : <p className="mt-5 text-sm text-text-mute">O funil aparecerá após uma passagem pelo onboarding.</p>}</div><div className="editorial-card p-5 sm:p-6"><p className="eyebrow">Conteúdos ignorados</p><h3 className="mt-1 text-xl font-extrabold text-ink">Removidos pelos alunos</h3>{analytics?.ignoredContents.length ? <div className="mt-4 space-y-2">{analytics.ignoredContents.slice(0, 5).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-[9px] bg-canvas-soft px-3 py-2 text-sm"><span className="truncate font-semibold text-text-soft">{item.title}</span><strong className="text-ink">{item.count}×</strong></div>)}</div> : <p className="mt-5 text-sm text-text-mute">Nenhum conteúdo foi removido neste dispositivo.</p>}</div></div>
            </section>
          </div>
        )}
      </div>

      {/* Modals */}
      <ContentPickerModal 
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onAddMappings={handleAddMappings}
      />
    </div>
  );
}
