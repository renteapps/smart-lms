import { AdminShell } from "@/components/admin/AdminShell";
import { AdminProviders } from "@/components/providers/AdminProviders";

export default function AnalisesLayout({ children }: { children: React.ReactNode }) {
  return <AdminProviders><AdminShell>{children}</AdminShell></AdminProviders>;
}
