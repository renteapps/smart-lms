"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, FileText, Home, Menu, Route, Search, User } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { BrandMark } from "./BrandMark";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Início", icon: Home },
  { href: "/cursos", label: "Cursos", icon: BookOpen },
  { href: "/minha-trilha", label: "Minha Trilha", icon: Route },
  { href: "/blog", label: "Insights", icon: FileText },
  { href: "/notas", label: "Anotações", icon: FileText },
];

export default function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-[var(--duration-md)]",
        isScrolled
          ? "border-border/90 bg-background/94 shadow-[0_8px_30px_rgb(23,32,51,0.05)] backdrop-blur-xl"
          : "border-transparent bg-background/80 backdrop-blur-md"
      )}
    >
      <div className="editorial-container flex h-[76px] items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-9">
          <BrandMark />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "relative rounded-[10px] px-3 py-2 text-sm font-semibold",
                  isActive(link.href)
                    ? "bg-primary-pale text-primary-active"
                    : "text-text-soft hover:bg-surface-hover hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/cursos" aria-label="Buscar conteúdos" className="flex h-11 items-center gap-2 rounded-[12px] px-3 text-text-soft hover:bg-surface-hover hover:text-ink xl:min-w-44 xl:border xl:border-border xl:bg-surface xl:shadow-sm">
            <Search className="h-5 w-5" />
            <span className="hidden text-sm font-semibold xl:inline">Buscar conteúdos</span>
          </Link>
          <div className="grid h-11 w-11 place-items-center rounded-[12px] text-text-soft hover:bg-surface-hover hover:text-ink">
            <NotificationBell />
          </div>
          <Link
            href="/perfil"
            aria-label="Abrir perfil"
            aria-current={isActive("/perfil") ? "page" : undefined}
            className={cn(
              "hidden h-11 items-center gap-2 rounded-[12px] border px-2 pr-3 text-sm font-semibold shadow-sm sm:flex",
              isActive("/perfil")
                ? "border-primary/20 bg-primary-pale text-primary-active"
                : "border-border bg-surface text-ink hover:border-primary/30"
            )}
          >
            <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-primary-pale text-primary">
              <User className="h-4 w-4" />
            </span>
            <span className="hidden xl:inline">Meu perfil</span>
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={<button aria-label="Abrir menu" className="grid h-11 w-11 place-items-center rounded-[12px] text-ink hover:bg-surface-hover lg:hidden" />}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(88vw,360px)] border-l border-border bg-background p-0">
              <div className="border-b border-border p-6">
                <BrandMark />
                <SheetTitle className="sr-only">Menu principal</SheetTitle>
                <SheetDescription className="mt-5 text-sm leading-6 text-text-soft">
                  Aprenda no seu ritmo e acompanhe cada passo da sua evolução.
                </SheetDescription>
              </div>
              <nav className="flex flex-1 flex-col gap-1 p-4" aria-label="Menu móvel">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={isActive(link.href) ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-[12px] px-4 text-base font-semibold",
                        isActive(link.href) ? "bg-primary-pale text-primary-active" : "text-text-soft hover:bg-surface-hover hover:text-ink"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-border p-5">
                <Link href="/perfil" onClick={() => setMobileOpen(false)} className="flex min-h-12 w-full items-center gap-3 rounded-[12px] bg-surface px-4 text-left font-semibold text-ink shadow-sm">
                  <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-primary-pale text-primary"><User className="h-4 w-4" /></span>
                  Acessar meu perfil
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
