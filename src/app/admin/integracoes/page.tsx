import Link from "next/link";
import { Card, Chip } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { createClient } from "@/lib/supabase/server";

export default async function IntegracoesPage() {
  const supabase = await createClient();

  const { data: dbIntegrations } = await supabase
    .from("integrations")
    .select("provider, is_active");

  // Definindo a base estática de integrações que a plataforma suporta
  const baseIntegrations = [
    {
      name: "OpenRouter (IAs)",
      slug: "openrouter",
      description: "Conecte os modelos de IA mais avançados (Claude 3.5, GPT-4o, Gemini 2.0, DeepSeek R1) com uma única chave de API para seus Agentes e Tutores.",
      logo: "https://openrouter.ai/favicon.ico",
      badge: "Inteligência Artificial",
    },
    {
      name: "Resend",
      slug: "resend",
      description: "Disparos de e-mails transacionais (boas-vindas, matrícula, certificados) e notificações em tempo real.",
      logo: "https://resend.com/favicon.ico",
      badge: "E-mails & Alertas",
    },
    {
      name: "Eduzz",
      slug: "eduzz",
      description: "Sincronize vendas, assinaturas e faturas automaticamente através de webhooks da Eduzz.",
      logo: "https://www.eduzz.com/favicon.ico",
      badge: "Pagamentos",
    },
    {
      name: "Hotmart",
      slug: "hotmart",
      description: "Integração completa com a Hotmart para liberação de acessos e assinaturas.",
      logo: "https://hotmart.com/favicon.ico",
      badge: "Pagamentos",
    },
  ];

  // Mescla a base com o status real do banco
  const integrations = baseIntegrations.map((base) => {
    const dbInt = dbIntegrations?.find((i) => i.provider === base.slug);
    return {
      ...base,
      status: dbInt?.is_active ? "active" : "inactive",
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrações"
        description="Conecte sua plataforma a serviços externos de inteligência artificial, pagamentos e e-mails."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const isActive = integration.status === "active";

          const CardContent = (
            <Card className={`h-full transition-all hover:-translate-y-1 hover:shadow-lg ${isActive ? "border-accent" : ""}`}>
              <Card.Header className="flex flex-row items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-background-secondary border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={integration.logo}
                    alt={`${integration.name} logo`}
                    className={`size-6 object-contain ${!isActive && "grayscale opacity-70"}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://via.placeholder.com/24";
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Card.Title className="text-base">{integration.name}</Card.Title>
                    {isActive ? (
                      <Chip size="sm" variant="flat" color="success" className="text-[10px]">Ativa</Chip>
                    ) : integration.badge ? (
                      <Chip size="sm" variant="soft" color="accent" className="text-[10px]">{integration.badge}</Chip>
                    ) : null}
                  </div>
                </div>
              </Card.Header>
              <Card.Content>
                <Card.Description>{integration.description}</Card.Description>
              </Card.Content>
            </Card>
          );

          return (
            <Link key={integration.slug} href={`/admin/integracoes/${integration.slug}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl">
              {CardContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
