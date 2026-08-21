"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3, LockKeyhole, PlayCircle } from "lucide-react";
import { Card } from "@heroui/react";
import { Reveal } from "@/components/ui/Reveal";
import { useCardTransition } from "@/contexts/CardTransitionContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveDynamicSalesUrl } from "@/lib/salesUrlHelper";
import { cn } from "@/lib/utils";
import type { GalleryLesson } from "@/types/course";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?q=85&w=800&auto=format&fit=crop";

/** `default`: grade da galeria do curso. `lg`: carrossel de streaming da home. */
type LessonThumbCardSize = "default" | "lg";

/*
 * `max-w-*` sem prefixo vale para todo tamanho de tela — sem o `sm:max-w-none`
 * abaixo, ele continuaria capando a largura mesmo depois que `sm:w-*` tenta
 * aumentá-la (max-width sempre vence sobre width em CSS).
 */
const SIZE_CLASS: Record<LessonThumbCardSize, string> = {
  default: "w-[42vw] max-w-40 sm:w-44 sm:max-w-none",
  lg: "w-[52vw] max-w-56 sm:w-56 sm:max-w-none md:w-60 lg:w-64",
};

const SIZE_IMAGE_SIZES: Record<LessonThumbCardSize, string> = {
  default: "(max-width: 768px) 42vw, 176px",
  lg: "(max-width: 768px) 52vw, 256px",
};

type LessonThumbCardProps = {
  lesson: GalleryLesson;
  /** Legenda acima do título na legenda abaixo da thumb — nome do curso, ausente na galeria do próprio curso. */
  eyebrow?: string;
  className?: string;
  eager?: boolean;
  size?: LessonThumbCardSize;
  /** Necessários só quando `lesson.locked`: resolvem o link de matrícula do curso dono da aula. */
  courseId?: string;
  courseSlug?: string;
  courseTitle?: string;
  /** Template de checkout do curso — variáveis dinâmicas resolvidas aqui com os dados do aluno. */
  salesUrl?: string | null;
};

/**
 * Thumb vertical (2:3) de uma aula avulsa — a unidade visual do curso galeria e
 * do carrossel de masterclasses na home.
 *
 * Título e duração ficam abaixo da imagem, não por cima dela: a capa de uma
 * masterclass costuma já trazer o título desenhado na própria arte, e um
 * segundo título em texto sobreposto brigava com ele. Como legenda separada,
 * o texto continua sempre visível (funciona igual em toque e mouse) sem
 * disputar espaço com a imagem.
 *
 * Aula travada não avisa isso de cara — a imagem fica normal, e só ao passar
 * o mouse (estilo streaming) é que o cadeado aparece por cima; o `sr-only`
 * garante que quem usa leitor de tela saiba do bloqueio mesmo sem hover.
 */
