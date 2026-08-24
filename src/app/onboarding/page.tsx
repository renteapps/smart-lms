'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowLeft, CalendarDays, Check, Clock3, LoaderCircle, Sparkles } from 'lucide-react';
import { ArrowRight02Icon } from '@/components/ui/arrow-right-02';
import { AvailabilityMode, LearningTrail, Questionnaire, StudyAvailability, Weekday } from '@/types/trilha';
import { OnboardingIntro } from '@/components/onboarding/OnboardingIntro';
import { getOnboardingData, generateTrail, trackTrailEvent } from '@/app/actions/trail';
import { clampSessionMinutes, weeklyMinutes } from '@/lib/matching';
import { cn } from '@/lib/utils';

const PhysicsKeywordSelector = dynamic(
  () => import('@/components/PhysicsKeywordSelector').then((module) => module.default),
  {
    ssr: false,
    loading: () => <div className="min-h-[460px] animate-pulse rounded-[14px] border border-border bg-canvas-soft" aria-label="Carregando opções" />,
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
  const [availability, setAvailability] = useState<StudyAvailability>({ weekdays: [1, 3, 5], minutesPerSession: 30, mode: 'uniform' });
  const [existingTrail, setExistingTrail] = useState<LearningTrail | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const questions = questionnaire?.questions || [];
  const question = questions[currentStep];
  const currentAnswers = question ? answers[question.id] || [] : [];
  const progress = questions.length ? ((currentStep + 1) / questions.length) * 100 : 0;
  /** Meio minuto por pergunta é o ritmo real de quem só marca opções. */
  const estimatedMinutes = Math.max(2, Math.ceil(questions.length / 2));

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [currentStep, reduceMotion]);

  useEffect(() => {
    async function initOnboarding() {
      try {
        const res = await getOnboardingData();
        if (res.success && res.questionnaire) {
          setQuestionnaire(res.questionnaire);
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
      label: question.text,
    }).catch(() => {});
  }, [hasStarted, currentStep, question?.text]);

  const handleToggleSelect = (optionLabel: string) => {
    if (question.type === 'availability') return;
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
      await generateTrail(answers, availability);
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
                {question.type === 'availability' ? 'Monte uma rotina realista — você poderá ajustá-la quando precisar.' : question.type === 'multiple' ? 'Você pode selecionar mais de uma opção.' : 'Escolha a opção que melhor representa você agora.'}
              </p>
            </div>

            <div className="p-5 sm:p-8 lg:p-10">
              {question.type === 'availability' ? (
                <div className="mx-auto max-w-3xl space-y-8">
                  <fieldset>
                    <legend className="flex items-center gap-2 text-base font-extrabold text-ink"><CalendarDays className="h-5 w-5 text-primary" /> Em quais dias você quer estudar?</legend>
                    <p className="mt-2 text-sm text-text-soft">Escolha os dias que realmente cabem na sua rotina. Você poderá ajustar depois.</p>
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
                            className={cn('flex min-h-16 flex-col items-center justify-center rounded-[10px] border text-sm font-extrabold outline-none focus-visible:ring-3 focus-visible:ring-primary/25', selected ? 'border-primary bg-primary text-white shadow-sm' : 'border-border bg-surface text-text-soft hover:border-primary/35')}
                          >
                            {selected && <Check className="mb-1 h-3.5 w-3.5" />}
                            {day.short}
                          </motion.button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="border-t border-border pt-7">
                    <legend className="flex items-center gap-2 text-base font-extrabold text-ink"><Clock3 className="h-5 w-5 text-primary" /> Quanto tempo por sessão?</legend>
                    <p className="mt-2 text-sm text-text-soft">Montamos cada dia com esse limite e uma folga de 20% — para não cortar uma aula ao meio nem deixar o dia pela metade.</p>

                    {question.availabilityConfig?.allowPerDayMinutes !== false && (
                      <div className="mt-5 inline-flex flex-wrap gap-1 rounded-[10px] border border-border bg-canvas-soft p-1" role="group" aria-label="Como distribuir o tempo">
                        {([['uniform', 'Mesmo tempo todos os dias'], ['per_day', 'Tempo diferente por dia']] as const).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={(availability.mode ?? 'uniform') === value}
                            onClick={() => changeMode(value)}
                            className={cn(
                              'min-h-10 rounded-[8px] px-4 text-sm font-bold outline-none focus-visible:ring-3 focus-visible:ring-primary/25',
                              (availability.mode ?? 'uniform') === value ? 'bg-surface text-primary-active shadow-sm' : 'text-text-soft hover:text-ink',
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
                          <p className="text-sm text-text-mute">Escolha os dias acima para definir o tempo de cada um.</p>
                        ) : WEEKDAYS.filter((day) => availability.weekdays.includes(day.value)).map((day) => (
                          <div key={day.value} className="flex items-center justify-between gap-4 rounded-[10px] border border-border bg-surface px-4 py-2.5">
                            <span className="text-sm font-bold text-ink">{day.label}</span>
                            <label className="flex items-center gap-2 text-sm font-semibold text-text-soft">
                              <input
                                type="number"
                                aria-label={`Minutos de estudo na ${day.label}`}
                                min={question.availabilityConfig?.minMinutes || 10}
                                max={question.availabilityConfig?.maxMinutes || 240}
                                step={5}
                                value={minutesFor(day.value)}
                                onChange={(event) => setDayMinutes(day.value, Number(event.target.value))}
                                className="w-16 rounded-[8px] border border-border bg-canvas-soft px-2 py-1 text-right font-bold text-ink outline-none focus:border-primary"
                              /> min
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {(question.availabilityConfig?.minutePresets || [15, 30, 45, 60, 90]).map((minutes) => (
                          <button key={minutes} type="button" aria-pressed={availability.minutesPerSession === minutes} onClick={() => setAvailability((current) => ({ ...current, minutesPerSession: minutes }))} className={cn('min-h-11 rounded-[9px] border px-4 text-sm font-bold outline-none focus-visible:ring-3 focus-visible:ring-primary/25', availability.minutesPerSession === minutes ? 'border-primary bg-primary-pale text-primary-active' : 'border-border bg-surface text-text-soft hover:border-primary/35')}>{minutes} min</button>
                        ))}
                        <label className="flex min-h-11 items-center gap-2 rounded-[9px] border border-border bg-surface px-3 text-sm font-semibold text-text-soft focus-within:border-primary">
                          Outro
                          <input
                            type="number"
                            aria-label="Minutos personalizados por sessão"
                            min={question.availabilityConfig?.minMinutes || 10}
                            max={question.availabilityConfig?.maxMinutes || 240}
                            value={availability.minutesPerSession}
                            onChange={(event) => setAvailability((current) => ({ ...current, minutesPerSession: clampSessionMinutes(Number(event.target.value)) }))}
                            className="w-14 bg-transparent text-right font-bold text-ink outline-none"
                          /> min
                        </label>
                      </div>
                    )}

                    <div className="mt-6 rounded-[10px] border border-primary/20 bg-primary-pale/45 p-4 text-sm text-primary-active">
                      Sua meta será de <strong>{weeklyMinutes(availability)} minutos por semana</strong>, divididos em {availability.weekdays.length} {availability.weekdays.length === 1 ? 'sessão' : 'sessões'}.
                    </div>
                  </fieldset>
                </div>
              ) : question.visualType === 'physics' ? (
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
                        <ArrowRight02Icon size={16} className={cn('transition-[opacity,transform]', selected ? 'translate-x-0 text-primary opacity-100' : '-translate-x-1 text-text-mute opacity-0 group-hover:translate-x-0 group-hover:opacity-100')} />
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border/70 bg-canvas-soft/45 px-5 py-4 sm:px-8">
              <button onClick={handlePrevious} className="inline-flex min-h-11 items-center gap-2 rounded-[8px] px-3 text-sm font-bold text-text-soft hover:bg-surface hover:text-ink"><ArrowLeft className="h-4 w-4" /> Voltar</button>
              <p className="order-first w-full text-center text-xs font-semibold text-text-mute sm:order-none sm:w-auto">
                {question.type === 'availability'
                  ? availability.weekdays.length > 0 ? `${availability.weekdays.length} ${availability.weekdays.length === 1 ? 'dia escolhido' : 'dias escolhidos'} · ${weeklyMinutes(availability)} min por semana` : 'Escolha ao menos um dia'
                  : currentAnswers.length > 0 ? `${currentAnswers.length} ${currentAnswers.length === 1 ? 'resposta selecionada' : 'respostas selecionadas'}` : 'Selecione uma resposta para continuar'}
              </p>
              <motion.button
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                onClick={handleNext}
                disabled={question.type === 'availability' ? availability.weekdays.length === 0 || availability.minutesPerSession < 10 : currentAnswers.length === 0}
                className="inline-flex min-h-12 items-center gap-2 rounded-[9px] bg-primary px-6 font-bold text-on-primary shadow-md hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-35"
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
