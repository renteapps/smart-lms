import CourseSidebar from "@/components/classroom/CourseSidebar";
import { ZenModeProvider } from "@/contexts/ZenModeContext";

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ZenModeProvider>
      <div className="min-h-dvh bg-bg lg:flex lg:h-screen lg:overflow-hidden">
        <CourseSidebar />
        <main className="min-h-dvh flex-1 pt-16 lg:h-full lg:overflow-y-auto lg:pt-0">
          {children}
        </main>
      </div>
    </ZenModeProvider>
  );
}
