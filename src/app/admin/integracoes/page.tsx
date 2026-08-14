"use client";

import Link from "next/link";
import { Card, Chip } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";

const integrations = [
  {
    name: "Resend",
    slug: "resend",
    description: "Disparos de e-mails transacionais (boas-vindas, matrícula, certificados) e notificações em tempo real.",
    logo: "https://resend.com/favicon.ico",
    status: "active",
    badge: "E-mails & Alertas",
  },
  {
    name: "Eduzz",
    slug: "eduzz",
    description: "Sincronize vendas, assinaturas e faturas automaticamente através de webhooks da Eduzz.",
    logo: "https://www.eduzz.com/favicon.ico",
    status: "active",
    badge: "Pagamentos",
  },
  {
    name: "Hotmart",
    slug: "hotmart",
    description: "Integração completa com a Hotmart para liberação de acessos e assinaturas.",
    logo: "https://hotmart.com/favicon.ico",
    status: "inactive",
    badge: "Pagamentos",
  },
];

export default function IntegracoesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrações"
        description="Conecte sua plataforma a serviços externos de pagamentos e marketing."
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const isComingSoon = integration.status === "coming_soon";

          const CardContent = (
            <Card className={`h-full transition-all ${isComingSoon ? "opacity-75" : "hover:-translate-y-1 hover:shadow-lg"}`}>
              <Card.Header className="flex flex-row items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-background-secondary border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={integration.logo}
                    alt={`${integration.name} logo`}
                    className="size-6 object-contain grayscale"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://via.placeholder.com/24";
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Card.Title className="text-base">{integration.name}</Card.Title>
                    {isComingSoon ? (
                      <Chip size="sm" variant="soft" color="warning" className="text-[10px]">Em breve</Chip>
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

          if (isComingSoon) {
            return (
              <div key={integration.slug} className="cursor-not-allowed">
                {CardContent}
              </div>
            );
          }

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
