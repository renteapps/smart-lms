'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProfileTest, ProfileCategory, ProfileQuestion, ProfileTestStatus } from '@/types/profileTest';
import { StepWizard, WizardStep } from '@/components/admin/profile-tests/StepWizard';
import { CategoryEditor } from '@/components/admin/profile-tests/CategoryEditor';
import { QuestionEditor } from '@/components/admin/profile-tests/QuestionEditor';
import { TestPreview } from '@/components/admin/profile-tests/TestPreview';
import { ArrowLeft, ArrowRight, Save, Eye, Sparkles, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const STEPS: WizardStep[] = [
  { id: 1, title: '1. Informações', subtitle: 'Título e Capa' },
  { id: 2, title: '2. Categorias', subtitle: 'Perfis de Resultado' },
  { id: 3, title: '3. Perguntas', subtitle: 'Enunciados e Pontos' },
  { id: 4, title: '4. Revisão', subtitle: 'Preview e Publicar' },
];

export default function NewProfileTestPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [status, setStatus] = useState<ProfileTestStatus>('draft');
  const [resultType, setResultType] = useState<'single' | 'percentage'>('single');

  const [categories, setCategories] = useState<ProfileCategory[]>([
    {
      id: 'cat-1',
      name: 'Perfil A (Ex: Líder Visionário)',
      emoji: '🚀',
      color: '#3B82F6',
      description: 'Descrição das características dominantes do Perfil A.',
    },
    {
      id: 'cat-2',
      name: 'Perfil B (Ex: Comunicador Empático)',
      emoji: '💬',
      color: '#10B981',
      description: 'Descrição das características dominantes do Perfil B.',
    },
  ]);

  const [questions, setQuestions] = useState<ProfileQuestion[]>([
    {
      id: 'q-1',
      text: 'Qual é o seu comportamento padrão em situações de alta pressão?',
      options: [
        {
          id: 'o-1-1',
          text: 'Foco na direção estratégica de longo prazo e inspiração.',
          categoryScores: { 'cat-1': 3 },
        },
        {
          id: 'o-1-2',
          text: 'Foco no alinhamento e bem-estar emocional do time.',
          categoryScores: { 'cat-2': 3 },
        },
      ],
    },
  ]);

  const handleNextStep = () => {
    if (currentStep === 1 && !title.trim()) {
      toast.error('Por favor, informe o título do teste de perfil.');
      return;
    }
    if (currentStep === 2 && categories.length === 0) {
      toast.error('Adicione pelo menos 1 categoria de perfil.');
      return;
    }
    if (currentStep === 3 && questions.length === 0) {
      toast.error('Adicione pelo menos 1 pergunta ao teste.');
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = (saveStatus: ProfileTestStatus) => {
    if (!title.trim()) {
      toast.error('O teste precisa de um título.');
      return;
    }

    const newTest: ProfileTest = {
      id: `test-${Date.now()}`,
      title,
      description,
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop',
      status: saveStatus,
      resultType,
      categories,
      questions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completionsCount: 0,
    };

    console.log('Saved Profile Test:', newTest);
    toast.success(`Teste ${saveStatus === 'published' ? 'publicado' : 'salvo como rascunho'} com sucesso!`);
    router.push('/admin/testes-perfil');
  };

  const currentTestObject: ProfileTest = {
    id: 'draft-preview',
    title: title || 'Novo Teste de Perfil',
    description: description || 'Descrição do teste de perfil...',
    coverUrl,
    status,
    resultType,
    categories,
    questions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/testes-perfil"
            className="p-2 rounded-xl border border-border/60 hover:bg-canvas-soft text-text-soft hover:text-text transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-black text-ink-deep">Criar Novo Teste de Perfil</h1>
            <p className="text-xs text-text-soft">Construa um quiz com diagnósticos dinâmicos estilo ScoreApp.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-border/60 font-semibold text-xs text-text hover:bg-canvas-soft transition-all flex items-center gap-2"
          >
            <Eye className="w-4 h-4 text-primary" />
            Preview do Aluno
          </button>

          <button
            type="button"
            onClick={() => handleSave('published')}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-primary-active transition-all flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            Publicar Teste
          </button>
        </div>
      </div>

      {/* Step Navigation Wizard Header */}
      <StepWizard
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={(stepId) => setCurrentStep(stepId)}
      />

      {/* Step Content Panels */}
      <div className="bg-surface-card border border-border/60 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        
        {/* STEP 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold text-ink-deep mb-1">Informações Básicas do Teste</h2>
              <p className="text-sm text-text-soft">Defina o nome e os detalhes visuais que o aluno verá antes de iniciar.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-soft uppercase tracking-wider block mb-2">
                  Título do Teste *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Descubra seu Perfil de Liderança Dominante"
                  className="w-full bg-canvas-soft border border-border/60 rounded-xl px-4 py-3 text-text font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-soft uppercase tracking-wider block mb-2">
                  Descrição Explicativa
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Explique ao aluno como funciona o teste e quais benefícios ele terá ao descobrir seu perfil..."
                  className="w-full bg-canvas-soft border border-border/60 rounded-xl p-4 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-soft uppercase tracking-wider block mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  URL da Imagem de Capa (Opcional)
                </label>
                <input
                  type="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-canvas-soft border border-border/60 rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {coverUrl && (
                  <div className="mt-3 h-36 rounded-xl overflow-hidden border border-border/50">
                    <img src={coverUrl} alt="Preview da Capa" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-text-soft uppercase tracking-wider block mb-2">
                  Tipo de Resultado
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={() => setResultType('single')}
                    className={`flex-1 p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      resultType === 'single'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border/60 bg-canvas-soft hover:border-primary/40'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${resultType === 'single' ? 'bg-primary text-white' : 'bg-surface-card border border-border text-text-soft'}`}>
                      🏆
                    </div>
                    <div>
                      <span className={`block font-bold text-sm ${resultType === 'single' ? 'text-primary' : 'text-text'}`}>Perfil Único</span>
                      <span className="text-xs text-text-soft mt-0.5 block">Mostra apenas o perfil com a maior pontuação no final.</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultType('percentage')}
                    className={`flex-1 p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      resultType === 'percentage'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border/60 bg-canvas-soft hover:border-primary/40'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${resultType === 'percentage' ? 'bg-primary text-white' : 'bg-surface-card border border-border text-text-soft'}`}>
                      📊
                    </div>
                    <div>
                      <span className={`block font-bold text-sm ${resultType === 'percentage' ? 'text-primary' : 'text-text'}`}>Diagnóstico %</span>
                      <span className="text-xs text-text-soft mt-0.5 block">Exibe um relatório com a porcentagem de todos os perfis.</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-text-soft uppercase tracking-wider block mb-2">
                  Status de Publicação
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStatus('draft')}
                    className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                      status === 'draft'
                        ? 'border-warning bg-warning/10 text-yellow-950 ring-2 ring-warning/20'
                        : 'border-border/60 bg-canvas-soft text-text-soft'
                    }`}
                  >
                    📝 Rascunho
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('published')}
                    className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                      status === 'published'
                        ? 'border-positive bg-positive/10 text-positive ring-2 ring-positive/20'
                        : 'border-border/60 bg-canvas-soft text-text-soft'
                    }`}
                  >
                    🚀 Publicado
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Categories Editor */}
        {currentStep === 2 && (
          <div className="animate-in fade-in duration-300">
            <CategoryEditor categories={categories} onChange={setCategories} />
          </div>
        )}

        {/* STEP 3: Questions Editor */}
        {currentStep === 3 && (
          <div className="animate-in fade-in duration-300">
            <QuestionEditor
              questions={questions}
              categories={categories}
              onChange={setQuestions}
            />
          </div>
        )}

        {/* STEP 4: Review & Publish */}
        {currentStep === 4 && (
          <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
                ✨
              </div>
              <h2 className="text-2xl font-black text-ink-deep">Revisão do Teste de Perfil</h2>
              <p className="text-sm text-text-soft">
                Verifique o resumo do teste antes de publicar para os alunos da plataforma.
              </p>
            </div>

            <div className="bg-canvas-soft/80 border border-border/60 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-start border-b border-border/40 pb-4">
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">Título</span>
                  <h3 className="text-xl font-bold text-ink-deep">{title || 'Sem Título'}</h3>
                  <p className="text-sm text-text-soft mt-1">{description || 'Sem descrição cadastrada.'}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  status === 'published' ? 'bg-positive/10 text-positive' : 'bg-warning/10 text-yellow-950'
                }`}>
                  {status === 'published' ? 'Publicado' : 'Rascunho'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-surface p-4 rounded-xl border border-border/40">
                  <span className="text-xs font-bold text-text-mute block">Categorias de Perfil</span>
                  <span className="text-2xl font-black text-primary">{categories.length}</span>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {categories.map((c) => (
                      <span key={c.id} className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${c.color}20`, color: c.color }}>
                        {c.emoji} {c.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-surface p-4 rounded-xl border border-border/40">
                  <span className="text-xs font-bold text-text-mute block">Perguntas Cadastradas</span>
                  <span className="text-2xl font-black text-primary">{questions.length}</span>
                  <p className="text-xs text-text-soft mt-1">Pontuações distribuídas entre as alternativas.</p>
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="bg-primary/10 text-primary hover:bg-primary hover:text-on-primary px-6 py-3 rounded-full font-bold text-sm transition-all flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Testar Experiência Completa do Aluno
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex justify-between items-center pt-8 border-t border-border/40 mt-8">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className="px-5 py-2.5 rounded-xl border border-border/60 text-xs font-bold text-text-soft hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave('draft')}
              className="px-5 py-2.5 rounded-xl border border-border/60 text-xs font-bold text-text-soft hover:text-text transition-all"
            >
              Salvar Rascunho
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-primary-active transition-all flex items-center gap-2 shadow-sm"
              >
                Próximo Passo
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave('published')}
                className="bg-positive text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-positive/90 transition-all flex items-center gap-2 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                Finalizar e Publicar
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Student Preview Modal */}
      {isPreviewOpen && (
        <TestPreview test={currentTestObject} onClose={() => setIsPreviewOpen(false)} />
      )}
    </div>
  );
}
