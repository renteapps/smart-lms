import CourseSidebar from "@/components/classroom/CourseSidebar";
import { ZenModeProvider } from "@/contexts/ZenModeContext";

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ZenModeProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <CourseSidebar />
        <main className="flex-1 h-full overflow-y-auto">
          {children}
        </main>
      </div>
    </ZenModeProvider>
  );
}
