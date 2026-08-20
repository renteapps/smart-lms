import { RouteShell } from "@/components/RouteShell";
import { StudentProviders } from "@/components/providers/StudentProviders";

export function StudentShell({ children }: { children: React.ReactNode }) {
  return <StudentProviders><RouteShell>{children}</RouteShell></StudentProviders>;
}
