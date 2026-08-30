import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GalleryLesson } from "@/types/course";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1552664730-d307ca884978?q=85&w=800&auto=format&fit=crop";

type BuilderGalleryItemProps = {
  lesson: GalleryLesson;
  href: string;
  /** Bloqueio é decidido no nível da fileira (curso inteiro), não por aula — mesmo comportamento de hoje. */
  locked: boolean;
  className?: string;
};

/**
 * Item do carrossel "Cursos galeria" — anatomia de `LessonThumbCard` (capa
 * 2:3, overlays de bloqueado/concluído/progresso) sem `useAuth`/
 * `useCardTransition`, que não existem no contexto onde este card roda
 * (home pública anônima, preview do admin).
 */
export function BuilderGalleryItem({ lesson, href, locked, className }: BuilderGalleryItemProps) {
  const imgSrc = lesson.cover?.trim() || FALLBACK_COVER;

  return (
    <Link href={href} className={cn("icon-draw group block w-[min(76vw,260px)] shrink-0", className)}>
      <div className="lift relative aspect-2/3 overflow-hidden rounded-xl border border-border bg-background-secondary shadow-elev-1">
        <Image
          src={imgSrc}
          alt={`Capa da aula ${lesson.title}`}
          fill
          unoptimized
          sizes="260px"
          className="object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--spring)] group-hover:scale-[1.045]"
        />
        {locked ? (
          <>
            <span className="sr-only">Aula bloqueada</span>
            <div
              aria-hidden="true"
              className="absolute inset-0 z-10 grid place-items-center bg-foreground/55"
            >
              <span className="grid size-9 place-items-center rounded-full border border-background/30 bg-foreground/70 text-background shadow-elev-2">
                <LockKeyhole className="size-4" aria-hidden="true" />
              </span>
            </div>
          </>
        ) : (
          lesson.isCompleted && (
            <span className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full bg-success text-success-foreground shadow-elev-1">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Aula assistida</span>
            </span>
          )
        )}
        {!locked && !!lesson.progress && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-background/40">
            <div className="h-full bg-accent" style={{ width: `${lesson.progress}%` }} />
          </div>
        )}
      </div>
      <div className="px-0.5 pt-2">
        <p className="line-clamp-2 text-xs font-bold leading-snug text-foreground">{lesson.title}</p>
        <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-muted" data-numeric>
          <Clock3 className="size-3" aria-hidden="true" />
          {lesson.durationInMinutes} min
        </p>
      </div>
    </Link>
  );
}
