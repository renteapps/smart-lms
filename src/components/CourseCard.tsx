import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";

type CourseCardProps = {
  id?: string;
  title: string;
  category: string;
  cover: string;
  progress?: number;
  href?: string;
  description?: string;
  duration?: string;
  lessonCount?: number;
  level?: "Essencial" | "Intermediário" | "Avançado";
  className?: string;
  eager?: boolean;
};

export default function CourseCard({
  id,
  title,
  category,
  cover,
  progress,
  href,
  description,
  duration,
  lessonCount,
  level,
  className,
  eager = false,
}: CourseCardProps) {
  const linkUrl = href || (id ? `/courses/${id}` : "#");

  return (
    <Link
      href={linkUrl}
      className={cn("editorial-card editorial-card-interactive group flex h-full min-w-0 flex-col overflow-hidden", className)}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-canvas-soft">
        <Image
          src={cover}
          alt={`Capa do curso ${title}`}
          fill
          loading={eager ? "eager" : "lazy"}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] group-hover:scale-[1.035]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full border border-white/50 bg-white/92 px-3 py-1 text-[11px] font-bold text-primary-active backdrop-blur-md">
          {category}
        </span>
        {level && <span className="absolute bottom-4 left-4 rounded-full border border-white/25 bg-ink/72 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-md">{level}</span>}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-extrabold leading-snug tracking-[-0.025em] text-ink">{title}</h3>
        {description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-soft">{description}</p>}

        {(duration || lessonCount) && (
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border/75 pt-4 text-xs font-semibold text-text-mute">
            {duration && <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{duration}</span>}
            {lessonCount !== undefined && <span className="flex items-center gap-1.5"><Layers3 className="h-3.5 w-3.5" />{lessonCount} aulas</span>}
          </div>
        )}

        {progress !== undefined && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs font-bold">
              <span className="text-text-soft">Seu progresso</span>
              <span className="text-primary-active">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-canvas-soft">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-5 text-sm font-bold text-primary-active">
          <span>{progress !== undefined ? "Continuar curso" : "Conhecer curso"}</span>
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-primary-pale transition-[background-color,color,transform] group-hover:translate-x-0.5 group-hover:bg-primary group-hover:text-on-primary">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
