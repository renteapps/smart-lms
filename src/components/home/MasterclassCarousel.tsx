import CarouselRow from "@/components/CarouselRow";
import LessonThumbCard from "@/components/LessonThumbCard";
import type { HomeCarouselRow } from "@/types/course";

/**
 * Vitrine de masterclasses na home — uma fileira por curso galeria com o
 * carrossel ativado, sempre com as 8 aulas mais recentes daquele curso.
 *
 * A ordenação por `created_at` (feita em `getHomeCarouselRows`) é proposital:
 * a promessa da fileira é "o que entrou por último", diferente da galeria do
 * próprio curso, que segue a ordem editorial escolhida pelo admin.
 */
export default function MasterclassCarousel({ rows }: { rows: HomeCarouselRow[] }) {
  if (rows.length === 0) return null;

  return (
    <>
      {rows.map((row) => (
        <CarouselRow key={row.courseId} title={row.courseTitle} label={`Aulas recentes de ${row.courseTitle}`}>
          {row.lessons.map((lesson, index) => (
            <LessonThumbCard key={lesson.id} lesson={lesson} eager={index < 4} />
          ))}
        </CarouselRow>
      ))}
    </>
  );
}
