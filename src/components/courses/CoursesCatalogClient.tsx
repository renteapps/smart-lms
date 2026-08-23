"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button, EmptyState, Label, SearchField, Separator, ToggleButton, ToggleButtonGroup, Select, ListBox, ListBoxItem } from "@heroui/react";
import CourseCard from "@/components/CourseCard";
import { CourseIcon } from "@/components/ui/AnimatedIcon";
import { Rise } from "@/components/ui/Rise";
import { rankCatalogByAffinity } from "@/lib/studentHome";
import type { CatalogCourse } from "@/types/course";
import type { LearningTrail, Questionnaire } from "@/types/trilha";

type Props = {
  courses: CatalogCourse[];
  trail: LearningTrail | null;
  questionnaire: Questionnaire | null;
};

export default function CoursesCatalogClient({ courses, trail, questionnaire }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [sortMode, setSortMode] = useState<"catalog" | "affinity">("catalog");

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(courses.map((course) => course.category)))],
    [courses],
  );

  const rankedCourses = useMemo(() => {
    if (sortMode === "affinity" && trail) {
      return rankCatalogByAffinity(courses, trail, questionnaire);
    }
    return [...courses].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [courses, sortMode, trail, questionnaire]);

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return rankedCourses.filter((course) => {
      const matchesCategory = category === "Todos" || course.category === category;
      const matchesQuery =
        !normalized ||
        `${course.title} ${course.description} ${course.category}`
          .toLocaleLowerCase("pt-BR")
          .includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, query, rankedCourses]);

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
        <div className="material-thick mb-8 grid gap-4 rounded-2xl p-4 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-center">
          <SearchField value={query} onChange={setQuery}>
            <Label className="sr-only">Buscar cursos</Label>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Busque por tema, habilidade ou curso" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <div className="flex items-center gap-2 overflow-hidden">
            <SlidersHorizontal className="mr-1 size-4 shrink-0 text-muted hidden sm:block" aria-hidden="true" />
            <div className="flex-1 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
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
                className="flex w-max flex-nowrap"
              >
                {categories.map((item) => (
                  <ToggleButton key={item} id={item} className="shrink-0">
                    {item}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>
          </div>
        </div>

        <div className="mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-muted" aria-live="polite" data-numeric>
            <strong className="font-bold text-foreground">{filteredCourses.length}</strong>{" "}
            {filteredCourses.length === 1 ? "curso encontrado" : "cursos encontrados"}
            {category !== "Todos" && <span className="text-muted"> · {category}</span>}
          </p>
          
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {trail && (
              <Select
                aria-label="Ordenar por"
                selectedKey={sortMode}
                onSelectionChange={(k) => setSortMode(k as "catalog" | "affinity")}
                className="w-48"
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBoxItem id="catalog">Ordem do catálogo</ListBoxItem>
                    <ListBoxItem id="affinity">Para você (Afinidade)</ListBoxItem>
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
            
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
                <CourseCard
                  id={course.id}
                  slug={course.slug}
                  title={course.title}
                  category={course.category}
                  cover={course.cover}
                  description={course.description}
                  duration={course.duration}
                  lessonCount={course.lessonCount}
                  level={course.level as "Essencial" | "Intermediário" | "Avançado"}
                  progress={course.progress}
                  studentState={course.studentState}
                  certificateEnabled={course.certificateEnabled}
                  eager={index === 0}
                  featured={index === 0}
                  className="h-full"
                />
              </Rise>
            ))}
          </div>
        ) : (
          <EmptyState className="gap-5 py-16 px-4 sm:py-24 sm:px-0">
            <span className="icon-draw grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-soft-foreground">
              <CourseIcon size={28} />
            </span>
            <div className="text-center">
              <p className="display-3 text-foreground">
                {courses.length === 0 ? "Nenhum curso publicado ainda" : "Nenhum curso encontrado"}
              </p>
              <p className="mt-2 text-sm text-muted">
                {courses.length === 0
                  ? "Assim que um curso for publicado no painel, ele aparece aqui."
                  : "Tente outro termo ou remova o filtro atual."}
              </p>
            </div>
            {courses.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setCategory("Todos");
                }}
              >
                Limpar busca e filtros
              </Button>
            )}
          </EmptyState>
        )}
      </section>
    </div>
  );
}
