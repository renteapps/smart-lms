import { RouteShell } from "@/components/RouteShell";
import { MarketingProviders } from "@/components/providers/MarketingProviders";
import { getNavigationConfig } from "@/lib/data/navigation";
import { createClient } from "@/lib/supabase/server";

export async function MarketingShell({ children }: { children: React.ReactNode }) {
  const navigation = await getNavigationConfig(await createClient());

  return (
    <MarketingProviders>
      <RouteShell navigation={navigation}>{children}</RouteShell>
    </MarketingProviders>
  );
}
