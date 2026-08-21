"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock3, PlayCircle } from "lucide-react";
import { Card } from "@heroui/react";
import { useCardTransition } from "@/contexts/CardTransitionContext";
import { cn } from "@/lib/utils";
import type { ContinueLesson } from "@/types/course";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?q=85&w=800&auto=format&fit=crop";

type ContinueWatchingCardProps = {
  lesson: ContinueLesson;
  className?: string;
  eager?: boolean;
};

/**
 * Thumb horizontal (16:9) de uma aula em andamento, com a barra de progresso
 * sobre a imagem — diferente do `LessonThumbCard` vertical, aqui o que importa
 * é "quanto falta", não só "o que é".
 */
export default function ContinueWatchingCard({ lesson, className, eager = false }: ContinueWatchingCardProps) {
  const { triggerTransition } = useCardTransition();
  const [failedCover, setFailedCover] = useState(false);
  const imgSrc = failedCover ? FALLBACK_COVER : lesson.cover || FALLBACK_COVER;
  const href = `/courses/${lesson.courseSlug || lesson.courseId}/lessons/${lesson.slug || lesson.id}`;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
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
        category: lesson.moduleName,
        duration: lesson.duration,
        type: "lesson",
      },
      href,
    });
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn("icon-draw group block shrink-0 w-[78vw] max-w-72 sm:w-72 md:w-80", className)}
    >
      <Card variant="transparent" className="gap-0 p-0 !border-none shadow-none !bg-transparent">
        <div className="lift relative aspect-video overflow-hidden rounded-xl border border-border bg-background-secondary shadow-elev-1">
          <Image
            src={imgSrc}
            alt={`Capa da aula ${lesson.title}`}
            fill
            unoptimized
            loading={eager ? "eager" : "lazy"}
            sizes="(max-width: 768px) 78vw, 320px"
            onError={() => setFailedCover(true)}
            className="object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] group-hover:scale-[1.03]"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/0 to-foreground/0 opacity-0 transition-opacity duration-[var(--duration-md)] group-hover:opacity-100"
          />

          <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-[var(--duration-md)] group-hover:opacity-100">
            <span className="grid size-11 place-items-center rounded-full border border-background/30 bg-foreground/70 text-background shadow-elev-2">
              <PlayCircle className="size-5 fill-current" aria-hidden="true" />
            </span>
          </span>

          {/* Barra de progresso: o motivo do card existir é retomar de onde parou. */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-background/40">
            <div className="h-full bg-accent" style={{ width: `${lesson.progress}%` }} />
          </div>
        </div>

        <div className="px-0.5 pt-2.5">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted">
            {lesson.moduleName}
          </p>
          <p className="line-clamp-2 text-sm font-bold leading-snug text-foreground">{lesson.title}</p>
          <p className="mt-1 flex items-center gap-3 text-xs font-semibold text-muted" data-numeric>
            <span className="flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {lesson.duration}
            </span>
            <span className="text-accent">{lesson.progress}% assistido</span>
          </p>
        </div>
      </Card>
    </Link>
  );
}
