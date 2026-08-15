"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Building2,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  Lightbulb,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Route,
  Settings,
  User,
  Users,
  CreditCard,
  FileText,
} from "lucide-react";
import {
  Badge,
  Breadcrumbs,
  Button,
  Drawer,
  Label,
  SearchField,
  Tooltip,
  buttonVariants,
} from "@heroui/react";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Visão",
    links: [
      { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/admin/analises", icon: BarChart3, label: "Análises" },
    ],
  },
  {
    label: "Aprendizagem",
    links: [
      { href: "/admin/onboarding", icon: Route, label: "Onboarding & Trilhas" },
      { href: "/admin/cursos", icon: BookOpen, label: "Cursos" },
      { href: "/admin/testes-perfil", icon: ClipboardCheck, label: "Testes de Perfil" },
      { href: "/admin/pilulas", icon: Lightbulb, label: "Pílulas" },
      { href: "/admin/agentes", icon: Bot, label: "Agentes de IA" },
    ],
  },
  {
    label: "Pessoas",
    links: [
      { href: "/admin/users", icon: Users, label: "Usuários" },
      { href: "/admin/comentarios", icon: MessageSquare, label: "Comentários" },
      { href: "/admin/notificacoes", icon: Bell, label: "Notificações" },
    ],
  },
  {
    label: "Plataforma",
    links: [
      { href: "/admin/ajustes", icon: Settings, label: "Ajustes" },
    ],
  },
  {
    label: "Vendas & Corporativo",
    links: [
      { href: "/admin/business", icon: Building2, label: "Empresas (B2B)" },
      { href: "/admin/planos", icon: CreditCard, label: "Planos" },
      { href: "/admin/planos/assinaturas", icon: FileText, label: "Assinaturas" },
    ],
  },
];

