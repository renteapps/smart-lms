'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { MOCK_PROFILE_TESTS } from '@/lib/mocks/profileTests';
import { ProfileTest, ProfileCategory, ProfileQuestion, ProfileTestStatus } from '@/types/profileTest';
import { StepWizard, WizardStep } from '@/components/admin/profile-tests/StepWizard';
import { CategoryEditor } from '@/components/admin/profile-tests/CategoryEditor';
import { QuestionEditor } from '@/components/admin/profile-tests/QuestionEditor';
import { TestPreview } from '@/components/admin/profile-tests/TestPreview';
import { ArrowLeft, ArrowRight, Save, Eye, CheckCircle2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const STEPS: WizardStep[] = [
  { id: 1, title: '1. Informações', subtitle: 'Título e Capa' },
  { id: 2, title: '2. Categorias', subtitle: 'Perfis de Resultado' },
  { id: 3, title: '3. Perguntas', subtitle: 'Enunciados e Pontos' },
  { id: 4, title: '4. Revisão', subtitle: 'Preview e Salvar' },
];

export default function EditProfileTestPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params?.id as string;

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [status, setStatus] = useState<ProfileTestStatus>('draft');
  const [resultType, setResultType] = useState<'single' | 'percentage'>('single');
  const [categories, setCategories] = useState<ProfileCategory[]>([]);
  const [questions, setQuestions] = useState<ProfileQuestion[]>([]);

  useEffect(() => {
    const existingTest = MOCK_PROFILE_TESTS.find((t) => t.id === testId) || MOCK_PROFILE_TESTS[0];
    if (existingTest) {
      setTitle(existingTest.title);
      setDescription(existingTest.description);
      setCoverUrl(existingTest.coverUrl || '');
      setStatus(existingTest.status);
      setResultType(existingTest.resultType || 'single');
      setCategories(existingTest.categories || []);
      setQuestions(existingTest.questions || []);
    }
  }, [testId]);

  const handleNextStep = () => {
    if (currentStep === 1 && !title.trim()) {
      toast.error('Por favor, informe o título do teste.');
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

    const updatedTest: ProfileTest = {
      id: testId,
      title,
      description,
      coverUrl,
      status: saveStatus,
      resultType,
      categories,
      questions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('Updated Profile Test:', updatedTest);
    toast.success('Teste de perfil atualizado com sucesso!');
    router.push('/admin/testes-perfil');
  };

  const currentTestObject: ProfileTest = {
    id: testId || 'edit-preview',
    title: title || 'Teste de Perfil',
    description: description || 'Descrição...',
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
            <h1 className="text-2xl font-display font-black text-ink-deep">Editar Teste de Perfil</h1>
            <p className="text-xs text-text-soft">ID: {testId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-border/60 font-semibold text-xs text-text hover:bg-canvas-soft transition-all flex items-center gap-2"
          >
            <Eye className="w-4 h-4 text-primary" />
            Preview
          </button>

          <button
            type="button"
            onClick={() => handleSave(status)}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-primary-active transition-all flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            Salvar Alterações
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
              <p className="text-sm text-text-soft">Edite o nome e os detalhes visuais do teste de perfil.</p>
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
                  className="w-full bg-canvas-soft border border-border/60 rounded-xl p-4 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-soft uppercase tracking-wider block mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  URL da Imagem de Capa
                </label>
                <input
                  type="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
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

        {/* STEP 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-ink-deep">Resumo do Teste</h2>
              <p className="text-sm text-text-soft">Revise os dados antes de salvar as alterações.</p>
            </div>

            <div className="bg-canvas-soft/80 border border-border/60 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-start border-b border-border/40 pb-4">
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">Título</span>
                  <h3 className="text-xl font-bold text-ink-deep">{title}</h3>
                  <p className="text-sm text-text-soft mt-1">{description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  status === 'published' ? 'bg-positive/10 text-positive' : 'bg-warning/10 text-yellow-950'
                }`}>
                  {status === 'published' ? 'Publicado' : 'Rascunho'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-surface p-4 rounded-xl border border-border/40">
                  <span className="text-xs font-bold text-text-mute block">Categorias</span>
                  <span className="text-2xl font-black text-primary">{categories.length}</span>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-border/40">
                  <span className="text-xs font-bold text-text-mute block">Perguntas</span>
                  <span className="text-2xl font-black text-primary">{questions.length}</span>
                </div>
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
                onClick={() => handleSave(status)}
                className="bg-positive text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-positive/90 transition-all flex items-center gap-2 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                Salvar Alterações
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
