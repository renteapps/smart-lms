'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CalendarDays, Check, Clock3, LoaderCircle, Route, Sparkles, Target } from 'lucide-react';
import { ArrowRight02Icon } from '@/components/ui/arrow-right-02';

/** O que o aluno ganha por responder — o argumento que sustenta a tela de abertura. */
const ONBOARDING_HIGHLIGHTS = [
  {
    icon: Target,
    title: 'Conteúdo para o seu problema',
    description: 'Suas respostas mostram onde você trava hoje. A trilha começa por aí, e não pelo capítulo um de tudo.',
  },
  {
    icon: CalendarDays,
    title: 'Uma rotina que cabe no seu dia',
    description: 'Você define os dias e os minutos que tem. O plano é montado dentro desse limite, sem sessões impossíveis.',
  },
  {
    icon: Route,
    title: 'Ordem certa, sem retrabalho',
    description: 'Pulamos o que você já domina e encaixamos o que falta antes de cada próximo passo.',
  },
];

type OnboardingIntroProps = {
  /** Quantas perguntas o questionário publicado tem. */
  questionCount: number;
  /** Estimativa de duração em minutos, exibida antes de começar. */
  estimatedMinutes: number;
  /** O questionário ainda está carregando: o botão espera em vez de mentir números. */
  isPreparing: boolean;
  /** A pessoa já tem trilha ativa — a abertura fala em refazer, não em começar. */
  hasExistingTrail: boolean;
  onStart: () => void;
};

/**
 * Abertura do onboarding: explica por que o diagnóstico importa e só entrega o
 * questionário quando o aluno toca em começar.
 */
export function OnboardingIntro({ questionCount, estimatedMinutes, isPreparing, hasExistingTrail, onStart }: OnboardingIntroProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg pt-[76px] text-text">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_24%,rgba(49,87,183,0.08),transparent_32%),radial-gradient(circle_at_88%_40%,rgba(201,121,87,0.07),transparent_30%)]" />

      <main className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-14">
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="editorial-card overflow-hidden"
        >
          <div className="border-b border-border/70 px-5 py-9 text-center sm:px-10 sm:py-12">
            <p className="eyebrow inline-flex items-center gap-2 text-primary-active">
              <Sparkles className="h-3.5 w-3.5" /> {hasExistingTrail ? 'Atualizar seu perfil' : 'Antes de começar'}
            </p>
            <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold leading-[1.08] tracking-[-0.045em] text-ink sm:text-4xl md:text-[44px]">
              {hasExistingTrail ? 'Vamos remontar a sua trilha' : 'Poucos minutos aqui definem meses de estudo'}
            </h1>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-text-soft">
              {hasExistingTrail
                ? 'Você já tem uma trilha ativa. Responder de novo atualiza seu perfil e remonta o plano com o seu momento atual — suas respostas anteriores já vêm marcadas.'
                : 'As próximas perguntas decidem o que você vai estudar, em que ordem e em quanto tempo. É o que separa uma trilha feita para você de uma lista genérica de conteúdos.'}
            </p>
          </div>

          <div className="p-5 sm:p-8 lg:p-10">
            <ul className="grid gap-4 sm:grid-cols-3">
              {ONBOARDING_HIGHLIGHTS.map((highlight, index) => (
                <motion.li
                  key={highlight.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.08 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-[10px] border border-border bg-surface p-5"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-[8px] bg-primary-pale text-primary">
                    <highlight.icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 font-display text-lg font-extrabold leading-tight tracking-[-0.02em] text-ink">{highlight.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-text-soft">{highlight.description}</p>
                </motion.li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-[10px] border border-primary/20 bg-primary-pale/45 px-5 py-4 text-sm font-semibold text-primary-active">
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 stroke-[3]" /> {isPreparing ? 'Poucas perguntas' : `${questionCount} ${questionCount === 1 ? 'pergunta' : 'perguntas'}`}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" /> {isPreparing ? 'Alguns minutos' : `Cerca de ${estimatedMinutes} minutos`}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Dá para ajustar depois
              </span>
            </div>
          </div>

          <footer className="flex flex-col items-center gap-3 border-t border-border/70 bg-canvas-soft/45 px-5 py-7 text-center sm:px-8">
            <motion.button
              type="button"
              whileHover={reduceMotion || isPreparing ? undefined : { y: -1 }}
              whileTap={reduceMotion || isPreparing ? undefined : { scale: 0.985 }}
              onClick={onStart}
              disabled={isPreparing}
              className="inline-flex min-h-12 items-center gap-2 rounded-[9px] bg-primary px-8 font-bold text-on-primary shadow-md hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPreparing ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" /> Preparando as perguntas
                </>
              ) : (
                <>
                  {hasExistingTrail ? 'Refazer diagnóstico' : 'Começar'} <ArrowRight02Icon size={16} />
                </>
              )}
            </motion.button>
            <p className="text-xs font-semibold text-text-mute">Nada é enviado antes de você responder — e você pode voltar em qualquer pergunta.</p>
          </footer>
        </motion.section>
      </main>
    </div>
  );
}
