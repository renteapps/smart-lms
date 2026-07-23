'use client';

import React, { useState } from 'react';
import { Route, Save, PlayCircle, BarChart3, ListChecks, Plus } from 'lucide-react';
import { Questionnaire, Question, ContentMapping } from '@/types/trilha';
import { mockQuestionnaire } from '@/lib/mocks/trilhaMocks';
import { QuestionEditor } from '@/components/admin/onboarding/QuestionEditor';
import { ContentPickerModal } from '@/components/admin/onboarding/ContentPickerModal';
import { TrailPreview } from '@/components/admin/onboarding/TrailPreview';
import { toast } from 'sonner';

export default function AdminOnboardingPage() {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire>(mockQuestionnaire);
  const [activeTab, setActiveTab] = useState<'questions' | 'preview' | 'stats'>('questions');
  
  // Modal state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activePickerContext, setActivePickerContext] = useState<{ qIdx: number, oIdx: number } | null>(null);

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
    setQuestionnaire({
      ...questionnaire,
      questions: [...questionnaire.questions, newQuestion]
    });
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
    // Aqui seria a chamada de API
    toast.success('Questionário e trilhas salvas com sucesso!');
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
          Resultados (Mock)
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'questions' && (
          <div className="flex flex-col gap-4 max-w-4xl">
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
          <div className="max-w-4xl">
            <TrailPreview questionnaire={questionnaire} />
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="flex flex-col items-center justify-center py-24 text-text-mute border-2 border-dashed border-border/40 rounded-3xl">
            <BarChart3 size={48} className="mb-4 opacity-20" />
            <h3 className="text-xl font-bold mb-2">Estatísticas em Breve</h3>
            <p className="text-sm">Aqui você verá quais são as respostas mais comuns dos alunos.</p>
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
