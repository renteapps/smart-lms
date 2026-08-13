"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock3, Lock, Play } from "lucide-react";
import { Card, Chip, Label, ProgressBar } from "@heroui/react";
import { Reveal } from "@/components/ui/Reveal";
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

export default function LessonCard({
  id,
  title,
  moduleName,
  cover,
  duration,
  progress,
  locked,
  reason,
  href,
  className,
}: LessonCardProps) {
  const linkUrl = href || (id ? `/courses/c1/lessons/${id}` : "#");

  const content = (
    <>
      <div className="relative w-[38%] min-w-[112px] shrink-0 overflow-hidden bg-background-secondary">
        <Image
          src={cover}
          alt={`Capa da aula ${title}`}
          fill
          sizes="(max-width: 768px) 38vw, 180px"
          className={cn(
            "object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] group-hover:scale-[1.04]",
            locked && "grayscale",
          )}
        />
        <div aria-hidden="true" className={cn("absolute inset-0", locked ? "bg-foreground/45" : "bg-foreground/10")} />
        {/* Material sobre imagem: o disco deixa a capa aparecer por trás do ícone. */}
        <span
          aria-hidden="true"
          className="material-thick absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-accent"
        >
          {locked ? <Lock className="size-4" /> : <Play className="ml-0.5 size-4 fill-current" />}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        {reason && (
          <Chip size="sm" variant="soft" color={locked ? "default" : "accent"} className="mb-2 w-fit">
            {reason}
          </Chip>
        )}
        {moduleName && (
          <span className="truncate text-[0.625rem] font-bold uppercase tracking-[0.09em] text-accent">{moduleName}</span>
        )}
        <h3 className="mt-1 line-clamp-2 font-display text-[0.95rem] font-bold leading-snug tracking-[-0.015em] text-foreground">
          {title}
        </h3>

        <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-semibold text-muted" data-numeric>
          <Clock3 className="size-3.5" aria-hidden="true" /> {duration}
          {locked && (
            <Chip size="sm" variant="soft" color="default" className="ml-auto">
              Em breve
            </Chip>
          )}
        </div>

        {progress !== undefined && (
          <ProgressBar value={progress} color="accent" size="sm" className="mt-3" data-numeric>
            <Label className="text-[0.625rem] font-bold text-muted">Progresso</Label>
            <ProgressBar.Output className="text-[0.625rem] font-bold text-accent" />
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        )}
      </div>
    </>
  );

  if (locked) {
    return (
      <Card
        aria-disabled="true"
        className={cn(
          "group flex min-w-0 cursor-not-allowed flex-row gap-0 overflow-hidden border-hairline p-0 opacity-75",
          className || "w-80",
        )}
      >
        {content}
      </Card>
    );
  }

  return (
    <Link href={linkUrl} className={cn("group block min-w-0 rounded-2xl", className || "w-80")}>
      <Reveal className="h-full rounded-2xl">
        <Card className="lift flex h-full flex-row gap-0 overflow-hidden border-hairline p-0">{content}</Card>
      </Reveal>
    </Link>
  );
}
