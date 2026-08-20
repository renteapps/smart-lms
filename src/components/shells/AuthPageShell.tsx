import { AuthPageProviders } from "@/components/providers/AuthPageProviders";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return <AuthPageProviders>{children}</AuthPageProviders>;
}
