"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button, EmptyState, Label, SearchField, Separator, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import CourseCard from "@/components/CourseCard";
import { CourseIcon } from "@/components/ui/AnimatedIcon";
import { Rise } from "@/components/ui/Rise";
import { CATALOG_COURSES } from "@/lib/catalog";

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

  const isFiltered = query.trim().length > 0 || category !== "Todos";

  return (
    <div className="pt-[76px]">
      <section className="border-b border-hairline">
        <div className="editorial-container section-rhythm">
          <Rise>
            <p className="eyebrow">Biblioteca de aprendizagem</p>
            <h1 className="display-1 mt-3 max-w-4xl text-foreground">
              Encontre a habilidade certa para o seu próximo passo.
            </h1>
            <p className="lede mt-6">
              Cursos objetivos, organizados para caber na rotina e gerar mudança fora da tela.
            </p>
          </Rise>
        </div>
      </section>

      <section className="editorial-container py-10 sm:py-14">
        {/*
         * Painel de filtros em acrílico: a malha de gradiente do RouteShell passa
         * por trás, então o material tem o que refratar. `thick` porque carrega
         * campo e rótulos.
         */}
        <div className="material-thick mb-8 grid gap-4 rounded-2xl p-4 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
          <SearchField value={query} onChange={setQuery}>
            <Label className="sr-only">Buscar cursos</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Busque por tema, habilidade ou curso" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar lg:pb-0">
            <SlidersHorizontal className="mr-1 size-4 shrink-0 text-muted" aria-hidden="true" />
            <ToggleButtonGroup
              aria-label="Filtrar por categoria"
              selectionMode="single"
              disallowEmptySelection
              isDetached
              selectedKeys={[category]}
              onSelectionChange={(keys) => {
                const [next] = Array.from(keys);
                if (next !== undefined) setCategory(String(next));
              }}
            >
              {categories.map((item) => (
                <ToggleButton key={item} id={item} className="shrink-0">
                  {item}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
        </div>

        <div className="mb-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-sm text-muted" aria-live="polite" data-numeric>
            <strong className="font-bold text-foreground">{filteredCourses.length}</strong>{" "}
            {filteredCourses.length === 1 ? "curso encontrado" : "cursos encontrados"}
            {category !== "Todos" && <span className="text-muted"> · {category}</span>}
          </p>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs font-semibold text-muted sm:block">Ordenados pela sua afinidade</p>
            {isFiltered && (
              <>
                <Separator orientation="vertical" className="hidden h-4 sm:block" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setCategory("Todos");
                  }}
                >
                  Limpar filtros
                </Button>
              </>
            )}
          </div>
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course, index) => (
              <Rise key={course.id} className="min-w-0" delay={Math.min(index, 5) * 60}>
                <CourseCard {...course} eager={index === 0} featured={index === 0} className="h-full" />
              </Rise>
            ))}
          </div>
        ) : (
          <EmptyState className="gap-5 py-24">
            <span className="icon-draw grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
              <CourseIcon size={28} />
            </span>
            <div className="text-center">
              <p className="display-3 text-foreground">Nenhum curso encontrado</p>
              <p className="mt-2 text-sm text-muted">Tente outro termo ou remova o filtro atual.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setCategory("Todos");
              }}
            >
              Limpar busca e filtros
            </Button>
          </EmptyState>
        )}
      </section>
    </div>
  );
}
