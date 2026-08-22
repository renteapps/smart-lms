"use client";

import { Card, Typography, buttonVariants } from "@heroui/react";
import Link from "next/link";
import { Sparkles, Target, Compass, BookOpen } from "lucide-react";
import { ArrowRight02Icon } from "@/components/ui/arrow-right-02";
import { Rise } from "@/components/ui/Rise";
import { cn } from "@/lib/utils";

export function LandingPage() {
  return (
    <div className="w-full relative">
      {/* Hero Section */}
      <section className="editorial-container section-rhythm pt-20 md:pt-32 pb-16 flex flex-col items-center text-center relative z-10">
        <Rise>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-soft text-accent-soft-foreground text-sm mb-8 font-medium shadow-elev-1">
            <Sparkles className="size-4" />
            <span>Educação moldada para você</span>
          </div>
        </Rise>

        <Rise delay={100}>
          <h1 className="display-1 max-w-4xl mb-6 text-balance">
            Cada jornada é única. <br className="hidden md:block" />
            <span className="text-muted">A sua também deve ser.</span>
          </h1>
        </Rise>

        <Rise delay={200}>
          <p className="lede text-muted mb-10 max-w-2xl mx-auto text-balance">
            Descubra uma trilha de educação e carreira desenhada especificamente para os seus objetivos. 
            Aprenda com especialistas em um ambiente calmo, focado no seu próximo passo prático.
          </p>
        </Rise>

        <Rise delay={300}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link 
              href="/criar-conta" 
              className={cn(buttonVariants({ variant: "primary", size: "lg" }), "h-14 px-8 text-lg w-full sm:w-auto gap-2")}
            >
              Criar minha trilha
              <ArrowRight02Icon size={20} />
            </Link>
            <Link 
              href="/acessar" 
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "h-14 px-8 text-lg w-full sm:w-auto")}
            >
              Acessar plataforma
            </Link>
          </div>
        </Rise>
      </section>

      {/* Como funciona / Diferenciais */}
      <section className="bg-background-secondary py-24 md:py-32">
        <div className="editorial-container">
          <div className="text-center mb-16">
            <h2 className="display-2 mb-4">Mais do que cursos. Uma direção.</h2>
            <p className="lede text-muted mx-auto max-w-2xl text-balance">
              Diferente das prateleiras de cursos tradicionais, nós mapeamos suas habilidades 
              e objetivos para construir o caminho mais curto até a sua meta.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="surface-card p-8 lift reveal h-full bg-surface border-hairline">
              <Card.Content className="p-0">
                <div className="size-12 rounded-full bg-accent-soft flex items-center justify-center text-accent-foreground mb-6">
                  <Compass className="size-6" />
                </div>
                <Typography type="h4" className="mb-3 font-display">Mapeamento Inicial</Typography>
                <Typography type="body" color="muted" className="leading-relaxed">
                  Entendemos onde você está e aonde quer chegar. Nossa inteligência analisa 
                  seu perfil para propor o melhor ponto de partida.
                </Typography>
              </Card.Content>
            </Card>

            <Card className="surface-card p-8 lift reveal h-full bg-surface border-hairline">
              <Card.Content className="p-0">
                <div className="size-12 rounded-full bg-accent-soft flex items-center justify-center text-accent-foreground mb-6">
                  <Target className="size-6" />
                </div>
                <Typography type="h4" className="mb-3 font-display">Trilha Focada</Typography>
                <Typography type="body" color="muted" className="leading-relaxed">
                  Sem distrações. Sua jornada é organizada passo a passo, mostrando apenas 
                  o que é relevante para o seu momento atual.
                </Typography>
              </Card.Content>
            </Card>

            <Card className="surface-card p-8 lift reveal h-full bg-surface border-hairline">
              <Card.Content className="p-0">
                <div className="size-12 rounded-full bg-accent-soft flex items-center justify-center text-accent-foreground mb-6">
                  <BookOpen className="size-6" />
                </div>
                <Typography type="h4" className="mb-3 font-display">Prática e Evolução</Typography>
                <Typography type="body" color="muted" className="leading-relaxed">
                  Transforme conhecimento em prática com aulas diretas, materiais de apoio 
                  premium e acompanhamento contínuo da sua evolução.
                </Typography>
              </Card.Content>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 md:py-32 overflow-hidden relative border-t border-hairline">
        <div className="absolute inset-0 bg-accent/5 pointer-events-none" />
        <div className="editorial-container relative z-10 text-center">
          <Rise>
            <h2 className="display-2 mb-6 max-w-3xl mx-auto text-balance">
              Pronto para dar o seu próximo passo profissional?
            </h2>
            <p className="lede text-muted mb-10 max-w-2xl mx-auto text-balance">
              Junte-se à plataforma que respeita o seu tempo e prioriza os seus resultados.
            </p>
            <Link 
              href="/criar-conta" 
              className={cn(buttonVariants({ variant: "primary", size: "lg" }), "h-14 px-10 text-lg w-full sm:w-auto")}
            >
              Começar minha jornada
            </Link>
          </Rise>
        </div>
      </section>
    </div>
  );
}
