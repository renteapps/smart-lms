"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3, Layers3, LockKeyhole } from "lucide-react";
import { Card, Chip, Label, ProgressBar } from "@heroui/react";
import { ArrowIcon } from "@/components/ui/AnimatedIcon";
import { Reveal } from "@/components/ui/Reveal";
import { useCardTransition } from "@/contexts/CardTransitionContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveDynamicSalesUrl } from "@/lib/salesUrlHelper";
import { getStudentCourseAction } from "@/lib/courseAccess";
import { cn } from "@/lib/utils";
import type { StudentCourseState } from "@/types/course";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=85&w=1200&auto=format&fit=crop";

type CourseCardProps = {
  id?: string;
  slug?: string;
  title: string;
  category: string;
  cover?: string;
  coverUrl?: string;
  cover_url?: string;
  progress?: number;
  studentState?: StudentCourseState;
  certificateEnabled?: boolean;
  href?: string;
  description?: string;
  duration?: string;
  lessonCount?: number;
  level?: "Essencial" | "Intermediário" | "Avançado" | string;
  className?: string;
  eager?: boolean;
  /** Realce de borda seguindo o cursor. Reservado ao card de destaque da tela. */
  featured?: boolean;
};

export default function CourseCard({
  id,
  slug,
  title,
  category,
  cover,
  coverUrl,
  cover_url,
  progress,
  studentState,
  certificateEnabled = true,
  href,
  description,
  duration,
  lessonCount,
  level,
  className,
  eager = false,
  featured = false,
}: CourseCardProps) {
  const { triggerTransition } = useCardTransition();
  const { user } = useAuth();
  const hasMeta = Boolean(duration) || lessonCount !== undefined || Boolean(level);

  const state: StudentCourseState = studentState ?? (
    progress === 100
      ? { kind: "completed", certificateEnabled, certificateIssued: false }
      : progress !== undefined && progress > 0
        ? { kind: "in-progress", progress }
        : { kind: "available" }
  );

  const resolvedSalesUrl = state.kind === "locked" && state.salesUrl
    ? resolveDynamicSalesUrl(state.salesUrl, {
        contact: {
          name: user?.user_metadata?.full_name || user?.user_metadata?.name || undefined,
          email: user?.email || undefined,
          phone: user?.user_metadata?.phone || undefined,
          id: user?.id,
        },
        course: { id, title, slug, category },
      })
    : null;
  const action = getStudentCourseAction({
    state,
    courseId: id,
    courseHref: href,
    resolvedSalesUrl,
  });
  const linkUrl = action.href;
  const isExternal = Boolean(linkUrl?.startsWith("http://") || linkUrl?.startsWith("https://"));

  const rawCover = (cover || coverUrl || cover_url || "").trim();
  const selectedCover = rawCover || FALLBACK_COVER;
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const imgSrc = failedCover === selectedCover ? FALLBACK_COVER : selectedCover;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.shiftKey ||
      !linkUrl ||
      isExternal
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
        title,
        cover: imgSrc,
        category,
        duration,
        type: "course",
      },
      href: linkUrl,
    });
  };

  // Um gesto por card: o foco do Reveal somado ao lift; a borda fica no destaque.
  const card = (
    <Reveal edge={featured} className="h-full rounded-lg">
        <Card className="lift h-full gap-0 overflow-hidden p-0">
          <div className="relative aspect-[16/9] overflow-hidden bg-background-secondary">
            <Image
              src={imgSrc}
              alt={`Capa do curso ${title}`}
              fill
              unoptimized
              loading={eager ? "eager" : "lazy"}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              onError={() => {
                if (imgSrc !== FALLBACK_COVER) {
                  setFailedCover(selectedCover);
                }
              }}
              className={cn(
                "object-cover transition-[filter,transform] duration-[var(--duration-lg)] ease-[var(--ease-zen)]",
                state.kind === "locked"
                  ? "scale-[1.02] blur-[3px]"
                  : "group-hover:scale-[1.035]",
              )}
            />
            {state.kind === "locked" && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-foreground/45">
                <span className="grid size-12 place-items-center rounded-full border border-background/30 bg-foreground/65 text-background shadow-elev-2">
                  <LockKeyhole className="size-5" aria-hidden="true" />
                  <span className="sr-only">Curso bloqueado</span>
                </span>
              </div>
            )}
            {/*
             * Véu curto e só no rodapé da capa: assenta a etiqueta sem lavar a
             * imagem inteira de cinza quando a foto é clara.
             */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-foreground/35 to-transparent"
            />
            {/*
             * Material sobre imagem: a capa continua visível através da etiqueta.
             * Espessura `thick` porque há texto em cima — contraste AA é obrigatório.
             */}
            <span className="material-thick absolute bottom-3 left-3 z-20 rounded-md px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-foreground">
              {category}
            </span>
            {state.kind === "in-progress" && (
              <Chip size="sm" variant="soft" color="accent" className="absolute right-3 top-3 z-20">
                Em progresso
              </Chip>
            )}
            {state.kind === "completed" && (
              <Chip size="sm" variant="soft" color="success" className="absolute right-3 top-3 z-20">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                Finalizado
              </Chip>
            )}
          </div>

          <Card.Header className="gap-1.5 px-5 pt-5">
            <Card.Title className="font-display text-[1.0625rem] font-extrabold leading-snug tracking-[-0.02em] text-foreground">
              {title}
            </Card.Title>
            {description && (
              <Card.Description className="line-clamp-2 text-sm leading-6">{description}</Card.Description>
            )}
          </Card.Header>

          <Card.Content className="gap-4 px-5 pt-4" data-numeric>
            {hasMeta && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-muted">
                {duration && (
                  <span className="flex items-center gap-1.5">
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    {duration}
                  </span>
                )}
                {lessonCount !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <Layers3 className="size-3.5" aria-hidden="true" />
                    {lessonCount} aulas
                  </span>
                )}
                {level && (
                  <Chip size="sm" variant="soft" color="default" className="ml-auto">
                    {level}
                  </Chip>
                )}
              </div>
            )}

            {state.kind === "in-progress" && (
              <ProgressBar value={state.progress} color="accent" size="sm">
                <Label className="text-xs font-bold text-muted">Seu progresso</Label>
                <ProgressBar.Output className="text-xs font-bold text-accent" />
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
            )}
          </Card.Content>

          {/*
           * A hairline mora no rodapé, não na régua de meta: uma linha só, e ela
           * separa a leitura do curso da ação. Duas linhas viravam formulário.
           */}
          <Card.Footer className="mt-auto justify-between border-t border-hairline px-5 py-4 text-sm font-bold text-accent">
            <span className={cn(!linkUrl && "text-muted")}>{action.label}</span>
            <span
              aria-hidden="true"
              className={cn(
                "grid size-8 place-items-center rounded-md bg-accent-soft text-accent-soft-foreground transition-[background-color,color,transform] duration-[var(--duration-md)]",
                linkUrl && "group-hover:translate-x-0.5 group-hover:bg-accent group-hover:text-accent-foreground",
                !linkUrl && "bg-background-secondary text-muted",
              )}
            >
              {state.kind === "locked" ? <LockKeyhole className="size-4" /> : <ArrowIcon size={16} />}
            </span>
          </Card.Footer>
        </Card>
    </Reveal>
  );

  const wrapperClassName = cn(
    "icon-draw group block h-full min-w-0 rounded-lg",
    !linkUrl && "cursor-not-allowed opacity-80",
    className,
  );

  if (!linkUrl) {
    return <div className={wrapperClassName} aria-disabled="true">{card}</div>;
  }

  if (isExternal) {
    return (
      <a href={linkUrl} target="_blank" rel="noopener noreferrer" className={wrapperClassName}>
        {card}
      </a>
    );
  }

  return (
    <Link href={linkUrl} onClick={handleClick} className={wrapperClassName}>
      {card}
    </Link>
  );
}
