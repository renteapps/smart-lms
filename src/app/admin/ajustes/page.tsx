"use client";

import Link from "next/link";
import { Bot, Home, Palette, Menu as MenuIcon, Plug } from "lucide-react";
import { Card } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";

const settingsCards = [
  {
    href: "/admin/home",
    icon: Home,
    title: "Home Page",
    description: "Configure o banner e os módulos da página inicial.",
    tone: "bg-accent-soft text-accent-soft-foreground",
  },
  {
    href: "/admin/aparencia",
    icon: Palette,
    title: "Aparência",
    description: "Personalize cores, tipografia e identidade visual.",
    tone: "bg-success-soft text-success-soft-foreground",
  },
  {
    href: "/admin/menu",
    icon: MenuIcon,
    title: "Menu",
    description: "Configure os itens de navegação do menu lateral dos estudantes.",
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

export default function AjustesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Plataforma"
        title="Ajustes"
        description="Gerencie as configurações gerais, aparência e navegação da plataforma."
      />

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Opções de ajustes">
        {settingsCards.map(({ href, icon: Icon, title, description, tone }) => (
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
