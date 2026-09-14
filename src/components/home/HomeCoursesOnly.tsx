"use client";

import { BookOpen } from "lucide-react";
import { Rise } from "@/components/ui/Rise";
import CourseCard from "@/components/CourseCard";
import ContinueWatchingCarousel from "@/components/home/ContinueWatchingCarousel";
import type { CatalogCourse, ContinueLesson } from "@/types/course";

interface HomeCoursesOnlyProps {
  courses: CatalogCourse[];
  continueLessons: ContinueLesson[];
}

/**
 * Home de quem comprou curso avulso e não tem plano ativo.
 *
 * Sem assinatura não há múltiplos cursos para organizar numa trilha — o
 * convite de onboarding (`HomeEmptyState`) pressupõe esse cenário e não se
 * aplica aqui. Mostra direto o que a pessoa já começou e os cursos aos
 * quais ela tem acesso.
 */
export default function HomeCoursesOnly({ courses, continueLessons }: HomeCoursesOnlyProps) {
  const unlockedCourses = courses.filter((course) => course.studentState?.kind !== "locked");

  return (
    <>
      <main className="editorial-container pt-[clamp(3rem,6vw,5rem)] pb-[clamp(2rem,4vw,3rem)]">
        <Rise>
          <span className="icon-draw grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
            <BookOpen size={28} aria-hidden="true" />
          </span>
          <p className="eyebrow mt-7">Seus cursos</p>
          <h1 className="display-1 mt-3 max-w-3xl text-foreground">Continue de onde parou.</h1>
        </Rise>
      </main>

      <ContinueWatchingCarousel lessons={continueLessons} />

      <section className="editorial-container section-rhythm">
        <Rise>
          <h2 className="display-2 text-foreground">Cursos que você tem acesso</h2>
        </Rise>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {unlockedCourses.map((course, index) => (
            <Rise key={course.id} delay={index * 70} className="h-full">
              <CourseCard {...course} hideMeta className="h-full" />
            </Rise>
          ))}
        </div>
      </section>
    </>
  );
}
