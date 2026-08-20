import { RouteShell } from "@/components/RouteShell";
import { MarketingProviders } from "@/components/providers/MarketingProviders";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return <MarketingProviders><RouteShell>{children}</RouteShell></MarketingProviders>;
}
