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
        "id, slug, title, cover_url, layout, status, modules(id, title, order_index, cover_url, lessons(id, title, cover_url, short_description, duration_in_minutes, order_index, is_published, is_eligible_for_trail, topics, solves, level, objective, audience, prerequisites, content, slug))",
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

  // Título digitado com espaço sobrando não pode virar indentação no card do aluno.
  const clean = (value?: string | null) => (value ?? "").trim();

  (courses.data ?? []).forEach((course: Row) => {
    /*
     * Curso galeria: as aulas são avulsas e o módulo único é infraestrutura.
     *
     * Ele existe só para pendurar as aulas (ver a migration `gallery_courses`),
     * chama-se sempre "Aulas" e nenhuma tela o mostra — na trilha ele virava a
     * linha "Módulo: Aulas" embaixo do título, que não diz nada. Aqui a origem
     * da aula passa a ser o próprio curso.
     */
    const isGallery = course.layout === "gallery";

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
       *
       * O curso galeria fica de fora da corrente: ele é uma coleção de aulas
       * avulsas, e é essa a definição dele no banco. Herdar a linearidade fazia
       * a curadoria dizer o contrário do que pediu — mapear a sexta masterclass
       * numa resposta arrastava as cinco anteriores como pré-requisito e
       * empurrava para o fim do plano justamente a aula que o admin pôs em
       * primeiro lugar. Aqui só vale o que ele declarou de verdade.
       */
      const declared: string[] = Array.isArray(lesson.prerequisites) ? lesson.prerequisites : [];
      const validDeclared = declared.filter(
        (id) => id !== lesson.id && flatLessons.some(({ lesson: other }) => other.id === id),
      );
      const prerequisites = validDeclared.length > 0
        ? validDeclared
        : previous && !isGallery
          ? [previous]
          : undefined;

      items.push({
        id: lesson.id,
        type: "lesson",
        title: clean(lesson.title),
        category: clean(isGallery ? course.title : mod.title),
        estimatedDurationMin: lesson.duration_in_minutes ?? 10,
        courseId: course.id,
        courseName: clean(course.title),
        moduleId: mod.id,
        moduleName: isGallery ? undefined : clean(mod.title),
        /*
         * A thumb da própria aula vem primeiro.
         *
         * No curso galeria ela é obrigatória e é a identidade da masterclass —
         * usar a capa do curso deixava a trilha inteira com a mesma imagem
         * repetida. Nos cursos com módulos a thumb é opcional, e quando não
         * existe a aula continua herdando a capa do módulo e depois a do curso.
         */
        cover: clean(lesson.cover_url) || mod.cover_url || course.cover_url || FALLBACK_COVER,
        // A frase que o admin escreveu na aula; sem ela, nenhuma tela inventa outra.
        shortDescription: clean(lesson.short_description) || undefined,
        prerequisites,
        slug: lesson.slug ?? undefined,
        // Ordem editorial do curso inteiro: o agendador divide o curso pelo tempo
        // das aulas, mas sempre seguindo esta sequência. Curso galeria não tem
        // sequência a preservar — quem decide a ordem dele é a curadoria.
        sequence: isGallery ? undefined : position,
      });

      if (lesson.is_eligible_for_trail !== false) {
        eligibleLessons.push({
          lessonId: lesson.id,
          courseSlug: course.slug,
          moduleId: mod.id,
          title: clean(lesson.title),
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
        title: clean(mod.title),
        category: clean(course.title),
        childIds: lessonIds,
        courseId: course.id,
      });
    });

    items.push({
      id: course.id,
      type: "course",
      title: clean(course.title),
      category: "Formação completa",
      childIds: courseLessonIds,
      slug: course.slug,
    });
  });

  (articles.data ?? []).forEach((article: Row) => {
    items.push({
      id: article.id,
      type: "article",
      title: clean(article.title),
      category: article.category ?? "Artigo",
      slug: article.slug,
      shortDescription: clean(article.excerpt) || undefined,
      estimatedDurationMin: article.reading_time ?? 8,
    });
  });

  return createContentIndex(items, eligibleLessons);
}