export default function LessonThumbCard({
  lesson,
  eyebrow,
  className,
  eager = false,
  size = "default",
  courseId,
  courseSlug,
  courseTitle,
  salesUrl,
}: LessonThumbCardProps) {
  const { triggerTransition } = useCardTransition();
  const { user } = useAuth();
  const [failedCover, setFailedCover] = useState(false);
  const imgSrc = failedCover ? FALLBACK_COVER : (lesson.cover || FALLBACK_COVER);
  const isLarge = size === "lg";

  const resolvedSalesUrl = lesson.locked && salesUrl
    ? resolveDynamicSalesUrl(salesUrl, {
        contact: {
          name: user?.user_metadata?.full_name || user?.user_metadata?.name || undefined,
          email: user?.email || undefined,
          phone: user?.user_metadata?.phone || undefined,
          id: user?.id,
        },
        course: { id: courseId, title: courseTitle, slug: courseSlug },
      })
    : null;

  const linkUrl = lesson.locked ? resolvedSalesUrl : lesson.href;
  const isExternal = Boolean(linkUrl?.startsWith("http://") || linkUrl?.startsWith("https://"));

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.shiftKey ||
      lesson.locked ||
      lesson.href.startsWith("http")
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
        borderRadius: 14,
      },
      metadata: {
        title: lesson.title,
        cover: imgSrc,
        category: eyebrow,
        duration: `${lesson.durationInMinutes} min`,
        type: "lesson",
      },
      href: lesson.href,
    });
  };

  const content = (
    <Reveal className="rounded-xl">
      <Card className="lift gap-0 overflow-hidden p-0">
        <div className="relative aspect-2/3 overflow-hidden bg-background-secondary">
          <Image
            src={imgSrc}
            alt={`Capa da aula ${lesson.title}`}
            fill
            unoptimized
            loading={eager ? "eager" : "lazy"}
            sizes={SIZE_IMAGE_SIZES[size]}
            onError={() => setFailedCover(true)}
            className="object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] group-hover:scale-[1.045]"
          />

          {lesson.locked ? (
            <>
              <span className="sr-only">Aula bloqueada</span>
              <div
                aria-hidden="true"
                className="absolute inset-0 z-10 grid place-items-center bg-foreground/0 opacity-0 backdrop-blur-none transition-all duration-[var(--duration-md)] group-hover:bg-foreground/55 group-hover:opacity-100 group-hover:backdrop-blur-[1px]"
              >
                <span
                  className={cn(
                    "grid place-items-center rounded-full border border-background/30 bg-foreground/70 text-background shadow-elev-2",
                    isLarge ? "size-11" : "size-9",
                  )}
                >
                  <LockKeyhole className={isLarge ? "size-5" : "size-4"} aria-hidden="true" />
                </span>
              </div>
            </>
          ) : (
            <span
              className={cn(
                "absolute right-2 top-2 z-10 grid place-items-center rounded-full bg-foreground/55 text-background opacity-0 backdrop-blur-xs transition-opacity duration-[var(--duration-md)] group-hover:opacity-100",
                isLarge ? "size-8" : "size-7",
              )}
            >
              {lesson.isCompleted ? (
                <CheckCircle2 className={isLarge ? "size-4" : "size-3.5"} aria-hidden="true" />
              ) : (
                <PlayCircle className={cn(isLarge ? "size-4" : "size-3.5", "fill-current")} aria-hidden="true" />
              )}
            </span>
          )}
        </div>

        <div className={cn("px-0.5", isLarge ? "pt-2.5" : "pt-2")}>
          {eyebrow && (
            <p
              className={cn(
                "truncate font-bold uppercase tracking-wider text-muted",
                isLarge ? "text-[11px]" : "text-[10px]",
              )}
            >
              {eyebrow}
            </p>
          )}
          <p
            className={cn(
              "line-clamp-2 font-bold leading-snug text-foreground",
              isLarge ? "text-sm" : "text-xs",
            )}
          >
            {lesson.title}
          </p>
          <p
            className={cn(
              "mt-1 flex items-center gap-1 font-semibold text-muted",
              isLarge ? "text-xs" : "text-[10px]",
            )}
            data-numeric
          >
            <Clock3 className={isLarge ? "size-3.5" : "size-3"} aria-hidden="true" />
            {lesson.durationInMinutes} min
          </p>
        </div>
      </Card>
    </Reveal>
  );

  const wrapperClassName = cn(
    "icon-draw group block shrink-0",
    SIZE_CLASS[size],
    !linkUrl && "cursor-not-allowed opacity-80",
    className,
  );

  if (!linkUrl) {
    return <div className={wrapperClassName} aria-disabled="true">{content}</div>;
  }

  if (isExternal) {
    return (
      <a href={linkUrl} target="_blank" rel="noopener noreferrer" className={wrapperClassName}>
        {content}
      </a>
    );
  }

  return (
    <Link href={linkUrl} onClick={handleClick} className={wrapperClassName}>
      {content}
    </Link>
  );
}
