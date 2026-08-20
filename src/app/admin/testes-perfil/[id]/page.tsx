'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getProfileTestById } from '@/lib/data/profileTests';
import { ProfileTest, ProfileCategory, ProfileQuestion, ProfileTestStatus } from '@/types/profileTest';
import { StepWizard, WizardStep } from '@/components/admin/profile-tests/StepWizard';
import { CategoryEditor } from '@/components/admin/profile-tests/CategoryEditor';
import { QuestionEditor } from '@/components/admin/profile-tests/QuestionEditor';
import { TestPreview } from '@/components/admin/profile-tests/TestPreview';
import { ArrowLeft, ArrowRight, Save, Eye, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/ImageUpload';

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
    async function loadData() {
      if (testId === "novo") return;
      
      const supabase = createClient();
      try {
        const existingTest = await getProfileTestById(supabase, testId);
        if (existingTest) {
          setTitle(existingTest.title);
          setDescription(existingTest.description);
          setCoverUrl(existingTest.coverUrl || '');
          setStatus(existingTest.status);
          setResultType(existingTest.resultType || 'single');
          setCategories(existingTest.categories || []);
          setQuestions(existingTest.questions || []);
        } else {
          toast.error("Teste não encontrado.");
          router.push("/admin/testes-perfil");
        }
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar teste.");
      }
    }
    loadData();
  }, [testId, router]);

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
            className="p-2 rounded-xl border border-border/60 hover:bg-background-secondary text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-black text-foreground">Editar Teste de Perfil</h1>
            <p className="text-xs text-muted">ID: {testId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-border/60 font-semibold text-xs text-foreground hover:bg-background-secondary transition-all flex items-center gap-2"
          >
            <Eye className="w-4 h-4 text-accent" />
            Preview
          </button>

          <button
            type="button"
            onClick={() => handleSave(status)}
            className="bg-accent text-accent-foreground px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-accent-hover transition-all flex items-center gap-2 shadow-sm"
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
      <div className="bg-surface border border-border/60 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        
        {/* STEP 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Informações Básicas do Teste</h2>
              <p className="text-sm text-muted">Edite o nome e os detalhes visuais do teste de perfil.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
                  Título do Teste *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background-secondary border border-border/60 rounded-xl px-4 py-3 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
                  Descrição Explicativa
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-background-secondary border border-border/60 rounded-xl p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <ImageUpload
                label="Imagem de capa"
                value={coverUrl}
                onChange={(url) => setCoverUrl(url ?? '')}
                folder="profile-tests"
                aspect="video"
                description="Recomendado: 1280x720px (16:9)."
              />

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
                  Tipo de Resultado
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={() => setResultType('single')}
                    className={`flex-1 p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      resultType === 'single'
                        ? 'border-accent bg-accent/5 ring-2 ring-primary/20'
                        : 'border-border/60 bg-background-secondary hover:border-accent/40'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${resultType === 'single' ? 'bg-accent text-white' : 'bg-surface border border-border text-muted'}`}>
                      🏆
                    </div>
                    <div>
                      <span className={`block font-bold text-sm ${resultType === 'single' ? 'text-accent' : 'text-foreground'}`}>Perfil Único</span>
                      <span className="text-xs text-muted mt-0.5 block">Mostra apenas o perfil com a maior pontuação no final.</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultType('percentage')}
                    className={`flex-1 p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      resultType === 'percentage'
                        ? 'border-accent bg-accent/5 ring-2 ring-primary/20'
                        : 'border-border/60 bg-background-secondary hover:border-accent/40'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${resultType === 'percentage' ? 'bg-accent text-white' : 'bg-surface border border-border text-muted'}`}>
                      📊
                    </div>
                    <div>
                      <span className={`block font-bold text-sm ${resultType === 'percentage' ? 'text-accent' : 'text-foreground'}`}>Diagnóstico %</span>
                      <span className="text-xs text-muted mt-0.5 block">Exibe um relatório com a porcentagem de todos os perfis.</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
                  Status de Publicação
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStatus('draft')}
                    className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                      status === 'draft'
                        ? 'border-warning bg-warning/10 text-yellow-950 ring-2 ring-warning/20'
                        : 'border-border/60 bg-background-secondary text-muted'
                    }`}
                  >
                    📝 Rascunho
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('published')}
                    className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                      status === 'published'
                        ? 'border-positive bg-success/10 text-success ring-2 ring-positive/20'
                        : 'border-border/60 bg-background-secondary text-muted'
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
              <h2 className="text-2xl font-black text-foreground">Resumo do Teste</h2>
              <p className="text-sm text-muted">Revise os dados antes de salvar as alterações.</p>
            </div>

            <div className="bg-background-secondary/80 border border-border/60 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-start border-b border-border/40 pb-4">
                <div>
                  <span className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">Título</span>
                  <h3 className="text-xl font-bold text-foreground">{title}</h3>
                  <p className="text-sm text-muted mt-1">{description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  status === 'published' ? 'bg-success/10 text-success' : 'bg-warning/10 text-yellow-950'
                }`}>
                  {status === 'published' ? 'Publicado' : 'Rascunho'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-surface p-4 rounded-xl border border-border/40">
                  <span className="text-xs font-bold text-muted block">Categorias</span>
                  <span className="text-2xl font-black text-accent">{categories.length}</span>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-border/40">
                  <span className="text-xs font-bold text-muted block">Perguntas</span>
                  <span className="text-2xl font-black text-accent">{questions.length}</span>
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
            className="px-5 py-2.5 rounded-xl border border-border/60 text-xs font-bold text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>

          <div className="flex items-center gap-3">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-accent text-accent-foreground px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-accent-hover transition-all flex items-center gap-2 shadow-sm"
              >
                Próximo Passo
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave(status)}
                className="bg-success text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-success/90 transition-all flex items-center gap-2 shadow-md"
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
