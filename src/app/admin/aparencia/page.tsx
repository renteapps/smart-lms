import { PageHeader } from "@/components/ui/editorial";
import { createClient } from "@/lib/supabase/server";
import { getAppearanceConfig } from "@/lib/data/appearance";
import { AppearanceClient } from "./AppearanceClient";

export default async function AparenciaPage() {
  const supabase = await createClient();
  const appearance = await getAppearanceConfig(supabase);

  const initial = {
    platformName: appearance.platformName,
    slogan: appearance.slogan,
    primaryColor: appearance.primaryColor,
    theme: appearance.theme,
  };

  const branding = {
    logoUrl: appearance.logoUrl ?? null,
    faviconUrl: appearance.faviconUrl ?? null,
    ogImageUrl: appearance.ogImageUrl ?? null,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <PageHeader eyebrow="Plataforma" title="Aparência" description="Personalize a identidade visual e as configurações de marca da plataforma." />
      <AppearanceClient initial={initial} branding={branding} />
    </div>
  );
}
