import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card } from "@heroui/react/card";
import { ArrowIcon } from "@/components/ui/AnimatedIcon";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";
import type { ProfileTest } from "@/types/profileTest";

type BuilderTestCardProps = {
  test: ProfileTest;
  className?: string;
};

/**
 * Card de teste de perfil do criador de páginas. Antes disto, todo card
 * mostrava o mesmo ícone (a capa do teste era ignorada), os títulos não
 * clampavam e o CTA "Fazer teste" ficava em alturas diferentes de card pra
 * card. Aqui a estrutura é a mesma do card de curso — Card + rodapé com
 * `mt-auto` — o que ancora o CTA embaixo independente do tamanho do texto.
 */
export function BuilderTestCard({ test, className }: BuilderTestCardProps) {
  const hasCover = Boolean(test.coverUrl?.trim());

  return (
    <Reveal className="h-full rounded-lg">
      <Link href={`/diagnostico/${test.slug}`} className={cn("icon-draw group block h-full min-w-0 rounded-lg", className)}>
        <Card className="lift h-full gap-0 overflow-hidden p-0">
          {hasCover && (
            <div className="relative aspect-video overflow-hidden bg-background-secondary">
              <Image
                src={test.coverUrl!}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                className="object-cover transition-transform duration-[var(--duration-lg)] ease-[var(--spring)] group-hover:scale-[1.035]"
              />
            </div>
          )}

          <Card.Header className="gap-3 px-5 pt-5">
            {!hasCover && (
              <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
            )}
            <Card.Title className="line-clamp-2 font-display text-lg font-extrabold leading-snug tracking-[-0.02em] text-foreground">
              {test.title}
            </Card.Title>
            <Card.Description className="line-clamp-3 text-sm leading-6">{test.description}</Card.Description>
          </Card.Header>

          <Card.Footer className="mt-auto justify-between border-t border-hairline px-5 py-4 text-sm font-bold text-accent">
            <span>Fazer teste</span>
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-md bg-accent-soft text-accent-soft-foreground transition-[background-color,color,transform,translate] duration-[var(--duration-lg)] ease-[var(--spring)] group-hover:translate-x-0.5 group-hover:bg-accent group-hover:text-accent-foreground"
            >
              <ArrowIcon size={16} />
            </span>
          </Card.Footer>
        </Card>
      </Link>
    </Reveal>
  );
}
