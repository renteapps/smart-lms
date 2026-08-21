import Link from "next/link";
import { buttonVariants } from "@heroui/styles";
import { EmptyState } from "@heroui/react/empty-state";
import CourseOverviewClient from "@/components/classroom/CourseOverviewClient";
import CourseGalleryClient from "@/components/classroom/CourseGalleryClient";
import { getSessionUser } from "@/lib/supabase/auth";
import { getCourseLayoutMeta, getCourseOutline, getGalleryCourse } from "@/lib/data/courses";
import { getCourseCertificate } from "@/lib/data/certificates";

function NotFoundBlock() {
  return (
    <div className="flex min-h-[calc(100dvh-76px)] items-center justify-center px-4 py-16 sm:py-24 pt-20 sm:pt-[76px]">
      <EmptyState className="max-w-md text-center">
        <p className="eyebrow text-xs">Erro 404</p>
        <h1 className="display-3 mt-3 text-foreground break-words">Curso não encontrado</h1>
        <p className="lede mx-auto mt-3 text-sm sm:text-base">
          Este curso pode ter sido despublicado ou o endereço está incorreto.
        </p>
        <Link href="/cursos" className={buttonVariants({ variant: "primary", className: "mt-8 w-full sm:w-auto" })}>
          Ver todos os cursos
        </Link>
      </EmptyState>
    </div>
  );
}

/**
 * Capa do curso. Todo o cálculo (progresso, próxima aula) acontece no servidor;
 * a camada interativa vive em `CourseOverviewClient` / `CourseGalleryClient`.
 */
export default async function CourseOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user } = await getSessionUser();

  /*
   * O tipo do curso decide qual busca fazer: curso galeria lê as aulas pela
   * prévia pública (funciona travado, sem matrícula); curso por módulos segue
   * o fluxo de sempre, via `getCourseOutline`. Ver `getGalleryCourse`.
   */
  const layoutMeta = await getCourseLayoutMeta(supabase, slug);
  if (!layoutMeta || layoutMeta.status === "Arquivado") {
    return <NotFoundBlock />;
  }

  if (layoutMeta.layout === "gallery") {
    const galleryResult = await getGalleryCourse(supabase, slug, user?.id);
    if (!galleryResult) return <NotFoundBlock />;

    const { course, lessons, locked } = galleryResult;
    const totalLessons = lessons.length;
    const completedLessons = lessons.filter((lesson) => lesson.isCompleted).length;
    const progressPercentage = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const isCompleted = !locked && totalLessons > 0 && completedLessons === totalLessons;

    let certificateUrl: string | null = null;
    if (isCompleted && user) {
      const certificate = await getCourseCertificate(supabase, user.id, course.id);
      certificateUrl = certificate?.validationHash
        ? `/certificados/${certificate.validationHash}`
        : `/certificados?curso=${encodeURIComponent(course.id)}`;
    }

    const nextLesson = lessons.find((lesson) => !lesson.isCompleted) ?? lessons[0] ?? null;

    return (
      <CourseGalleryClient
        course={course}
        lessons={lessons}
        nextLesson={nextLesson}
        locked={locked}
        totalLessons={totalLessons}
        completedLessons={completedLessons}
        progressPercentage={progressPercentage}
        isCompleted={isCompleted}
        certificateUrl={certificateUrl}
      />
    );
  }

  const course = await getCourseOutline(supabase, slug, user?.id);
  if (!course || course.status === "Arquivado") {
    return <NotFoundBlock />;
  }

  const allLessons = course.modules.flatMap((mod) => mod.lessons);
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((lesson) => lesson.isCompleted).length;
  const progressPercentage = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const isCompleted = totalLessons > 0 && completedLessons === totalLessons && progressPercentage === 100;

  let certificateUrl: string | null = null;
  if (isCompleted && user) {
    const certificate = await getCourseCertificate(supabase, user.id, course.id);
    certificateUrl = certificate?.validationHash
      ? `/certificados/${certificate.validationHash}`
      : `/certificados?curso=${encodeURIComponent(course.id)}`;
  }

  // Primeira aula não concluída; se terminou tudo, volta para a primeira.
  const nextLesson = allLessons.find((lesson) => !lesson.isCompleted) ?? allLessons[0] ?? null;

  return (
    <CourseOverviewClient
      course={course}
      totalLessons={totalLessons}
      completedLessons={completedLessons}
      progressPercentage={progressPercentage}
      nextLesson={nextLesson}
      isCompleted={isCompleted}
      certificateUrl={certificateUrl}
    />
  );
}
