"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import CourseCard from "@/components/CourseCard";
import { CATALOG_COURSES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const categories = ["Todos", ...Array.from(new Set(CATALOG_COURSES.map((course) => course.category)))];

export default function CoursesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return CATALOG_COURSES.filter((course) => {
      const matchesCategory = category === "Todos" || course.category === category;
      const matchesQuery = !normalized || `${course.title} ${course.description} ${course.category}`.toLocaleLowerCase("pt-BR").includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <div className="pt-[76px]">
      <section className="border-b border-border bg-primary-pale/42">
        <div className="editorial-container py-14 sm:py-20">
          <p className="eyebrow">Biblioteca de aprendizagem</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-[-0.05em] text-ink sm:text-6xl">Encontre a habilidade certa para o seu próximo passo.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-text-soft">Cursos objetivos, organizados para caber na rotina e gerar mudança fora da tela.</p>
        </div>
      </section>

      <section className="editorial-container py-10 sm:py-14">
        <div className="editorial-card mb-8 grid gap-4 p-4 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">Buscar cursos</span>
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-mute" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque por tema, habilidade ou curso" className="h-12 w-full rounded-[12px] border border-border bg-canvas-soft pl-12 pr-4 text-sm text-ink placeholder:text-text-mute focus:border-primary focus:bg-surface focus:outline-none" />
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar lg:pb-0" aria-label="Filtrar por categoria">
            <SlidersHorizontal className="mr-1 h-4 w-4 shrink-0 text-text-mute" />
            {categories.map((item) => (
              <button key={item} onClick={() => setCategory(item)} className={cn("min-h-10 shrink-0 rounded-full px-4 text-sm font-bold", category === item ? "bg-primary text-on-primary" : "bg-canvas-soft text-text-soft hover:text-ink")}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-text-soft">
            <strong className="text-ink">{filteredCourses.length}</strong> {filteredCourses.length === 1 ? "curso encontrado" : "cursos encontrados"}
          </p>
          <p className="hidden text-xs font-semibold text-text-mute sm:block">Ordenados pela sua afinidade</p>
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course, index) => <CourseCard key={course.id} {...course} eager={index === 0} />)}
          </div>
        ) : (
          <div className="editorial-card py-20 text-center">
            <p className="font-display text-xl font-bold text-ink">Nenhum curso encontrado</p>
            <p className="mt-2 text-sm text-text-soft">Tente outro termo ou remova o filtro atual.</p>
          </div>
        )}
      </section>
    </div>
  );
}
