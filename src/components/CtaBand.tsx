"use client";

import Link from "next/link";
import { buttonVariants } from "@heroui/react";
import { TrailIcon, ArrowIcon } from "@/components/ui/AnimatedIcon";
import { Reveal } from "@/components/ui/Reveal";
import { Rise } from "@/components/ui/Rise";
import { cn } from "@/lib/utils";

export default function CtaBand() {
  return (
    <section className="editorial-container section-rhythm">
      <Rise>
        {/*
         * Único bloco invertido da home. O `Reveal` faz o foco de luz correr
         * pela superfície escura — é sobre fundo profundo que o efeito do
         * Fluent realmente aparece, e ele substitui qualquer ornamento.
         */}
        <Reveal
          edge
          className="icon-draw overflow-hidden rounded-2xl bg-background-inverse text-background shadow-elev-4"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-32 size-96 rounded-full bg-accent/25 blur-3xl"
          />

          <div className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-16">
            <div className="max-w-2xl">
              <span className="grid size-12 place-items-center rounded-2xl bg-background/10 text-background">
                <TrailIcon size={24} />
              </span>
              {/* `.eyebrow` fixa a cor em `--muted`; sobre o bloco invertido o rótulo é escrito à mão. */}
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.09em] text-background/65">
                Trilha personalizada
              </p>
              <h2 className="display-2 mt-3">Um próximo passo feito para você.</h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-background/70">
                Responda algumas perguntas e receba uma trilha que combina seus objetivos, desafios e
                ritmo.
              </p>
            </div>

            <Link
              href="/onboarding"
              className={cn(buttonVariants({ variant: "primary", size: "lg" }), "shrink-0")}
            >
              Montar minha trilha
              <ArrowIcon size={18} />
            </Link>
          </div>
        </Reveal>
      </Rise>
    </section>
  );
}
