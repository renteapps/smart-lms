import { PageHeader } from "@/components/ui/editorial";
import { getNavigationConfig } from "@/lib/data/navigation";
import { requireAdmin } from "@/lib/supabase/auth";
import { NavigationClient } from "./NavigationClient";

export default async function NavegacaoPage() {
  const { supabase } = await requireAdmin();
  const config = await getNavigationConfig(supabase);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Plataforma"
        title="Navegação"
        description="Escolha quais páginas aparecem no menu e no rodapé dos alunos, com nome, ícone, ordem e para quem cada item fica visível."
      />

      <NavigationClient initial={config} />
    </div>
  );
}