const segmentLabels: Record<string, string> = {
  admin: "Admin",
  business: "Empresas & B2B",
  empresa: "Empresa",
  gestao: "Gestão Corporativa",
  analises: "Análises",
  curso: "Análise de Cursos",
  vendas: "Análise de Vendas",
  agentes: "Agentes de IA",
  alunos: "Análise de Alunos",
  onboarding: "Onboarding & Trilhas",
  cursos: "Cursos",
  users: "Usuários",
  pilulas: "Pílulas",
  comentarios: "Comentários",
  notificacoes: "Notificações",
  home: "Home Page",
  aparencia: "Aparência",
  "testes-perfil": "Testes de Perfil",
  ajustes: "Ajustes",
  menu: "Menu",
  editar: "Editar",
  modulos: "Módulos",
  configuracoes: "Configurações",
  aulas: "Aulas",
  planos: "Planos de Assinatura",
  integracoes: "Integrações",
  eduzz: "Eduzz",
  hotmart: "Hotmart",
  resend: "Resend",
  modelos: "Modelos de E-mail",
  logs: "Histórico de Envios",
  welcome: "Boas-vindas",
  password_reset: "Redefinição de Senha",
  course_enrollment: "Matrícula",
  certificate: "Certificado",
  subscription: "Assinatura",
  inactivity: "Reengajamento",
  notification: "Comunicado",
  emails: "Modelos de E-mail",
  assinaturas: "Assinaturas (Alunos)",
  historico: "Histórico de Conversas",
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const activeLink = navGroups
    .flatMap((g) => g.links.map((l) => l.href))
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .reduce((best, href) => (href.length > best.length ? href : best), "");

  const isActive = (href: string) => href === activeLink;
  const segments = pathname.split("/").filter(Boolean).slice(1);

  const labelFor = (segment: string) =>
    segmentLabels[segment] || (segment.length > 10 ? "Detalhes" : segment);

  const navContent = (compact = false) => (
    <nav className="flex-1 overflow-y-auto px-3 pb-5 pt-3" aria-label="Navegação administrativa">
      {navGroups.map((group) => (
        <div key={group.label} className="mb-5 last:mb-0">
          {compact ? (
            <span className="sr-only">{group.label}</span>
          ) : (
            <p className="eyebrow mb-2 px-3 text-[10px]">{group.label}</p>
          )}
          <div className="space-y-1">
            {group.links.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  title={compact ? link.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-lg text-sm font-semibold transition-colors",
                    compact ? "justify-center px-2" : "gap-3 px-3",
                    active
                      ? "bg-accent-soft text-accent-soft-foreground"
                      : "text-muted hover:bg-surface-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                  {compact ? <span className="sr-only">{link.label}</span> : <span>{link.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="admin-theme min-h-dvh bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface transition-[width] duration-[var(--duration-md)] md:flex",
          collapsed ? "w-20" : "w-[272px]",
        )}
      >
        <div
          className={cn(
            "flex h-[76px] items-center border-b border-border px-4",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          <BrandMark href="/admin" compact={collapsed} subtitle="Workspace" />
          {!collapsed && (
            <Tooltip.Root>
              <Tooltip.Trigger>
                <Button isIconOnly size="sm" variant="ghost" aria-label="Recolher menu" onClick={() => setCollapsed(true)}>
                  <PanelLeftClose className="size-4" aria-hidden="true" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>Recolher menu</Tooltip.Content>
            </Tooltip.Root>
          )}
        </div>

        {navContent(collapsed)}

        {collapsed && (
          <div className="mb-5 flex justify-center">
            <Tooltip.Root>
              <Tooltip.Trigger>
                <Button isIconOnly size="sm" variant="outline" aria-label="Expandir menu" onClick={() => setCollapsed(false)}>
                  <PanelLeftOpen className="size-4" aria-hidden="true" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>Expandir menu</Tooltip.Content>
            </Tooltip.Root>
          </div>
        )}
      </aside>

      <div
        className={cn(
          "min-h-dvh transition-[padding-left] duration-[var(--duration-md)]",
          collapsed ? "md:pl-20" : "md:pl-[272px]",
        )}
      >
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Drawer.Root isOpen={mobileOpen} onOpenChange={setMobileOpen}>
              <Button isIconOnly variant="outline" aria-label="Abrir navegação" className="md:hidden">
                <Menu className="size-5" aria-hidden="true" />
              </Button>
              <Drawer.Backdrop>
                <Drawer.Content placement="left" className="w-[min(90vw,320px)]">
                  <Drawer.Dialog aria-label="Navegação administrativa">
                    <Drawer.Header className="border-b border-border">
                      <BrandMark href="/admin" subtitle="Workspace" />
                    </Drawer.Header>
                    <Drawer.Body className="px-0">{navContent(false)}</Drawer.Body>
                  </Drawer.Dialog>
                </Drawer.Content>
              </Drawer.Backdrop>
            </Drawer.Root>

            <Breadcrumbs.Root className="hidden min-w-0 sm:flex">
              <Breadcrumbs.Item href="/admin">Admin</Breadcrumbs.Item>
              {segments.map((segment, index) => (
                <Breadcrumbs.Item
                  key={`${segment}-${index}`}
                  href={index === segments.length - 1 ? undefined : `/${["admin", ...segments.slice(0, index + 1)].join("/")}`}
                >
                  {labelFor(segment)}
                </Breadcrumbs.Item>
              ))}
            </Breadcrumbs.Root>

            <p className="truncate font-display text-base font-extrabold text-foreground sm:hidden">
              {labelFor(segments.at(-1) || "admin")}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <SearchField
              value={search}
              onChange={setSearch}
              className="hidden w-56 lg:block xl:w-72"
              aria-label="Buscar no painel"
            >
              <Label className="sr-only">Buscar no painel</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Buscar no painel" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>

            <Badge.Anchor>
              <Button isIconOnly variant="ghost" aria-label="Notificações">
                <Bell className="size-5" aria-hidden="true" />
              </Button>
              <Badge color="danger" size="sm" placement="top-right" aria-hidden="true" />
            </Badge.Anchor>

            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline", size: "md" }), "hidden gap-2 sm:inline-flex")}
            >
              <span className="grid size-6 place-items-center rounded-md bg-accent-soft text-accent-soft-foreground">
                <User className="size-3.5" aria-hidden="true" />
              </span>
              <span className="hidden xl:inline">Ver plataforma</span>
              <span className="xl:hidden sr-only">Ver plataforma</span>
            </Link>
          </div>
        </header>

        <main className="admin-container px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
