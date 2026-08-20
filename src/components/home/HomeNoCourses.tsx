"use client";

import { ShoppingBag, BookOpen } from "lucide-react";
import { Rise } from "@/components/ui/Rise";
import CourseCard from "@/components/CourseCard";
import type { CatalogCourse } from "@/types/course";

interface HomeNoCoursesProps {
  courses: CatalogCourse[];
}

/**
 * Vitrine de compra de cursos.
 *
 * Exibida quando o usuário logado não tem nenhuma matrícula ativa nem
 * assinatura ativa — ou seja, não tem acesso a nenhum conteúdo da plataforma.
 *
 * Em vez de levar ao onboarding (que não faz sentido sem conteúdo comprado),
 * mostramos os cursos disponíveis com seus links de compra.
 */
export default function HomeNoCourses({ courses }: HomeNoCoursesProps) {
  const hasCourses = courses.length > 0;

  return (
    <main className="editorial-container py-[clamp(4rem,8vw,7rem)]">
      <Rise>
        {/* Ícone de entrada */}
        <span className="icon-draw grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
          <ShoppingBag size={28} aria-hidden="true" />
        </span>

        <p className="eyebrow mt-7">Catálogo de Cursos</p>
        <h1 className="display-1 mt-3 max-w-3xl text-foreground">
          Comece sua jornada de aprendizado.
        </h1>
        <p className="lede mt-5 max-w-2xl">
          {hasCourses
            ? "Adquira um dos cursos abaixo para desbloquear seu acesso completo e montar sua trilha de estudo personalizada."
            : "Em breve nossos cursos estarão disponíveis aqui. Entre em contato para saber mais."}
        </p>
      </Rise>

      {/* Lista de cursos */}
      {hasCourses ? (
        <div className="mt-[clamp(3rem,5vw,4rem)] grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => (
            <Rise key={course.id} delay={index * 70} className="h-full">
              <CourseCard {...course} className="h-full" />
            </Rise>
          ))}
        </div>
      ) : (
        <Rise delay={100}>
          <div className="mt-16 flex flex-col items-center gap-4 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-default text-foreground">
              <BookOpen size={32} aria-hidden="true" />
            </span>
            <p className="max-w-sm text-muted">
              Nenhum curso disponível no momento. Nossa equipe está preparando
              conteúdos incríveis para você.
            </p>
          </div>
        </Rise>
      )}
    </main>
  );
}
