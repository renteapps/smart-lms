import CourseSidebar from "@/components/classroom/CourseSidebar";
import { ZenModeProvider } from "@/contexts/ZenModeContext";

/**
 * Shell da sala de aula.
 *
 * Fora do `RouteShell` do aluno de propósito: aqui não há navbar nem rodapé —
 * só o índice do curso e a aula. No desktop cada coluna rola por conta própria,
 * de modo que o índice nunca sai de vista enquanto a aula avança.
 */
export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ZenModeProvider>
      <div className="min-h-dvh bg-background lg:flex lg:h-screen lg:overflow-hidden">
        <CourseSidebar />
        <main className="min-h-dvh flex-1 pt-16 lg:h-full lg:overflow-y-auto lg:pt-0">
          {children}
        </main>
      </div>
    </ZenModeProvider>
  );
}
