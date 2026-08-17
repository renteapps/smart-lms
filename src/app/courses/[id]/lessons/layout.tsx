import CourseSidebar from "@/components/classroom/CourseSidebar";
import { ZenModeProvider } from "@/contexts/ZenModeContext";
import { getSessionUser } from "@/lib/supabase/auth";
import { getCourse } from "@/lib/data/courses";

/**
 * Shell da sala de aula.
 *
 * Fora do `RouteShell` do aluno de propósito: aqui não há navbar nem rodapé —
 * só o índice do curso e a aula. No desktop cada coluna rola por conta própria,
 * de modo que o índice nunca sai de vista enquanto a aula avança.
 *
 * O curso é buscado aqui, no layout, e não em cada aula: assim o índice não
 * refaz a consulta a cada troca de etapa.
 */
export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  const course = await getCourse(supabase, id, user?.id);

  return (
    <ZenModeProvider>
      <div className="min-h-dvh bg-background lg:flex lg:h-screen lg:overflow-hidden">
        {course && <CourseSidebar course={course} />}
        <main className="min-h-dvh flex-1 pt-16 lg:h-full lg:overflow-y-auto lg:pt-0">
          {children}
        </main>
      </div>
    </ZenModeProvider>
  );
}
