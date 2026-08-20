import type { EligibleLesson } from "@/types/trilha";
import { createContentIndex, type ContentIndex, type ContentItem } from "@/lib/contentCatalog";
import { logQueryError, type DB, type Row } from "./types";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=85&w=1000&auto=format&fit=crop";

/**
 * Monta o índice de conteúdo mapeável a partir do banco.
 *
 * Cursos, módulos, aulas e artigos entram no mesmo catálogo, que é o que a tela
 * de curadoria oferece ao admin e o que o motor da trilha consegue agendar.
 * Pré-requisito de uma aula é o que o admin declarou no formulário da aula; sem
 * declaração, cai na aula anterior do mesmo curso na ordem editorial (ver o
 * comentário em `flatLessons.forEach`).
 */
export async function getContentIndex(db: DB): Promise<ContentIndex> {
  const [courses, articles] = await Promise.all([
    db
      .from("courses")
      .select(
        "id, slug, title, cover_url, status, modules(id, title, order_index, cover_url, lessons(id, title, duration_in_minutes, order_index, is_published, is_eligible_for_trail, topics, solves, level, objective, audience, prerequisites, content, slug))",
      )
      .eq("is_published", true)
      .neq("status", "Arquivado")
      .order("order_index", { ascending: true }),
    db
      .from("articles")
      .select("id, slug, title, category, reading_time, excerpt")
      .eq("is_published", true),
  ]);

  logQueryError("getContentIndex:courses", courses.error);
  logQueryError("getContentIndex:articles", articles.error);

  const items: ContentItem[] = [];
  const eligibleLessons: EligibleLesson[] = [];

  (courses.data ?? []).forEach((course: Row) => {
    const modules = (course.modules ?? [])
      .slice()
      .sort((a: Row, b: Row) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const courseLessonIds: string[] = [];
    // Ordem editorial linear do curso inteiro: define o encadeamento de pré-requisitos.
    const flatLessons: Array<{ lesson: Row; mod: Row }> = [];

    modules.forEach((mod: Row) => {
      (mod.lessons ?? [])
        .slice()
        .filter((lesson: Row) => lesson.is_published !== false)
        .sort((a: Row, b: Row) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .forEach((lesson: Row) => flatLessons.push({ lesson, mod }));
    });

    flatLessons.forEach(({ lesson, mod }, position) => {
      const previous = flatLessons[position - 1]?.lesson.id;
      courseLessonIds.push(lesson.id);

      /*
       * Pré-requisitos declarados pelo admin substituem a corrente linear.
       *
       * Sem eles, o padrão é "a aula anterior do curso" — que mantém a ordem
       * editorial funcionando sem ninguém configurar nada. Quando o admin
       * declara explicitamente de quais aulas esta depende, a declaração
       * ganha: somar a anterior por cima traria de volta a cadeia inteira e
       * anularia justamente a trilha não-linear que ele quis montar.
       *
       * Só entram ids de aulas que existem neste curso — id órfão (aula
       * apagada, ou colado de outro curso) viraria aviso de "pré-requisito não
       * encontrado" na trilha do aluno.
       */
      const declared: string[] = Array.isArray(lesson.prerequisites) ? lesson.prerequisites : [];
      const validDeclared = declared.filter(
        (id) => id !== lesson.id && flatLessons.some(({ lesson: other }) => other.id === id),
      );
      const prerequisites = validDeclared.length > 0
        ? validDeclared
        : previous
          ? [previous]
          : undefined;

      items.push({
        id: lesson.id,
        type: "lesson",
        title: lesson.title,
        category: mod.title,
        estimatedDurationMin: lesson.duration_in_minutes ?? 10,
        courseId: course.id,
        moduleId: mod.id,
        moduleName: mod.title,
        cover: mod.cover_url || course.cover_url || FALLBACK_COVER,
        prerequisites,
        slug: lesson.slug ?? undefined,
      });

      if (lesson.is_eligible_for_trail !== false) {
        eligibleLessons.push({
          lessonId: lesson.id,
          courseSlug: course.slug,
          moduleId: mod.id,
          title: lesson.title,
          description: lesson.objective || lesson.content?.slice(0, 160) || "",
          duration: (lesson.duration_in_minutes ?? 10) * 60,
          topics: lesson.topics ?? [],
          problemasQueResolve: lesson.solves ?? [],
          nivel: (lesson.level ?? "iniciante") as EligibleLesson["nivel"],
          objetivo: lesson.objective ?? undefined,
          publico: lesson.audience ?? undefined,
          prerequisitos: prerequisites,
        });
      }
    });

    modules.forEach((mod: Row) => {
      const lessonIds = (mod.lessons ?? [])
        .filter((lesson: Row) => lesson.is_published !== false)
        .slice()
        .sort((a: Row, b: Row) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((lesson: Row) => lesson.id);

      items.push({
        id: mod.id,
        type: "module",
        title: mod.title,
        category: course.title,
        childIds: lessonIds,
        courseId: course.id,
      });
    });

    items.push({
      id: course.id,
      type: "course",
      title: course.title,
      category: "Formação completa",
      childIds: courseLessonIds,
      slug: course.slug,
    });
  });

  (articles.data ?? []).forEach((article: Row) => {
    items.push({
      id: article.id,
      type: "article",
      title: article.title,
      category: article.category ?? "Artigo",
      slug: article.slug,
      estimatedDurationMin: article.reading_time ?? 8,
    });
  });

  return createContentIndex(items, eligibleLessons);
}
