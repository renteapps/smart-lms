'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Sparkles } from 'lucide-react';
import { mockEligibleLessons, mockQuestionnaire } from '@/lib/mocks/trilhaMocks';
import { generateLearningTrail } from '@/lib/matching';
import { cn } from '@/lib/utils';

const PhysicsKeywordSelector = dynamic(
  () => import('@/components/PhysicsKeywordSelector').then((module) => module.default),
  {
    ssr: false,
    loading: () => <div className="min-h-[460px] animate-pulse rounded-[14px] border border-border bg-canvas-soft" aria-label="Carregando opções" />,
  },
);

export default function OnboardingPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const questions = mockQuestionnaire.questions;
  const question = questions[currentStep];
  const currentAnswers = answers[question.id] || [];
  const progress = ((currentStep + 1) / questions.length) * 100;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [currentStep, reduceMotion]);

  const handleToggleSelect = (optionLabel: string) => {
    const isSingle = question.type === 'single';

    setAnswers((current) => {
      const selected = current[question.id] || [];
      if (isSingle) return { ...current, [question.id]: [optionLabel] };

      return {
        ...current,
        [question.id]: selected.includes(optionLabel)
          ? selected.filter((label) => label !== optionLabel)
          : [...selected, optionLabel],
      };
    });
  };

  const isSelected = (label: string) => currentAnswers.includes(label);

  const handleFinish = () => {
    setIsGenerating(true);
    window.setTimeout(() => {
      const trail = generateLearningTrail('user-1', answers, mockQuestionnaire, mockEligibleLessons);
      localStorage.setItem('minha_trilha', JSON.stringify(trail));
      router.push('/');
    }, 2500);
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setDirection(1);
      setCurrentStep((step) => step + 1);
      return;
    }
    handleFinish();
  };

  const handlePrevious = () => {
    setDirection(-1);
    setCurrentStep((step) => Math.max(0, step - 1));
  };

  const questionVariants: Variants = reduceMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: (travelDirection: number) => ({ opacity: 0, x: travelDirection * 38, filter: 'blur(5px)' }),
        center: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
        exit: (travelDirection: number) => ({ opacity: 0, x: travelDirection * -24, filter: 'blur(4px)', transition: { duration: 0.2 } }),
      };

  if (isGenerating) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4 pt-[76px] text-text">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(49,87,183,0.12),transparent_40%)]" />
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="editorial-card relative w-full max-w-xl px-6 py-12 text-center sm:px-12"
          aria-live="polite"
        >
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-[12px] bg-primary-pale text-primary">
            <motion.span animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
              <LoaderCircle className="h-7 w-7" />
            </motion.span>
          </span>
          <p className="eyebrow mt-6">Curadoria em andamento</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">Construindo sua jornada</h1>
          <p className="mx-auto mt-4 max-w-md leading-7 text-text-soft">Estamos conectando seus objetivos aos próximos passos mais relevantes para o seu momento.</p>
          <div className="mx-auto mt-8 flex max-w-xs items-center gap-2">
            {[0, 1, 2].map((item) => (
              <motion.span
                key={item}
                className="h-1.5 flex-1 rounded-full bg-primary"
                animate={reduceMotion ? { opacity: 1 } : { opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.3, repeat: Infinity, delay: item * 0.18 }}
              />
            ))}
          </div>
        </motion.section>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg pt-[76px] text-text">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_24%,rgba(49,87,183,0.08),transparent_32%),radial-gradient(circle_at_88%_40%,rgba(201,121,87,0.07),transparent_30%)]" />

      <header className="relative z-10 border-b border-border/70 bg-bg/88 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-5 px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.12em]">
              <span className="flex items-center gap-2 text-primary-active"><Sparkles className="h-3.5 w-3.5" /> Perfil de aprendizagem</span>
              <span className="shrink-0 text-text-mute">{currentStep + 1} de {questions.length}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-canvas-soft" role="progressbar" aria-label="Progresso do onboarding" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
              <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress}%` }} transition={reduceMotion ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </div>
          <strong className="hidden font-display text-sm text-ink sm:block">{Math.round(progress)}%</strong>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.section
            key={question.id}
            custom={direction}
            variants={questionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="editorial-card overflow-hidden"
          >
            <div className="border-b border-border/70 px-5 py-7 text-center sm:px-10 sm:py-9">
              <p className="eyebrow">Pergunta {currentStep + 1}</p>
              <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-extrabold leading-[1.08] tracking-[-0.045em] text-ink sm:text-4xl md:text-[44px]">{question.text}</h1>
              <p className="mt-4 text-sm font-medium text-text-mute">
                {question.type === 'multiple' ? 'Você pode selecionar mais de uma opção.' : 'Escolha a opção que melhor representa você agora.'}
              </p>
            </div>

            <div className="p-5 sm:p-8 lg:p-10">
              {question.visualType === 'physics' ? (
                <PhysicsKeywordSelector options={question.options} selectedLabels={currentAnswers} onToggleSelect={handleToggleSelect} />
              ) : question.visualType === 'cards' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {question.options.map((option, index) => {
                    const selected = isSelected(option.label);
                    return (
                      <motion.button
                        key={option.label}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => handleToggleSelect(option.label)}
                        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                        whileHover={reduceMotion ? undefined : { y: -3 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                        className={cn(
                          'group relative flex min-h-36 flex-col items-start justify-between overflow-hidden rounded-[10px] border p-5 text-left outline-none transition-[border-color,background-color,box-shadow] focus-visible:ring-3 focus-visible:ring-primary/25',
                          selected
                            ? 'border-primary/45 bg-primary-pale/65 shadow-[0_12px_28px_rgb(49,87,183,0.10)]'
                            : 'border-border bg-surface hover:border-primary/30 hover:shadow-[var(--shadow-card)]',
                        )}
                      >
                        <span className={cn('absolute inset-y-3 left-0 w-1 rounded-r-full transition-colors', selected ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/25')} />
                        <span className="flex w-full items-start justify-between gap-4">
                          <span className="text-xs font-extrabold tracking-[0.12em] text-text-mute">{String(index + 1).padStart(2, '0')}</span>
                          <span className={cn('grid h-8 w-8 place-items-center rounded-[8px] border transition-colors', selected ? 'border-primary bg-primary text-white' : 'border-border bg-canvas-soft text-transparent')}><Check className="h-4 w-4 stroke-[3]" /></span>
                        </span>
                        <span className={cn('max-w-[22ch] font-display text-xl font-extrabold leading-tight tracking-[-0.025em] sm:text-2xl', selected ? 'text-primary-active' : 'text-ink')}>{option.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-3">
                  {question.options.map((option, index) => {
                    const selected = isSelected(option.label);
                    return (
                      <motion.button
                        key={option.label}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => handleToggleSelect(option.label)}
                        initial={reduceMotion ? false : { opacity: 0, x: 14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.26, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }}
                        whileHover={reduceMotion ? undefined : { x: 3 }}
                        className={cn(
                          'group flex min-h-16 items-center gap-4 rounded-[10px] border px-4 py-3 text-left outline-none transition-[border-color,background-color,box-shadow] focus-visible:ring-3 focus-visible:ring-primary/25 sm:px-5',
                          selected ? 'border-primary/45 bg-primary-pale/65 shadow-sm' : 'border-border bg-surface hover:border-primary/30 hover:bg-primary-pale/20',
                        )}
                      >
                        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border text-xs font-extrabold', selected ? 'border-primary bg-primary text-white' : 'border-border bg-canvas-soft text-text-mute')}>{selected ? <Check className="h-4 w-4 stroke-[3]" /> : String(index + 1).padStart(2, '0')}</span>
                        <span className={cn('flex-1 text-base font-bold sm:text-lg', selected ? 'text-primary-active' : 'text-ink')}>{option.label}</span>
                        <ArrowRight className={cn('h-4 w-4 transition-[opacity,transform]', selected ? 'translate-x-0 text-primary opacity-100' : '-translate-x-1 text-text-mute opacity-0 group-hover:translate-x-0 group-hover:opacity-100')} />
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border/70 bg-canvas-soft/45 px-5 py-4 sm:px-8">
              <button onClick={handlePrevious} disabled={currentStep === 0} className="inline-flex min-h-11 items-center gap-2 rounded-[8px] px-3 text-sm font-bold text-text-soft hover:bg-surface hover:text-ink disabled:invisible"><ArrowLeft className="h-4 w-4" /> Voltar</button>
              <p className="order-first w-full text-center text-xs font-semibold text-text-mute sm:order-none sm:w-auto">
                {currentAnswers.length > 0 ? `${currentAnswers.length} ${currentAnswers.length === 1 ? 'resposta selecionada' : 'respostas selecionadas'}` : 'Selecione uma resposta para continuar'}
              </p>
              <motion.button
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                onClick={handleNext}
                disabled={currentAnswers.length === 0}
                className="inline-flex min-h-12 items-center gap-2 rounded-[9px] bg-primary px-6 font-bold text-on-primary shadow-md hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-35"
              >
                {currentStep === questions.length - 1 ? 'Montar trilha' : 'Continuar'} <ArrowRight className="h-4 w-4" />
              </motion.button>
            </footer>
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}
