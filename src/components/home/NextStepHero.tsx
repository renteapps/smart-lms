"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock3, Lock } from "lucide-react";
import { buttonVariants } from "@heroui/styles";
import { Chip } from "@heroui/react/chip";
import HeroBackdrop from "@/components/HeroBackdrop";
import { ArrowIcon, PlayIcon } from "@/components/ui/AnimatedIcon";
import { Reveal } from "@/components/ui/Reveal";
import { useCardTransition } from "@/contexts/CardTransitionContext";
import { contentHref, ROLE_CHIP_LABELS, type HomeSession } from "@/lib/studentHome";
import type { LearningTrailItem } from "@/types/trilha";
import { cn } from "@/lib/utils";

const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=85&w=1000&auto=format&fit=crop";

const longDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

function whenLabel(session: HomeSession) {
  if (session.offsetInDays === 0) return "Hoje";
  if (session.offsetInDays === 1) return "Amanhã";
  return longDayFormatter.format(session.date);
}

type NextStepHeroProps = {
  session: HomeSession;
  nextStep: LearningTrailItem;
  greeting: string;
};

/**
 * O topo da home.
 *
 * Uma única ação primária, e ela é o próximo passo real da trilha — não uma aula
 * fixa do catálogo. O título do conteúdo ocupa o `display-1` porque é ele que
 * precisa ser lido em três segundos; o resto da tela é contexto.
 *
 * A capa à direita é o único gesto expressivo da página (`Reveal edge`). Antes
 * havia quatro botões primários competindo aqui — herói, card de "continuar",
 * pílula do dia e trilha de hoje. Agora há um.
 */
export default function NextStepHero({ session, nextStep, greeting }: NextStepHeroProps) {
  const { triggerTransition } = useCardTransition();
  const cover = nextStep.cover || DEFAULT_COVER;
  const locked = Boolean(nextStep.prerequisites?.some((id) => (
    session.items.some((item) => item.id === id && item.status === "pending")
  )));

  const targetHref = contentHref(nextStep);

  const handleStartClick = (e: React.MouseEvent<HTMLElement>) => {
    if (
      locked ||
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.shiftKey ||
      !targetHref ||
      targetHref === "#" ||
      targetHref.startsWith("http")
    ) {
      return;
    }

    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    triggerTransition({
      sourceRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: 16,
      },
      metadata: {
        title: nextStep.title,
        cover,
        category: nextStep.moduleName || "Sua Trilha",
        duration: `${nextStep.durationMin} min`,
        type: "lesson",
      },
      href: targetHref,
    });
  };

  return (
    <>
      <HeroBackdrop src={cover} />

      <section className="editorial-container pb-[clamp(2.5rem,5vw,4rem)] pt-[clamp(3rem,7vw,6rem)]">
        <p className="eyebrow">{greeting}</p>

        <div className="mt-8 grid items-center gap-[clamp(2rem,5vw,4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Chip color="accent" variant="soft" size="sm">
                <span className="inline-flex size-1.5 rounded-full bg-current" aria-hidden="true" />
                {whenLabel(session)} · seu próximo passo
              </Chip>
              <Chip color="default" variant="tertiary" size="sm">
                {ROLE_CHIP_LABELS[nextStep.learningRole]}
              </Chip>
            </div>

            {nextStep.moduleName && (
              <p className="mt-6 text-sm font-semibold text-muted">{nextStep.moduleName}</p>
            )}

            <h1 className="display-1 mt-3 max-w-3xl text-foreground">{nextStep.title}</h1>

            {/* O "porquê" vem do motor de trilha, não de uma frase de marketing. */}
            <p className="lede mt-5">{nextStep.reason}</p>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              <span className="flex items-center gap-1.5 font-semibold">
                <Clock3 className="size-4" aria-hidden="true" />
                <span data-numeric>{nextStep.durationMin} min</span>
              </span>
              {session.pending.length > 1 && (
                <span data-numeric>
                  {session.pending.length} conteúdos · {session.remainingMinutes} min no total
                </span>
              )}
              {session.finishesAt && (
                <span>você termina por volta das {timeFormatter.format(session.finishesAt)}</span>
              )}
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              {locked ? (
                <p className="flex items-center gap-2 rounded-lg bg-warning-soft px-4 py-3 text-sm font-semibold text-warning-soft-foreground">
                  <Lock className="size-4" aria-hidden="true" />
                  Conclua o conteúdo anterior da trilha para liberar este.
                </p>
              ) : (
                <Link
                  href={targetHref}
                  onClick={handleStartClick}
                  className={cn(buttonVariants({ variant: "primary", size: "lg" }), "icon-draw")}
                >
                  <PlayIcon size={20} />
                  Começar agora
                </Link>
              )}
              <Link
                href="/minha-trilha"
                className={cn(buttonVariants({ variant: "tertiary", size: "lg" }), "icon-draw")}
              >
                Ver plano completo
                <ArrowIcon size={18} />
              </Link>
            </div>
          </div>

          {/*
           * Único gesto expressivo da página: o realce de borda acompanhando o
           * cursor, reservado ao elemento que precisa ser encontrado primeiro.
           */}
          <Reveal edge className="hidden rounded-2xl lg:block">
            <Link
              href={locked ? "/minha-trilha" : targetHref}
              onClick={locked ? undefined : handleStartClick}
              className="lift group block overflow-hidden rounded-2xl border border-hairline bg-surface shadow-elev-2"
              tabIndex={-1}
              aria-hidden="true"
            >
              <span className="relative block aspect-[4/3] overflow-hidden bg-background-secondary">
                <Image
                  src={cover}
                  alt=""
                  fill
                  priority
                  sizes="22rem"
                  className="object-cover transition-transform duration-[var(--duration-lg)] group-hover:scale-[1.03]"
                />
              </span>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
