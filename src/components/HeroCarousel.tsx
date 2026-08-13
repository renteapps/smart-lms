"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Info } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button, buttonVariants } from "@heroui/react";
import { PlayIcon } from "@/components/ui/AnimatedIcon";
import { cn } from "@/lib/utils";

const mockHeroes = [
  {
    id: "1",
    title: "Comunicação Magnética",
    subtitle: "Domine a arte de se expressar com clareza, empatia e impacto em qualquer ambiente corporativo.",
    backdrop: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2000&auto=format&fit=crop",
    category: "Liderança",
  },
  {
    id: "2",
    title: "Aceleração de Carreira",
    subtitle: "Estratégias validadas para você assumir o protagonismo, ser notado e alcançar o próximo nível.",
    backdrop: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2000&auto=format&fit=crop",
    category: "Desenvolvimento",
  }
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // Movimento automático é o primeiro a cair quando o sistema pede sossego.
    if (reduceMotion) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % mockHeroes.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  const hero = mockHeroes[current];

  return (
    <div className="relative flex h-[70vh] w-full items-center md:h-[85vh]">
      {/*
       * O fundo troca por fusão cruzada, não por corte: a imagem antiga só sai
       * depois que a nova está no lugar, o que evita o piscar do canvas entre
       * os slides.
       */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={hero.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.9, ease: [0.2, 0, 0, 1] }}
          >
            <Image
              src={hero.backdrop}
              alt=""
              fill
              priority={hero.id === mockHeroes[0].id}
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"
        />
      </div>

      <div className="editorial-container relative z-10">
        <div className="max-w-3xl">
          <p className="eyebrow">{hero.category}</p>
          <h1 className="display-1 mt-4 text-foreground">{hero.title}</h1>
          <p className="lede mt-6">{hero.subtitle}</p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/courses/c1"
              className={cn(buttonVariants({ variant: "primary", size: "lg" }), "icon-draw")}
            >
              <PlayIcon size={20} />
              Assistir
            </Link>
            <Button variant="outline" size="lg">
              <Info className="size-5" aria-hidden="true" />
              Mais Informações
            </Button>
          </div>
        </div>
      </div>

      <div
        className="editorial-container absolute inset-x-0 bottom-10 z-10 flex items-center justify-end gap-1"
        role="tablist"
        aria-label="Destaques"
      >
        {mockHeroes.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            onClick={() => setCurrent(idx)}
            aria-selected={idx === current}
            aria-label={`Ir para ${item.title}`}
            className="grid h-11 w-9 place-items-center rounded-lg"
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 rounded-full transition-all duration-[var(--duration-md)] ease-[var(--ease-zen)]",
                idx === current ? "w-8 bg-accent" : "w-4 bg-foreground/25 hover:bg-foreground/45",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
