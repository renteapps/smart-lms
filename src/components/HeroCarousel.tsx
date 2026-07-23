"use client";

import { Info, Play } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % mockHeroes.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const hero = mockHeroes[current];

  return (
    <div className="relative w-full h-[70vh] md:h-[85vh] flex items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
          style={{ backgroundImage: `url(${hero.backdrop})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 md:px-12 w-full max-w-3xl">
        <span className="text-primary font-bold text-sm md:text-base uppercase tracking-widest mb-4 block">
          {hero.category}
        </span>
        <h1 className="text-5xl md:text-7xl font-display font-extrabold leading-[1.1] mb-6">
          {hero.title}
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl mb-8 max-w-xl">
          {hero.subtitle}
        </p>

        <div className="flex flex-wrap gap-4">
          <Button render={<Link href="/courses/c1" className="flex items-center gap-2" />} nativeButton={false} size="lg" className="rounded-[var(--radius-xl)] font-bold px-8">
            <Play className="w-5 h-5 fill-current" />
            Assistir
          </Button>
          <Button variant="outline" size="lg" className="rounded-[var(--radius-xl)] font-semibold px-8 border-border bg-background/60 hover:bg-muted backdrop-blur">
            <Info className="w-5 h-5 mr-2" />
            Mais Informações
          </Button>
        </div>
      </div>
      
      {/* Dots */}
      <div className="absolute bottom-12 right-12 z-10 flex gap-2">
        {mockHeroes.map((_, idx) => (
          <button 
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-2 h-2 rounded-full transition-all duration-[var(--duration-md)] ease-[var(--ease-zen)] ${idx === current ? 'bg-primary w-6' : 'bg-foreground/30 hover:bg-foreground/50'}`}
            aria-label={`Ir para slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
