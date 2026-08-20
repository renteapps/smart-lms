"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock3, Layers3 } from "lucide-react";
import { Card, Chip, Label, ProgressBar } from "@heroui/react";
import { ArrowIcon } from "@/components/ui/AnimatedIcon";
import { Reveal } from "@/components/ui/Reveal";
import { useCardTransition } from "@/contexts/CardTransitionContext";
import { cn } from "@/lib/utils";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=85&w=1200&auto=format&fit=crop";

type CourseCardProps = {
  id?: string;
  slug?: string;
  title: string;
  category: string;
  cover: string;
  progress?: number;
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
  const { triggerTransition } = useCardTransition();
  const linkUrl = href || (id ? `/courses/${id}` : "#");
  const hasMeta = Boolean(duration) || lessonCount !== undefined || Boolean(level);

  const initialCover = cover && cover.trim() !== "" ? cover : FALLBACK_COVER;
  const [imgSrc, setImgSrc] = useState(initialCover);

  useEffect(() => {
    setImgSrc(cover && cover.trim() !== "" ? cover : FALLBACK_COVER);
  }, [cover]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.shiftKey ||
      !linkUrl ||
      linkUrl === "#" ||
      linkUrl.startsWith("http")
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

  return (
    <Link
      href={linkUrl}
      onClick={handleClick}
      className={cn("icon-draw group block h-full min-w-0 rounded-lg", className)}
    >
      {/*
       * Um gesto por card: o foco de luz do Reveal somado ao `.lift`.
       * `edge` fica só no card em destaque — se todos brilham, nenhum destaca.
       */}
      <Reveal edge={featured} className="h-full rounded-lg">
        <Card className="lift h-full gap-0 overflow-hidden p-0">
          <div className="relative aspect-[16/9] overflow-hidden bg-background-secondary">
            <Image
              src={imgSrc}
              alt={`Capa do curso ${title}`}
              fill
              loading={eager ? "eager" : "lazy"}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              onError={() => setImgSrc(FALLBACK_COVER)}
              className="object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--ease-zen)] group-hover:scale-[1.035]"
            />
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
            <span className="material-thick absolute bottom-3 left-3 rounded-md px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-foreground">
              {category}
            </span>
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

          {/*
           * A hairline mora no rodapé, não na régua de meta: uma linha só, e ela
           * separa a leitura do curso da ação. Duas linhas viravam formulário.
           */}
          <Card.Footer className="mt-auto justify-between border-t border-hairline px-5 py-4 text-sm font-bold text-accent">
            <span>{progress !== undefined ? "Continuar curso" : "Conhecer curso"}</span>
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-md bg-accent-soft text-accent-soft-foreground transition-[background-color,color,transform] duration-[var(--duration-md)] group-hover:translate-x-0.5 group-hover:bg-accent group-hover:text-accent-foreground"
            >
              <ArrowIcon size={16} />
            </span>
          </Card.Footer>
        </Card>
      </Reveal>
    </Link>
  );
}
