"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock3, Layers3 } from "lucide-react";
import { Card, Chip, Label, ProgressBar } from "@heroui/react";
import { ArrowIcon } from "@/components/ui/AnimatedIcon";
import { Reveal } from "@/components/ui/Reveal";
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
  /** Realce de borda seguindo o cursor. Reservado ao card de destaque da tela. */
  featured?: boolean;
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
  featured = false,
}: CourseCardProps) {
  const linkUrl = href || (id ? `/courses/${id}` : "#");
  const hasMeta = Boolean(duration) || lessonCount !== undefined || Boolean(level);

  return (
    <Link href={linkUrl} className={cn("icon-draw group block h-full min-w-0 rounded-2xl", className)}>
      {/*
       * Um gesto por card: o foco de luz do Reveal somado ao `.lift`.
       * `edge` fica só no card em destaque — se todos brilham, nenhum destaca.
       */}
      <Reveal edge={featured} className="h-full rounded-2xl">
        <Card className="lift h-full gap-0 overflow-hidden border-hairline p-0">
          <div className="relative aspect-[16/10] overflow-hidden bg-background-secondary">
            <Image
              src={cover}
              alt={`Capa do curso ${title}`}
              fill
              loading={eager ? "eager" : "lazy"}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] group-hover:scale-[1.035]"
            />
            {/* Véu de baixo para cima: assenta a etiqueta sem escurecer a imagem inteira. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent"
            />
            {/*
             * Material sobre imagem: a capa continua visível através da etiqueta.
             * Espessura `thick` porque há texto em cima — contraste AA é obrigatório.
             */}
            <span className="material-thick absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-bold text-foreground">
              {category}
            </span>
          </div>

          <Card.Header className="gap-2 px-5 pt-5">
            <Card.Title className="font-display text-lg font-extrabold leading-snug tracking-[-0.025em] text-foreground">
              {title}
            </Card.Title>
            {description && <Card.Description className="line-clamp-2 leading-6">{description}</Card.Description>}
          </Card.Header>

          <Card.Content className="gap-4 px-5 pt-4" data-numeric>
            {hasMeta && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-4 text-xs font-semibold text-muted">
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

            {progress !== undefined && (
              <ProgressBar value={progress} color="accent" size="sm">
                <Label className="text-xs font-bold text-muted">Seu progresso</Label>
                <ProgressBar.Output className="text-xs font-bold text-accent" />
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
            )}
          </Card.Content>

          <Card.Footer className="mt-auto justify-between px-5 pb-5 pt-5 text-sm font-bold text-accent">
            <span>{progress !== undefined ? "Continuar curso" : "Conhecer curso"}</span>
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground transition-[background-color,color,transform] duration-[var(--duration-md)] group-hover:translate-x-0.5 group-hover:bg-accent group-hover:text-accent-foreground"
            >
              <ArrowIcon size={16} />
            </span>
          </Card.Footer>
        </Card>
      </Reveal>
    </Link>
  );
}
