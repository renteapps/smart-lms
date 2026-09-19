'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowLeft, CalendarDays, Check, Clock3, Sparkles } from 'lucide-react';
import { Spinner } from '@heroui/react';
import { ArrowRight02Icon } from '@/components/ui/arrow-right-02';
import { AvailabilityMode, LearningTrail, Questionnaire, StudyAvailability, Weekday } from '@/types/trilha';
import { OnboardingIntro } from '@/components/onboarding/OnboardingIntro';
import { getOnboardingData, generateTrail, trackTrailEvent } from '@/app/actions/trail';
import { clampSessionMinutes, weeklyMinutes } from '@/lib/matching';
import { openAnswerMaxLength, personalizeOnboardingTemplate } from '@/lib/onboarding';
import { USER_VARIABLES_UPDATED_EVENT, type UserVariableMap } from '@/lib/userVariables';
import { cn } from '@/lib/utils';

const PhysicsKeywordSelector = dynamic(
  () => import('@/components/PhysicsKeywordSelector').then((module) => module.default),
  {
    ssr: false,
    loading: () => <div className="min-h-[460px] animate-pulse rounded-2xl border border-border bg-surface-secondary" aria-label="Carregando opções" />,
  },
);

const WEEKDAYS: Array<{ value: Weekday; short: string; label: string }> = [
  { value: 1, short: 'Seg', label: 'Segunda' }, { value: 2, short: 'Ter', label: 'Terça' },
  { value: 3, short: 'Qua', label: 'Quarta' }, { value: 4, short: 'Qui', label: 'Quinta' },
  { value: 5, short: 'Sex', label: 'Sexta' }, { value: 6, short: 'Sáb', label: 'Sábado' },
  { value: 0, short: 'Dom', label: 'Domingo' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [hasStarted, setHasStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [variables, setVariables] = useState<UserVariableMap>({});
  const [availability, setAvailability] = useState<StudyAvailability>({ weekdays: [1, 3, 5], minutesPerSession: 30, mode: 'uniform' });
  const [existingTrail, setExistingTrail] = useState<LearningTrail | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const questions = questionnaire?.questions || [];
  const question = questions[currentStep];
  const currentAnswers = question ? answers[question.id] || [] : [];
  const currentOpenAnswer = currentAnswers[0] || '';
  const questionText = question && questionnaire
    ? personalizeOnboardingTemplate(question.text, variables, questionnaire, answers)
    : '';
  const progress = questions.length ? ((currentStep + 1) / questions.length) * 100 : 0;
  /** Perguntas abertas pedem um pouco mais de tempo do que uma escolha em card. */
  const estimatedMinutes = Math.max(2, Math.ceil((questions.length + questions.filter((item) => item.type === 'open').length) / 2));

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [currentStep, reduceMotion]);

  useEffect(() => {
    async function initOnboarding() {
      try {
        const res = await getOnboardingData();
        if (res.success && res.questionnaire) {
          setQuestionnaire(res.questionnaire);
          setVariables(res.variables || {});
        }
        if (res.success && res.existing) {
          setExistingTrail(res.existing);
          setAnswers(res.existing.answers || {});
          setAvailability(res.existing.availability);
        }
        await trackTrailEvent('onboarding_started');
      } catch (err) {
        console.error(err);
      }
    }
    initOnboarding();
  }, []);

  useEffect(() => {
    // Só conta como etapa vista depois que ela sai da abertura e entra no questionário.
    if (!hasStarted || !question?.text) return;
    trackTrailEvent('onboarding_step_viewed', {
      step: currentStep + 1,
      label: questionText,
    }).catch(() => {});
  }, [hasStarted, currentStep, question?.text, questionText]);

  const handleToggleSelect = (optionLabel: string) => {
    if (question.type === 'availability' || question.type === 'open') return;
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

  const handleOpenAnswer = (value: string) => {
    if (!question || question.type !== 'open') return;
    const maxLength = openAnswerMaxLength(question);
    setAnswers((current) => ({ ...current, [question.id]: [value.slice(0, maxLength)] }));
  };

  const toggleWeekday = (weekday: Weekday) => {
    setAvailability((current) => ({
      ...current,
      weekdays: current.weekdays.includes(weekday)
        ? current.weekdays.filter((item) => item !== weekday)
        : [...current.weekdays, weekday],
    }));
  };

  /** Minutos de um dia: o valor próprio dele no modo por dia, a meta única no uniforme. */
  const minutesFor = (weekday: Weekday) =>
    availability.mode === 'per_day'
      ? availability.minutesByWeekday?.[weekday] ?? availability.minutesPerSession
      : availability.minutesPerSession;

  const changeMode = (mode: AvailabilityMode) => {
    setAvailability((current) => ({
      ...current,
      mode,
      // Entrar no modo por dia parte do que ela já escolheu: nada de zerar.
      minutesByWeekday: mode === 'per_day'
        ? Object.fromEntries(current.weekdays.map((day) => [
          day,
          current.minutesByWeekday?.[day] ?? current.minutesPerSession,
        ]))
        : current.minutesByWeekday,
    }));
  };

  const setDayMinutes = (weekday: Weekday, minutes: number) => {
    setAvailability((current) => ({
      ...current,
      minutesByWeekday: { ...current.minutesByWeekday, [weekday]: clampSessionMinutes(minutes) },
    }));
  };

  const isSelected = (label: string) => currentAnswers.includes(label);

  const handleFinish = async () => {
    setIsGenerating(true);
    const waitPromise = new Promise(resolve => setTimeout(resolve, 2500));
    try {
      const result = await generateTrail(answers, availability);
      if (!result.success) throw new Error(result.message || 'Não foi possível criar sua trilha.');
      window.dispatchEvent(new Event(USER_VARIABLES_UPDATED_EVENT));
      await waitPromise;
      router.push('/minha-trilha');
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setDirection(1);
      setCurrentStep((step) => step + 1);
      return;
    }
    handleFinish();
  };

  const handleStart = () => {
    setDirection(1);
    setHasStarted(true);
  };

  const handlePrevious = () => {
    setDirection(-1);
    if (currentStep === 0) {
      setHasStarted(false);
      return;
    }
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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 pt-[76px] text-foreground">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(49,87,183,0.12),transparent_40%)]" />
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="editorial-card relative w-full max-w-xl px-6 py-12 text-center sm:px-12"
          aria-live="polite"
        >
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Spinner size="lg" color="accent" />
          </span>
          <p className="eyebrow mt-6">Curadoria em andamento</p>
          <h1 className="display-1 mt-3 text-foreground sm:text-4xl">Construindo sua jornada</h1>
          <p className="lede mx-auto mt-4 max-w-md text-muted">Estamos conectando seus objetivos aos próximos passos mais relevantes para o seu momento.</p>
          <div className="mx-auto mt-8 flex max-w-xs items-center gap-2">
            {[0, 1, 2].map((item) => (
              <motion.span
                key={item}
                className="h-1.5 flex-1 rounded-full bg-accent"
                animate={reduceMotion ? { opacity: 1 } : { opacity: [0.25, 1, 0.25] }}
                transition={{ duration: 1.3, repeat: Infinity, delay: item * 0.18 }}
              />
            ))}
          </div>
        </motion.section>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <OnboardingIntro
        questionCount={questions.length}
        estimatedMinutes={estimatedMinutes}
        isPreparing={!questionnaire || questions.length === 0}
        hasExistingTrail={Boolean(existingTrail)}
        onStart={handleStart}
      />
    );
  }

  if (!questionnaire || !question) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pt-[76px] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_24%,rgba(49,87,183,0.08),transparent_32%),radial-gradient(circle_at_88%_40%,rgba(201,121,87,0.07),transparent_30%)]" />

      <header className="relative z-10 border-b border-border/70 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-5 px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.12em]">
              <span className="flex items-center gap-2 text-accent"><Sparkles className="size-3.5" /> Perfil de aprendizagem</span>
              <span className="shrink-0 text-muted">{currentStep + 1} de {questions.length}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary" role="progressbar" aria-label="Progresso do onboarding" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
              <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${progress}%` }} transition={reduceMotion ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </div>
          <strong className="hidden font-display text-sm text-foreground sm:block">{Math.round(progress)}%</strong>
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
              <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-extrabold leading-[1.08] tracking-[-0.045em] text-foreground sm:text-4xl md:text-[44px]">{questionText}</h1>
              <p className="mt-4 text-sm font-medium text-muted">
                {question.type === 'availability'
                  ? 'Monte uma rotina realista — você poderá ajustá-la quando precisar.'
                  : question.type === 'open'
                    ? 'Sua resposta fica privada e nos ajuda a tornar suas próximas interações mais relevantes.'
                    : question.type === 'multiple'
                      ? 'Você pode selecionar mais de uma opção.'
                      : 'Escolha a opção que melhor representa você agora.'}
              </p>
            </div>

            <div className="p-5 sm:p-8 lg:p-10">
              {question.type === 'availability' ? (
                <div className="mx-auto max-w-3xl space-y-8">
                  <fieldset>
                    <legend className="flex items-center gap-2 text-base font-extrabold text-foreground"><CalendarDays className="size-5 text-accent" /> Em quais dias você quer estudar?</legend>
                    <p className="mt-2 text-sm text-muted">Escolha os dias que realmente cabem na sua rotina. Você poderá ajustar depois.</p>
                    <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {WEEKDAYS.map((day) => {
                        const selected = availability.weekdays.includes(day.value);
                        return (
                          <motion.button
                            key={day.value}
                            type="button"
                            aria-pressed={selected}
                            aria-label={day.label}
                            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                            onClick={() => toggleWeekday(day.value)}
                            className={cn('flex min-h-16 flex-col items-center justify-center rounded-xl border text-sm font-extrabold outline-none focus-visible:ring-3 focus-visible:ring-accent/25', selected ? 'border-accent bg-accent text-accent-foreground shadow-sm' : 'border-border bg-surface text-muted hover:border-accent/35')}
                          >
                            {selected && <Check className="mb-1 size-3.5" />}
                            {day.short}
                          </motion.button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="border-t border-border pt-7">
                    <legend className="flex items-center gap-2 text-base font-extrabold text-foreground"><Clock3 className="size-5 text-accent" /> Quanto tempo por sessão?</legend>
                    <p className="mt-2 text-sm text-muted">Montamos cada dia com esse limite e uma folga de 20% — para não cortar uma aula ao meio nem deixar o dia pela metade.</p>

                    {question.availabilityConfig?.allowPerDayMinutes !== false && (
                      <div className="mt-5 inline-flex flex-wrap gap-1 rounded-xl border border-border bg-surface-secondary p-1" role="group" aria-label="Como distribuir o tempo">
                        {([['uniform', 'Mesmo tempo todos os dias'], ['per_day', 'Tempo diferente por dia']] as const).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={(availability.mode ?? 'uniform') === value}
                            onClick={() => changeMode(value)}
                            className={cn(
                              'min-h-10 rounded-lg px-4 text-sm font-bold outline-none focus-visible:ring-3 focus-visible:ring-accent/25',
                              (availability.mode ?? 'uniform') === value ? 'bg-surface text-accent shadow-sm' : 'text-muted hover:text-foreground',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}

                    {availability.mode === 'per_day' ? (
                      <div className="mt-5 space-y-2">
                        {availability.weekdays.length === 0 ? (
                          <p className="text-sm text-muted">Escolha os dias acima para definir o tempo de cada um.</p>
                        ) : WEEKDAYS.filter((day) => availability.weekdays.includes(day.value)).map((day) => (
                          <div key={day.value} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-2.5">
                            <span className="text-sm font-bold text-foreground">{day.label}</span>
                            <label className="flex items-center gap-2 text-sm font-semibold text-muted">
                              <input
                                type="number"
                                aria-label={`Minutos de estudo na ${day.label}`}
                                min={question.availabilityConfig?.minMinutes || 10}
                                max={question.availabilityConfig?.maxMinutes || 240}
                                step={5}
                                value={minutesFor(day.value)}
                                onChange={(event) => setDayMinutes(day.value, Number(event.target.value))}
                                className="w-16 rounded-lg border border-border bg-surface-secondary px-2 py-1 text-right font-bold text-foreground outline-none focus:border-accent"
                              /> min
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {(question.availabilityConfig?.minutePresets || [15, 30, 45, 60, 90]).map((minutes) => (
                          <button key={minutes} type="button" aria-pressed={availability.minutesPerSession === minutes} onClick={() => setAvailability((current) => ({ ...current, minutesPerSession: minutes }))} className={cn('min-h-11 rounded-lg border px-4 text-sm font-bold outline-none focus-visible:ring-3 focus-visible:ring-accent/25', availability.minutesPerSession === minutes ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-muted hover:border-accent/35')}>{minutes} min</button>
                        ))}
                        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-muted focus-within:border-accent">
                          Outro
                          <input
                            type="number"
                            aria-label="Minutos personalizados por sessão"
                            min={question.availabilityConfig?.minMinutes || 10}
                            max={question.availabilityConfig?.maxMinutes || 240}
                            value={availability.minutesPerSession}
                            onChange={(event) => setAvailability((current) => ({ ...current, minutesPerSession: clampSessionMinutes(Number(event.target.value)) }))}
                            className="w-14 bg-transparent text-right font-bold text-foreground outline-none"
                          /> min
                        </label>
                      </div>
                    )}

                    <div className="mt-6 rounded-xl border border-accent/20 bg-accent-soft/45 p-4 text-sm text-accent">
                      Sua meta será de <strong>{weeklyMinutes(availability)} minutos por semana</strong>, divididos em {availability.weekdays.length} {availability.weekdays.length === 1 ? 'sessão' : 'sessões'}.
                    </div>
                  </fieldset>
                </div>
              ) : question.type === 'open' ? (
                <div className="mx-auto max-w-3xl">
                  <label className="sr-only" htmlFor={`onboarding-answer-${question.id}`}>Sua resposta</label>
                  <textarea
                    id={`onboarding-answer-${question.id}`}
                    value={currentOpenAnswer}
                    onChange={(event) => handleOpenAnswer(event.target.value)}
                    maxLength={openAnswerMaxLength(question)}
                    rows={7}
                    autoFocus
                    placeholder={questionnaire
                      ? personalizeOnboardingTemplate(question.placeholder || 'Escreva com suas próprias palavras…', variables, questionnaire, answers)
                      : question.placeholder || 'Escreva com suas próprias palavras…'}
                    className="min-h-48 w-full resize-y rounded-xl border border-border bg-surface px-5 py-4 text-base leading-7 text-foreground outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/15 placeholder:text-muted"
                  />
                  <div className="mt-3 flex items-center justify-between gap-4 text-xs font-semibold text-muted">
                    <span>Quanto mais contexto você compartilhar, mais pessoais poderão ser as orientações.</span>
                    <span className="shrink-0">{currentOpenAnswer.length}/{openAnswerMaxLength(question)}</span>
                  </div>
                </div>
              ) : question.visualType === 'physics' ? (
                <PhysicsKeywordSelector
                  options={question.options.map((option) => ({
                    ...option,
                    label: questionnaire ? personalizeOnboardingTemplate(option.label, variables, questionnaire, answers) : option.label,
                    description: option.description && questionnaire
                      ? personalizeOnboardingTemplate(option.description, variables, questionnaire, answers)
                      : option.description,
                  }))}
                  selectedLabels={currentAnswers.map((label) => {
                    const option = question.options.find((item) => item.label === label);
                    return option && questionnaire ? personalizeOnboardingTemplate(option.label, variables, questionnaire, answers) : label;
                  })}
                  onToggleSelect={(displayLabel) => {
                    const original = question.options.find((option) => (
                      questionnaire ? personalizeOnboardingTemplate(option.label, variables, questionnaire, answers) : option.label
                    ) === displayLabel);
                    if (original) handleToggleSelect(original.label);
                  }}
                />
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
                          'group relative flex min-h-36 flex-col items-start justify-between overflow-hidden rounded-xl border p-5 text-left outline-none transition-[border-color,background-color,box-shadow] focus-visible:ring-3 focus-visible:ring-accent/25',
                          selected
                            ? 'border-accent/45 bg-accent-soft/65 shadow-elev-2'
                            : 'border-border bg-surface hover:border-accent/30 hover:shadow-elev-1',
                        )}
                      >
                        <span className={cn('absolute inset-y-3 left-0 w-1 rounded-r-full transition-colors', selected ? 'bg-accent' : 'bg-transparent group-hover:bg-accent/25')} />
                        <span className="flex w-full items-start justify-between gap-4">
                          <span className="grid size-12 place-items-center rounded-xl bg-surface-secondary text-2xl shadow-sm">{option.emoji || String(index + 1).padStart(2, '0')}</span>
                          <span className={cn('grid size-8 place-items-center rounded-lg border transition-colors', selected ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-surface-secondary text-transparent')}><Check className="size-4 stroke-[3]" /></span>
                        </span>
                        <span className="space-y-2">
                          <span className={cn('block max-w-[22ch] font-display text-xl font-extrabold leading-tight tracking-[-0.025em] sm:text-2xl', selected ? 'text-accent' : 'text-foreground')}>{questionnaire ? personalizeOnboardingTemplate(option.label, variables, questionnaire, answers) : option.label}</span>
                          {option.description && <span className="block max-w-sm text-sm leading-6 text-muted">{questionnaire ? personalizeOnboardingTemplate(option.description, variables, questionnaire, answers) : option.description}</span>}
                        </span>
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
                          'group flex min-h-16 items-center gap-4 rounded-xl border px-4 py-3 text-left outline-none transition-[border-color,background-color,box-shadow] focus-visible:ring-3 focus-visible:ring-accent/25 sm:px-5',
                          selected ? 'border-accent/45 bg-accent-soft/65 shadow-sm' : 'border-border bg-surface hover:border-accent/30 hover:bg-accent-soft/20',
                        )}
                      >
                        <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg border text-xs font-extrabold', selected ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-surface-secondary text-muted')}>{selected ? <Check className="size-4 stroke-[3]" /> : String(index + 1).padStart(2, '0')}</span>
                        <span className={cn('flex-1 text-base font-bold sm:text-lg', selected ? 'text-accent' : 'text-foreground')}>{questionnaire ? personalizeOnboardingTemplate(option.label, variables, questionnaire, answers) : option.label}</span>
                        <ArrowRight02Icon size={16} className={cn('transition-[opacity,transform]', selected ? 'translate-x-0 text-accent opacity-100' : '-translate-x-1 text-muted opacity-0 group-hover:translate-x-0 group-hover:opacity-100')} />
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border/70 bg-surface-secondary/45 px-5 py-4 sm:px-8">
              <button onClick={handlePrevious} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-muted hover:bg-surface hover:text-foreground"><ArrowLeft className="size-4" /> Voltar</button>
              <p className="order-first w-full text-center text-xs font-semibold text-muted sm:order-none sm:w-auto">
                {question.type === 'availability'
                  ? availability.weekdays.length > 0 ? `${availability.weekdays.length} ${availability.weekdays.length === 1 ? 'dia escolhido' : 'dias escolhidos'} · ${weeklyMinutes(availability)} min por semana` : 'Escolha ao menos um dia'
                  : question.type === 'open'
                    ? currentOpenAnswer.trim().length > 0 ? `${currentOpenAnswer.trim().length} caracteres escritos` : 'Escreva uma resposta para continuar'
                  : currentAnswers.length > 0 ? `${currentAnswers.length} ${currentAnswers.length === 1 ? 'resposta selecionada' : 'respostas selecionadas'}` : 'Selecione uma resposta para continuar'}
              </p>
              <motion.button
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                onClick={handleNext}
                disabled={question.type === 'availability' ? availability.weekdays.length === 0 || availability.minutesPerSession < 10 : question.type === 'open' ? currentOpenAnswer.trim().length === 0 : currentAnswers.length === 0}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-6 font-bold text-accent-foreground shadow-md transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-35"
              >
                {currentStep === questions.length - 1 ? 'Montar trilha' : 'Continuar'} <ArrowRight02Icon size={16} />
              </motion.button>
            </footer>
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}
