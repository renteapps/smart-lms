import Image from "next/image";
import Link from "next/link";
import { Clock3, Lock, Play } from "lucide-react";
import { cn } from "@/lib/utils";

type LessonCardProps = {
  id?: string;
  title: string;
  moduleName?: string;
  cover: string;
  duration: string;
  progress?: number;
  locked?: boolean;
  reason?: string;
  href?: string;
  className?: string;
};

export default function LessonCard({ id, title, moduleName, cover, duration, progress, locked, reason, href, className }: LessonCardProps) {
  const linkUrl = href || (id ? `/courses/c1/lessons/${id}` : "#");

  const content = (
    <>
      <div className="relative w-[38%] min-w-[112px] overflow-hidden bg-canvas-soft">
        <Image
          src={cover}
          alt={`Capa da aula ${title}`}
          fill
          sizes="(max-width: 768px) 38vw, 180px"
          className={cn("object-cover transition-transform duration-[var(--duration-lg)] group-hover:scale-[1.04]", locked && "grayscale")}
        />
        <div className={cn("absolute inset-0", locked ? "bg-ink/38" : "bg-ink/12")} />
        <span className="absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/92 text-primary shadow-lg">
          {locked ? <Lock className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        {reason && <span className={cn("mb-2 w-fit rounded-full px-2.5 py-1 text-[10px] font-bold", locked ? "bg-canvas-soft text-text-mute" : "bg-primary-pale text-primary-active")}>{reason}</span>}
        {moduleName && <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-primary-active">{moduleName}</span>}
        <h3 className="mt-1 line-clamp-2 font-display text-[0.95rem] font-bold leading-snug text-ink">{title}</h3>
        <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-semibold text-text-mute">
          <Clock3 className="h-3.5 w-3.5" /> {duration}
          {locked && <span className="ml-auto">Em breve</span>}
        </div>
        {progress !== undefined && (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-canvas-soft">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <span className="mt-1.5 block text-[10px] font-bold text-primary-active">{progress}% concluído</span>
          </div>
        )}
      </div>
    </>
  );

  if (locked) {
    return (
      <div
        aria-disabled="true"
        className={cn("editorial-card group flex min-w-0 cursor-not-allowed overflow-hidden opacity-80", className || "w-80")}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={linkUrl}
      className={cn("editorial-card editorial-card-interactive group flex min-w-0 overflow-hidden", className || "w-80")}
    >
      {content}
    </Link>
  );
}
