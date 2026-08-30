import Link from "next/link";
import { Bot, Palette, Navigation, PanelsTopLeft, Plug, WalletCards } from "lucide-react";
import { Card } from "@heroui/react/card";
import { PageHeader } from "@/components/ui/editorial";
import { requireAdmin } from "@/lib/supabase/auth";

const settingsCards = [
  {
    href: "/admin/pages",
    icon: PanelsTopLeft,
    title: "Páginas",
    description: "Monte a home pública, a vitrine sem produtos e crie novas páginas.",
    tone: "bg-info-soft text-info-soft-foreground",
  },
  {
    href: "/admin/aparencia",
    icon: Palette,
    title: "Aparência",
    description: "Personalize cores, tipografia e identidade visual.",
    tone: "bg-success-soft text-success-soft-foreground",
  },
  {
    href: "/admin/navegacao",
    icon: Navigation,
    title: "Navegação",
    description: "Escolha quais páginas aparecem no menu e no rodapé, com nome, ícone e ordem.",
    tone: "bg-warning-soft text-warning-soft-foreground",
  },
  {
    href: "/admin/chat",
    icon: Bot,
    title: "Assistente IA",
    description: "Configure identidade, conhecimento e histórico do assistente dos alunos.",
    tone: "bg-accent-soft text-accent-soft-foreground",
  },
  {
    href: "/admin/integracoes",
    icon: Plug,
    title: "Integrações",
    description: "Configure chaves de API, webhooks e serviços externos (Eduzz, Hotmart, Resend).",
    tone: "bg-primary-soft text-primary-soft-foreground",
  },
];

export default async function AjustesPage() {
  const { adminClient } = await requireAdmin();
  await adminClient.rpc("refresh_ai_billing_period");
  const { data: billing } = await adminClient
    .from("ai_billing_settings")
    .select("monthly_budget_brl, monthly_actual_cost_brl, monthly_reserved_cost_brl, warning_threshold_percent, critical_threshold_percent")
    .eq("id", 1)
    .maybeSingle();
  const budget = Number(billing?.monthly_budget_brl) || 500;
  const committed = Number(billing?.monthly_actual_cost_brl || 0) + Number(billing?.monthly_reserved_cost_brl || 0);
  const percent = budget > 0 ? (committed / budget) * 100 : 0;
  const creditsCard = {
    href: "/admin/credits",
    icon: WalletCards,
    title: "Créditos de IA",
    description: percent >= 100
      ? `Orçamento bloqueado em ${percent.toFixed(0)}%. Revise o consumo agora.`
      : percent >= Number(billing?.critical_threshold_percent || 90)
        ? `Alerta crítico: ${percent.toFixed(0)}% do orçamento mensal comprometido.`
        : percent >= Number(billing?.warning_threshold_percent || 70)
          ? `Atenção: ${percent.toFixed(0)}% do orçamento mensal comprometido.`
          : `Precificação, consumo, franquias e orçamento. ${percent.toFixed(0)}% usado no mês.`,
    tone: percent >= 90 ? "bg-danger-soft text-danger-soft-foreground" : percent >= 70 ? "bg-warning-soft text-warning-soft-foreground" : "bg-success-soft text-success-soft-foreground",
  };
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Plataforma"
        title="Ajustes"
        description="Gerencie as configurações gerais, aparência e navegação da plataforma."
      />

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Opções de ajustes">
        {[creditsCard, ...settingsCards].map(({ href, icon: Icon, title, description, tone }) => (
          <Link key={href} href={href} className="group block outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-xl">
            <Card className="h-full lift">
              <Card.Header>
                <div className={`mb-3 grid size-10 place-items-center rounded-lg ${tone}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <Card.Title>{title}</Card.Title>
                <Card.Description className="mt-1">{description}</Card.Description>
              </Card.Header>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
