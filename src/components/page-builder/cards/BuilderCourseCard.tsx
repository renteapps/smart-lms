import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3, Layers3, LockKeyhole } from "lucide-react";
import { Card } from "@heroui/react/card";
import { ArrowIcon } from "@/components/ui/AnimatedIcon";
import { Reveal } from "@/components/ui/Reveal";
import { getStudentCourseAction } from "@/lib/courseAccess";
import { cn } from "@/lib/utils";
import type { CatalogCourse } from "@/types/course";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=85&w=1200&auto=format&fit=crop";

type BuilderCourseCardProps = {
  course: CatalogCourse;
  className?: string;
  featured?: boolean;
  eager?: boolean;
};

/**
 * Card de curso do criador de páginas — mesma anatomia visual de `CourseCard`
 * (Card + .lift + Reveal, badge de categoria sobre a capa, rodapé com CTA),
 * mas sem `useAuth`/`useCardTransition`: essas dependências de contexto não
 * existem na home pública anônima nem no preview do admin, então este card
 * resolve o estado do aluno só com o helper puro `getStudentCourseAction`.
 */
export function BuilderCourseCard({ course, className, featured = false, eager = false }: BuilderCourseCardProps) {
  const state = course.studentState ?? { kind: "available" as const };
  const locked = state.kind === "locked";
  const resolvedSalesUrl = state.kind === "locked" ? state.salesUrl : null;
  const action = getStudentCourseAction({
    state,
    courseId: course.id,
    courseSlug: course.slug,
    courseHref: `/courses/${course.slug || course.id}`,
    resolvedSalesUrl,
  });
  const linkUrl = action.href;
  const isExternal = Boolean(linkUrl?.startsWith("http://") || linkUrl?.startsWith("https://"));
  const imgSrc = course.cover?.trim() || FALLBACK_COVER;

  const card = (
    <Reveal edge={featured} className="h-full rounded-lg">
      <Card className="lift h-full gap-0 overflow-hidden p-0">
        <div className="relative aspect-video overflow-hidden bg-background-secondary">
          <Image
            src={imgSrc}
            alt={`Capa do curso ${course.title}`}
            fill
            unoptimized
            loading={eager ? "eager" : "lazy"}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className={cn(
              "object-cover transition-[filter,transform,scale] duration-[var(--duration-lg)] ease-[var(--spring)]",
              locked ? "scale-[1.02] blur-[3px]" : "group-hover:scale-[1.035]",
            )}
          />
          {locked && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-foreground/45">
              <span className="grid size-12 place-items-center rounded-full border border-background/30 bg-foreground/65 text-background shadow-elev-2">
                <LockKeyhole className="size-5" aria-hidden="true" />
                <span className="sr-only">Curso bloqueado</span>
              </span>
            </div>
          )}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-foreground/35 to-transparent"
          />
          <span className="material-thick absolute bottom-3 left-3 z-20 rounded-md px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-foreground">
            {course.category}
          </span>
          {state.kind === "in-progress" && (
            <span className="material-thick absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.6875rem] font-bold tracking-[0.02em] text-accent">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" aria-hidden="true" />
              Em progresso
            </span>
          )}
          {state.kind === "completed" && (
            <span className="material-thick absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.6875rem] font-bold tracking-[0.02em] text-success">
              <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
              Finalizado
            </span>
          )}
        </div>

        <Card.Header className="gap-1.5 px-5 pt-5">
          <Card.Title className="line-clamp-2 font-display text-[1.0625rem] font-extrabold leading-snug tracking-[-0.02em] text-foreground">
            {course.title}
          </Card.Title>
          {course.description && (
            <Card.Description className="line-clamp-2 text-sm leading-6">{course.description}</Card.Description>
          )}
        </Card.Header>

        {(course.duration || course.lessonCount !== undefined) && (
          <Card.Content className="gap-4 px-5 pt-4" data-numeric>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-muted">
              {course.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  {course.duration}
                </span>
              )}
              {course.lessonCount !== undefined && (
                <span className="flex items-center gap-1.5">
                  <Layers3 className="size-3.5" aria-hidden="true" />
                  {course.lessonCount} aulas
                </span>
              )}
            </div>
          </Card.Content>
        )}

        <Card.Footer className="mt-auto justify-between border-t border-hairline px-5 py-4 text-sm font-bold text-accent">
          <span className={cn(!linkUrl && "text-muted")}>{action.label}</span>
          <span
            aria-hidden="true"
            className={cn(
              "grid size-8 place-items-center rounded-md bg-accent-soft text-accent-soft-foreground transition-[background-color,color,transform,translate] duration-[var(--duration-lg)] ease-[var(--spring)]",
              linkUrl && "group-hover:translate-x-0.5 group-hover:bg-accent group-hover:text-accent-foreground",
              !linkUrl && "bg-background-secondary text-muted",
            )}
          >
            {locked ? <LockKeyhole className="size-4" /> : <ArrowIcon size={16} />}
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
    return (
      <div className={wrapperClassName} aria-disabled="true">
        {card}
      </div>
    );
  }

  if (isExternal) {
    return (
      <a href={linkUrl} target="_blank" rel="noopener noreferrer" className={wrapperClassName}>
        {card}
      </a>
    );
  }

  return (
    <Link href={linkUrl} className={wrapperClassName}>
      {card}
    </Link>
  );
}
