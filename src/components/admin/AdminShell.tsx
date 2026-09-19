"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Building2,
  ClipboardCheck,
  LayoutDashboard,
  Lightbulb,
  Menu,
  MessageSquare,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  Route,
  Settings,
  User,
  Users,
  CreditCard,
  FileText,
  Sparkles,
  Coins,
  Globe,
  Mail,
  Navigation,
  Palette,
  Plug,
  Search,
} from "lucide-react";
import {
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
      { href: "/admin/aulas-personalizadas", icon: Sparkles, label: "Aulas personalizadas" },
      { href: "/admin/blog", icon: Newspaper, label: "Blog" },
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
    label: "Vendas & Corporativo",
    links: [
      { href: "/admin/business", icon: Building2, label: "Empresas (B2B)" },
      { href: "/admin/planos", icon: CreditCard, label: "Planos" },
      { href: "/admin/planos/assinaturas", icon: FileText, label: "Assinaturas" },
    ],
  },
  {
    label: "Plataforma",
    links: [
      { href: "/admin/ajustes", icon: Settings, label: "Ajustes" },
      { href: "/admin/aparencia", icon: Palette, label: "Aparência" },
      { href: "/admin/navegacao", icon: Navigation, label: "Navegação" },
      { href: "/admin/pages", icon: Globe, label: "Páginas" },
      { href: "/admin/chat", icon: MessageSquare, label: "Assistente IA" },
      { href: "/admin/credits", icon: Coins, label: "Créditos de IA" },
      { href: "/admin/integracoes", icon: Plug, label: "Integrações" },
      { href: "/admin/emails", icon: Mail, label: "Modelos de e-mail" },
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
  blog: "Blog",
  categorias: "Categorias",
  novo: "Novo",
  users: "Usuários",
  pilulas: "Pílulas",
  comentarios: "Comentários",
  notificacoes: "Notificações",
  home: "Home Page",
  pages: "Páginas",
  "public-home": "Home Pública",
  "no-products": "Sem Produtos",
  "testes-perfil": "Testes de Perfil",
  ajustes: "Ajustes",
  chat: "Assistente IA",
  credits: "Créditos de IA",
  navegacao: "Navegação",
  editar: "Editar",
  modulos: "Módulos",
  configuracoes: "Configurações",
  aulas: "Aulas",
  "aulas-personalizadas": "Aulas personalizadas",
  planos: "Planos",
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
  new: "Novo",
  matriculas: "Matrículas",
  "aulas-galeria": "Galeria de aulas",
  quiz: "Quiz",
  busca: "Busca",
  autores: "Autores",
  agendar: "Agendar",
  aparencia: "Aparência",
};

// Segmentos dinâmicos (uuid, número ou slug longo) viram "Detalhes".
const isDynamicSegment = (segment: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment) || /^\d+$/.test(segment) || segment.length > 24;

const prettifySegment = (segment: string) => {
  const text = segment.replace(/[-_]+/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const COLLAPSED_KEY = "admin-sidebar-collapsed";
let collapsedFallback = false;
const collapsedListeners = new Set<() => void>();

function subscribeCollapsed(listener: () => void) {
  collapsedListeners.add(listener);
  return () => {
    collapsedListeners.delete(listener);
  };
}

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return collapsedFallback;
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
  } catch {
    collapsedFallback = value; // sem storage: vale só nesta sessão
  }
  collapsedListeners.forEach((listener) => listener());
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const updateCollapsed = writeCollapsed;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (search.trim()) {
      router.push(`/admin/busca?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const activeLink = navGroups
    .flatMap((g) => g.links.map((l) => l.href))
    .filter((href) => pathname === href || pathname.startsWith(href + "/"))
    .reduce((best, href) => (href.length > best.length ? href : best), "");

  const isActive = (href: string) => href === activeLink;
  const segments = pathname.split("/").filter(Boolean).slice(1);

  const labelFor = (segment: string, parent?: string) => {
    if (segment === "new" && parent === "business") return "Nova empresa";
    if (segmentLabels[segment]) return segmentLabels[segment];
    return isDynamicSegment(segment) ? "Detalhes" : prettifySegment(segment);
  };

  const navContent = (compact = false) => (
    <nav className="flex-1 overflow-y-auto px-3 pb-5 pt-3" aria-label="Navegação administrativa">
      {navGroups.map((group) => (
        <div key={group.label} className="mb-5 last:mb-0">
          {compact ? (
            <span className="sr-only">{group.label}</span>
          ) : (
            <p className="eyebrow mb-2 px-3 text-3xs">{group.label}</p>
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
                <Button isIconOnly size="sm" variant="ghost" aria-label="Recolher menu" onClick={() => updateCollapsed(true)}>
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
                <Button isIconOnly size="sm" variant="outline" aria-label="Expandir menu" onClick={() => updateCollapsed(false)}>
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
                  {labelFor(segment, segments[index - 1])}
                </Breadcrumbs.Item>
              ))}
            </Breadcrumbs.Root>

            <p className="truncate font-display text-base font-bold text-foreground sm:hidden">
              {labelFor(segments.at(-1) || "admin", segments.at(-2))}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <SearchField
              value={search}
              onChange={setSearch}
              onSubmit={() => handleSearch()}
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

            <Link
              href="/admin/busca"
              aria-label="Buscar no painel"
              className={cn(buttonVariants({ variant: "ghost", isIconOnly: true }), "lg:hidden")}
            >
              <Search className="size-5" aria-hidden="true" />
            </Link>

            <Link
              href="/admin/notificacoes"
              aria-label="Notificações"
              className={buttonVariants({ variant: "ghost", isIconOnly: true })}
            >
              <Bell className="size-5" aria-hidden="true" />
            </Link>

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
