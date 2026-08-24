"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@heroui/react";
import CarouselRow from "./CarouselRow";
import LessonCard from "./LessonCard";
import { ArrowIcon } from "@/components/ui/AnimatedIcon";
import { LearningTrail } from "@/types/trilha";
import { getMyTrail } from "@/app/actions/trail";
import { contentHref } from "@/lib/studentHome";

export default function MinhaTrilhaRow() {
  const [trail, setTrail] = useState<LearningTrail | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadTrail() {
      const res = await getMyTrail();
      if (res.success && res.trail && isMounted) {
        setTrail(res.trail);
      }
    }
    loadTrail();
    return () => { isMounted = false; };
  }, []);

  const pendingLessons = trail?.items.filter((item) => item.status === 'pending').slice(0, 8) || [];
  if (pendingLessons.length === 0) return null;

  return (
    /*
     * A linha sobe sobre o herói de propósito: a sobreposição é o que
     * transforma duas faixas empilhadas numa composição só e sinaliza que há
     * mais conteúdo abaixo da dobra.
     */
    <div className="relative z-30 mb-10 -mt-[10vh] md:-mt-[15vh]">
      <div className="editorial-container flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Sua agenda</p>
          <h2 className="display-3 mt-2 text-foreground">Minha Trilha</h2>
          <p className="mt-2 text-sm text-muted">Próximos conteúdos da sua agenda personalizada</p>
        </div>
        <Link
          href="/minha-trilha"
          className={`${buttonVariants({ variant: "tertiary" })} icon-draw shrink-0`}
        >
          Ver agenda
          <ArrowIcon size={16} />
        </Link>
      </div>

      <CarouselRow label="Próximos conteúdos da sua trilha">
        {pendingLessons.map((item) => (
          <LessonCard
            key={item.id}
            title={item.title}
            moduleName={item.moduleName || item.courseName}
            duration={`${item.durationMin} min`}
            cover={item.cover || 'https://images.unsplash.com/photo-1573497491765-0a15320e8b2b?q=80&w=600&auto=format&fit=crop'}
            reason={item.reason}
            href={contentHref(item)}
          />
        ))}
      </CarouselRow>
    </div>
  );
}
