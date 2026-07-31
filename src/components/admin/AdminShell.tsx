"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  BookOpen,
  ChevronRight,
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
  Search,
  User,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navGroups = [
  { label: "Visão", links: [{ href: "/admin", icon: LayoutDashboard, label: "Dashboard" }] },
  {
    label: "Aprendizagem",
    links: [
      { href: "/admin/onboarding", icon: Route, label: "Onboarding & Trilhas" },
      { href: "/admin/cursos", icon: BookOpen, label: "Cursos" },
      { href: "/admin/testes-perfil", icon: ClipboardCheck, label: "Testes de Perfil" },
      { href: "/admin/pilulas", icon: Lightbulb, label: "Pílulas" },
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
      { href: "/admin/home", icon: Home, label: "Home Page" },
      { href: "/admin/aparencia", icon: Palette, label: "Aparência" },
    ],
  },
];

const segmentLabels: Record<string, string> = {
  admin: "Admin",
  onboarding: "Onboarding & Trilhas",
  cursos: "Cursos",
  users: "Usuários",
  pilulas: "Pílulas",
  comentarios: "Comentários",
  notificacoes: "Notificações",
  home: "Home Page",
  aparencia: "Aparência",
  "testes-perfil": "Testes de Perfil",
  editar: "Editar",
  modulos: "Módulos",
  configuracoes: "Configurações",
  aulas: "Aulas",
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => href === "/admin" ? pathname === href : pathname.startsWith(href);
  const segments = pathname.split("/").filter(Boolean).slice(1);

  const navContent = (compact = false) => (
    <nav className="flex-1 overflow-y-auto px-3 pb-5 pt-3" aria-label="Navegação administrativa">
      {navGroups.map((group) => (
        <div key={group.label} className="mb-5 last:mb-0">
          {!compact && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-mute">{group.label}</p>}
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
                    "flex min-h-11 items-center rounded-[11px] text-sm font-semibold",
                    compact ? "justify-center px-2" : "gap-3 px-3",
                    active ? "bg-primary-pale text-primary-active" : "text-text-soft hover:bg-surface-hover hover:text-ink"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!compact && <span>{link.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="admin-theme min-h-dvh bg-bg text-text">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface transition-[width] duration-[var(--duration-md)] md:flex", collapsed ? "w-20" : "w-[272px]")}>
        <div className={cn("flex h-[76px] items-center border-b border-border px-4", collapsed ? "justify-center" : "justify-between")}>
          <BrandMark href="/admin" compact={collapsed} subtitle="Workspace" />
          {!collapsed && <button onClick={() => setCollapsed(true)} aria-label="Recolher menu" className="grid h-10 w-10 place-items-center rounded-[11px] text-text-mute hover:bg-surface-hover hover:text-ink"><PanelLeftClose className="h-4 w-4" /></button>}
        </div>
        {navContent(collapsed)}
        {collapsed && <button onClick={() => setCollapsed(false)} aria-label="Expandir menu" className="mx-auto mb-5 grid h-10 w-10 place-items-center rounded-[11px] border border-border text-text-mute hover:bg-surface-hover hover:text-ink"><PanelLeftOpen className="h-4 w-4" /></button>}
      </aside>

      <div className={cn("min-h-dvh transition-[padding-left] duration-[var(--duration-md)]", collapsed ? "md:pl-20" : "md:pl-[272px]")}>
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between gap-4 border-b border-border bg-background/92 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger render={<button aria-label="Abrir navegação" className="grid h-11 w-11 place-items-center rounded-[12px] border border-border bg-surface md:hidden" />}><Menu className="h-5 w-5" /></SheetTrigger>
              <SheetContent side="left" className="w-[min(90vw,360px)] border-r border-border bg-surface p-0">
                <div className="flex h-[76px] items-center border-b border-border px-5"><BrandMark href="/admin" subtitle="Workspace" /></div>
                <SheetTitle className="sr-only">Navegação administrativa</SheetTitle>
                <SheetDescription className="sr-only">Acesse as áreas do painel administrativo.</SheetDescription>
                {navContent(false)}
              </SheetContent>
            </Sheet>

            <div className="hidden min-w-0 items-center gap-1.5 text-sm font-semibold text-text-mute sm:flex">
              <Link href="/admin" className="hover:text-primary-active">Admin</Link>
              {segments.map((segment, index) => (
                <span key={`${segment}-${index}`} className="flex min-w-0 items-center gap-1.5">
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  <span className={cn("truncate", index === segments.length - 1 && "text-ink")}>{segmentLabels[segment] || (segment.length > 10 ? "Detalhes" : segment)}</span>
                </span>
              ))}
            </div>
            <p className="truncate font-display text-base font-extrabold text-ink sm:hidden">{segmentLabels[segments.at(-1) || "admin"] || "Dashboard"}</p>
          </div>

          <div className="flex items-center gap-2">
            <label className="relative hidden lg:block">
              <span className="sr-only">Buscar no painel</span>
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-mute" />
              <input placeholder="Buscar no painel" className="h-10 w-56 rounded-[11px] border border-border bg-surface pl-10 pr-3 text-sm focus:border-primary focus:outline-none xl:w-72" />
            </label>
            <button aria-label="Notificações" className="relative grid h-11 w-11 place-items-center rounded-[12px] text-text-soft hover:bg-surface-hover hover:text-ink"><Bell className="h-5 w-5" /><span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-bg bg-negative" /></button>
            <Link href="/" aria-label="Ver plataforma" className="hidden min-h-11 items-center gap-2 rounded-[12px] border border-border bg-surface px-3 text-sm font-bold text-ink hover:border-primary/30 hover:text-primary-active sm:flex"><span className="grid h-7 w-7 place-items-center rounded-[9px] bg-primary-pale text-primary"><User className="h-4 w-4" /></span><span className="hidden xl:inline">Nohan</span></Link>
          </div>
        </header>

        <main className="admin-container px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
