import { PageHeader } from "@/components/ui/editorial";
import { createClient } from "@/lib/supabase/server";
import { AppearanceClient } from "./AppearanceClient";

export default async function AparenciaPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "appearance")
    .maybeSingle();

  const appearance = (settings?.value as Record<string, unknown> | null) ?? {};
  const asString = (key: string, def = "") => (typeof appearance[key] === "string" ? (appearance[key] as string) : def);
  const asUrl = (key: string) => (typeof appearance[key] === "string" ? (appearance[key] as string) : null);

  const initial = {
    platformName: asString("platformName", "Smart LMS"),
    slogan: asString("slogan", "A melhor plataforma de ensino a distância. Aprenda no seu próprio ritmo com os melhores instrutores."),
    primaryColor: asString("primaryColor", "#3157B7"),
    theme: asString("theme", "light"),
  };

  const branding = {
    logoUrl: asUrl("logoUrl"),
    faviconUrl: asUrl("faviconUrl"),
    ogImageUrl: asUrl("ogImageUrl"),
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <PageHeader eyebrow="Plataforma" title="Aparência" description="Personalize a identidade visual e as configurações de marca da plataforma." />
      <AppearanceClient initial={initial} branding={branding} />
    </div>
  );
}
