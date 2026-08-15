"use client";

import Link from "next/link";
import { Settings2 } from "lucide-react";
import { buttonVariants } from "@heroui/styles";
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { ArrowIcon } from "@/components/ui/AnimatedIcon";
import { Rise } from "@/components/ui/Rise";
import type { ProfileChip } from "@/lib/studentHome";
import { cn } from "@/lib/utils";

type WhyThisTrailProps = {
  chips: ProfileChip[];
};

/**
 * O bloco que não existia.
 *
 * O onboarding coleta cinco respostas e o motor calcula `reason`, `learningRole`
 * e `score` por item — e nada disso aparecia para o aluno. Sem este bloco a
 * personalização é uma promessa da copy; com ele, é uma coisa verificável, que a
 * pessoa pode conferir e corrigir.
 */
export default function WhyThisTrail({ chips }: WhyThisTrailProps) {
  if (chips.length === 0) return null;

  return (
    <section className="editorial-container pb-[clamp(2rem,4vw,3rem)]">
      <Rise>
        <Card className="border-hairline">
          <Card.Content className="gap-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Sua trilha</p>
                <h2 className="display-3 mt-2 text-foreground">Por que estes conteúdos</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                  Montamos sua sequência a partir do que você respondeu. Mudou de objetivo ou de
                  rotina? Ajuste — a agenda se reorganiza sozinha.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/minha-trilha"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
                >
                  <Settings2 className="size-4" aria-hidden="true" />
                  Ajustar rotina
                </Link>
                <Link
                  href="/onboarding"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "icon-draw shrink-0")}
                >
                  Refazer o questionário
                  <ArrowIcon size={14} />
                </Link>
              </div>
            </div>

            <dl className="grid gap-5 border-t border-hairline pt-6 sm:grid-cols-2 lg:grid-cols-4">
              {chips.map((chip) => (
                <div key={chip.id} className="min-w-0">
                  <dt className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                    {chip.label}
                  </dt>
                  <dd className="mt-2.5 flex flex-wrap gap-1.5">
                    {chip.values.map((value) => (
                      <Chip key={value} color="accent" variant="soft" size="sm">
                        {value}
                      </Chip>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </Card.Content>
        </Card>
      </Rise>
    </section>
  );
}
