"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, Bot, Building2, FileText, Home, LogIn, LogOut, Menu, Route, Search, User, UserPlus } from "lucide-react";
import { buttonVariants, Drawer } from "@heroui/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { NotificationBell } from "./NotificationBell";
import { BrandMark } from "./BrandMark";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  PROFILE_SAVED_EVENT,
  PROFILE_STORAGE_KEY,
  type ProfilePreferences,
} from "@/lib/profilePreferences";

export default function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { user, isAuthenticated, isLoading, signOut } = useAuth();

  const navLinks = [
    { href: "/", label: "Início", icon: Home },
    { href: "/cursos", label: "Cursos", icon: BookOpen },
    { href: "/minha-trilha", label: "Minha Trilha", icon: Route },
    { href: "/agentes", label: "Agentes", icon: Bot },
    { href: "/blog", label: "Insights", icon: FileText },
    { href: "/notas", label: "Anotações", icon: FileText },
  ];

  useEffect(() => {
    let frame: number | null = null;
    const handleScroll = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        const next = scrollY > 12;
        setIsScrolled((current) => current === next ? current : next);
      });
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (user?.user_metadata?.avatar_url) {
      setAvatarUrl(user.user_metadata.avatar_url);
    }
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.avatarUrl) {
          setAvatarUrl(parsed.avatarUrl);
        }
      } catch {
        // ignore
      }
    }

    const handleProfileSaved = (event: Event) => {
      const detail = (event as CustomEvent<ProfilePreferences>).detail;
      if (detail) {
        setAvatarUrl(detail.avatarUrl || null);
      }
    };

    window.addEventListener(PROFILE_SAVED_EVENT, handleProfileSaved);
    return () => window.removeEventListener(PROFILE_SAVED_EVENT, handleProfileSaved);
  }, [user]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  /*
   * Dentro da pílula os controles acompanham a curvatura da peça e perdem a
   * superfície opaca: dois materiais empilhados matam o vidro.
   */
  const controlRadius = isScrolled ? "rounded-full" : "rounded-lg";

  const userDisplayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Meu perfil";

  return (
    /*
     * No topo o header é uma faixa full-bleed com blur e opacidade reforçados;
     * ao rolar ele se recolhe numa pílula flutuante de liquid glass.
     */
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,padding-top,border-color,box-shadow] duration-[var(--duration-md)] ease-[var(--ease-precise)]",
        isScrolled
          ? "pointer-events-none border-b border-transparent bg-transparent pt-2 sm:pt-3"
          : "border-b border-border/40 bg-background/85 pt-0 backdrop-blur-xl shadow-xs",
      )}
      style={{
        WebkitBackdropFilter: isScrolled ? undefined : "blur(20px)",
      }}
    >
      <div
        className={cn(
          "editorial-container flex items-center justify-between gap-5",
          "transition-[height,max-width,border-radius,padding,background-color,box-shadow,border-color] duration-[var(--duration-md)] ease-[var(--spring)]",
          isScrolled
            ? /* 30px = metade da altura: pílula exata e, ao contrário de
                 `rounded-full` (infinito), um raio que dá para interpolar. */
              "pointer-events-auto liquid-glass h-[60px] max-w-[72rem] rounded-[30px] pl-4 pr-2 sm:pr-3"
            : "pointer-events-auto h-[76px] max-w-[80rem] rounded-none px-0",
        )}
        style={
          isScrolled
            ? {
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                backdropFilter: "blur(24px) saturate(180%)",
              }
            : undefined
        }
      >
        <div className="flex min-w-0 items-center gap-9">
          <BrandMark />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative px-3 py-2 text-sm font-semibold transition-colors",
                    controlRadius,
                    active
                      ? "text-accent-soft-foreground"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  {/*
                   * A pílula ativa desliza entre os itens em vez de piscar.
                   * `layoutId` compartilhado faz o framer-motion interpolar a
                   * posição; com reduced-motion vira uma troca simples.
                   */}
                  {active && (
                    <motion.span
                      aria-hidden="true"
                      className={cn("absolute inset-0 -z-10 bg-accent-soft", controlRadius)}
                      layoutId={reduceMotion ? undefined : "nav-active-pill"}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="underline-grow">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/busca"
            aria-label="Buscar conteúdos"
            className={cn(
              "icon-rotate press flex h-11 items-center gap-2 px-3 text-muted transition-colors hover:bg-surface-hover hover:text-foreground xl:min-w-44 xl:border",
              isScrolled ? "rounded-full" : "rounded-xl",
              isScrolled
                ? "xl:border-hairline xl:bg-surface/40"
                : "xl:border-border xl:bg-surface xl:shadow-surface",
            )}
          >
            <Search className="size-5" aria-hidden="true" />
            <span className="hidden text-sm font-semibold xl:inline">Buscar conteúdos</span>
          </Link>

          <NotificationBell />

          {/* Se estiver autenticado, exibe atalho de perfil */}
          {isAuthenticated ? (
            <Link
              href="/perfil"
              aria-label="Abrir perfil"
              aria-current={isActive("/perfil") ? "page" : undefined}
              className={cn(
                "press hidden h-11 items-center gap-2 border px-2 pr-3 text-sm font-semibold transition-colors sm:flex",
                isScrolled ? "rounded-full shadow-none" : "rounded-xl shadow-surface",
                isActive("/perfil")
                  ? "border-accent/20 bg-accent-soft text-accent-soft-foreground"
                  : "text-foreground hover:bg-surface-hover",
                !isActive("/perfil") &&
                  (isScrolled ? "border-hairline bg-surface/40" : "border-border bg-surface"),
              )}
            >
              <span
                className={cn(
                  "grid size-7 place-items-center bg-accent-soft text-accent-soft-foreground overflow-hidden shrink-0",
                  isScrolled ? "rounded-full" : "rounded-lg",
                )}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={userDisplayName} className="size-full object-cover" />
                ) : (
                  <User className="size-4" aria-hidden="true" />
                )}
              </span>
              <span className="hidden xl:inline truncate max-w-[120px]">{userDisplayName}</span>
            </Link>
          ) : (
            /* Se for visitante, exibe botões de Acessar e Criar Conta */
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/acessar"
                className={cn(
                  "press flex h-10 items-center gap-1.5 px-3 text-sm font-semibold text-muted hover:text-foreground transition-colors",
                  controlRadius
                )}
              >
                <LogIn className="size-4" aria-hidden="true" />
                <span>Entrar</span>
              </Link>

              <Link
                href="/criar-conta"
                className={cn(
                  buttonVariants({ variant: "primary", size: "sm" }),
                  "press h-10 px-4",
                  isScrolled ? "rounded-full" : "rounded-xl"
                )}
              >
                <span>Criar conta</span>
              </Link>
            </div>
          )}

          <Drawer.Root isOpen={mobileOpen} onOpenChange={setMobileOpen}>
            <Drawer.Trigger
              aria-label="Abrir menu"
              className={cn(
                "press grid size-11 place-items-center text-foreground transition-colors hover:bg-surface-hover lg:hidden",
                isScrolled ? "rounded-full" : "rounded-xl",
              )}
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  key={mobileOpen ? "aberto" : "fechado"}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: mobileOpen ? -90 : 90, opacity: 0 }}
                  initial={{ rotate: mobileOpen ? 90 : -90, opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.18 }}
                >
                  <Menu className="size-5" aria-hidden="true" />
                </motion.span>
              </AnimatePresence>
            </Drawer.Trigger>

            <Drawer.Backdrop>
              <Drawer.Content placement="right" className="w-[min(88vw,360px)]">
                <Drawer.Dialog>
                  <Drawer.Header className="gap-4">
                    <BrandMark />
                    <Drawer.Heading className="sr-only">Menu principal</Drawer.Heading>
                    <p className="text-sm leading-6 text-muted">
                      Aprenda no seu ritmo e acompanhe cada passo da sua evolução.
                    </p>
                  </Drawer.Header>

                  <Drawer.Body>
                    <nav className="flex flex-col gap-1" aria-label="Menu móvel">
                      {navLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            aria-current={isActive(link.href) ? "page" : undefined}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex min-h-12 items-center gap-3 rounded-xl px-4 text-base font-semibold transition-colors",
                              isActive(link.href)
                                ? "bg-accent-soft text-accent-soft-foreground"
                                : "text-muted hover:bg-surface-hover hover:text-foreground",
                            )}
                          >
                            <Icon className="size-5" aria-hidden="true" />
                            {link.label}
                          </Link>
                        );
                      })}
                    </nav>
                  </Drawer.Body>

                  <Drawer.Footer className="flex-col gap-2">
                    {isAuthenticated ? (
                      <>
                        <Link
                          href="/perfil"
                          onClick={() => setMobileOpen(false)}
                          className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 text-left font-semibold text-foreground shadow-surface transition-colors hover:bg-surface-hover"
                        >
                          <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground overflow-hidden shrink-0">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={userDisplayName} className="size-full object-cover" />
                            ) : (
                              <User className="size-4" aria-hidden="true" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{userDisplayName}</p>
                            <p className="text-xs text-muted">Acessar meu perfil</p>
                          </div>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setMobileOpen(false);
                            signOut();
                          }}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-danger hover:bg-danger-soft/30 transition-colors"
                        >
                          <LogOut className="size-4" aria-hidden="true" />
                          <span>Sair da conta</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2 w-full">
                        <Link
                          href="/acessar"
                          onClick={() => setMobileOpen(false)}
                          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 font-semibold text-foreground shadow-surface transition-colors hover:bg-surface-hover"
                        >
                          <LogIn className="size-4" aria-hidden="true" />
                          <span>Entrar no Smart LMS</span>
                        </Link>
                        <Link
                          href="/criar-conta"
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            buttonVariants({ variant: "primary" }),
                            "min-h-12 w-full flex items-center justify-center gap-2 rounded-xl font-semibold"
                          )}
                        >
                          <UserPlus className="size-4" aria-hidden="true" />
                          <span>Criar conta gratuita</span>
                        </Link>
                      </div>
                    )}
                  </Drawer.Footer>
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Backdrop>
          </Drawer.Root>
        </div>
      </div>
    </header>
  );
}
