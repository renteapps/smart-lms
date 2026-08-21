"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3, PlayCircle } from "lucide-react";
import { Card } from "@heroui/react";
import { Reveal } from "@/components/ui/Reveal";
import { useCardTransition } from "@/contexts/CardTransitionContext";
import { cn } from "@/lib/utils";
import type { GalleryLesson } from "@/types/course";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?q=85&w=800&auto=format&fit=crop";

type LessonThumbCardProps = {
  lesson: GalleryLesson;
  /** Legenda acima do título — nome do curso no carrossel da home, ausente na galeria do próprio curso. */
  eyebrow?: string;
  className?: string;
  eager?: boolean;
};

/**
 * Thumb vertical (2:3) de uma aula avulsa — a unidade visual do curso galeria e
 * do carrossel de masterclasses na home.
 *
 * Deliberadamente mais enxuto que `CourseCard`: aqui a imagem é a informação
 * principal, o texto é só o necessário para diferenciar aulas parecidas na
 * mesma fileira.
 */
export default function LessonThumbCard({ lesson, eyebrow, className, eager = false }: LessonThumbCardProps) {
  const { triggerTransition } = useCardTransition();
  const [failedCover, setFailedCover] = useState(false);
  const imgSrc = failedCover ? FALLBACK_COVER : (lesson.cover || FALLBACK_COVER);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.shiftKey ||
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

  return (
    <Link
      href={lesson.href}
      onClick={handleClick}
      className={cn("icon-draw group block w-[42vw] max-w-40 shrink-0 sm:w-44", className)}
    >
      <Reveal className="rounded-xl">
        <Card className="lift gap-0 overflow-hidden p-0">
          <div className="relative aspect-2/3 overflow-hidden bg-background-secondary">
            <Image
              src={imgSrc}
              alt={`Capa da aula ${lesson.title}`}
              fill
              unoptimized
              loading={eager ? "eager" : "lazy"}
              sizes="(max-width: 768px) 42vw, 176px"
              onError={() => setFailedCover(true)}
              className="object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] group-hover:scale-[1.045]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-foreground/85 via-foreground/25 to-transparent"
            />
            <span className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full bg-foreground/55 text-background opacity-0 backdrop-blur-xs transition-opacity duration-[var(--duration-md)] group-hover:opacity-100">
              {lesson.isCompleted ? (
                <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
              ) : (
                <PlayCircle className="size-3.5 fill-current" aria-hidden="true" />
              )}
            </span>

            <div className="absolute inset-x-0 bottom-0 z-10 p-2.5">
              {eyebrow && (
                <p className="truncate text-[10px] font-bold uppercase tracking-wider text-background/70">
                  {eyebrow}
                </p>
              )}
              <p className="mt-0.5 line-clamp-2 text-xs font-bold leading-snug text-background">
                {lesson.title}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-background/75" data-numeric>
                <Clock3 className="size-3" aria-hidden="true" />
                {lesson.durationInMinutes} min
              </p>
            </div>
          </div>
        </Card>
      </Reveal>
    </Link>
  );
}
