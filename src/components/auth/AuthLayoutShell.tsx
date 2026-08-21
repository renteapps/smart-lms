"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Card, Chip } from "@heroui/react";
import { Rise } from "@/components/ui/Rise";
import { useAppearance } from "@/contexts/AppearanceContext";
import { cn } from "@/lib/utils";

interface AuthLayoutShellProps {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children: React.ReactNode;
  footerText?: string;
  footerLinkText?: string;
  footerLinkHref?: string;
  sideTitle?: string;
  sideDescription?: string;
  sideBadge?: string;
}

export function AuthLayoutShell({
  title,
  subtitle,
  eyebrow = "Acesso seguro",
  children,
  footerText,
  footerLinkText,
  footerLinkHref,
  sideTitle = "Transforme conhecimento em prática real.",
  sideDescription = "Acesse suas trilhas personalizadas, converse com agentes de mentoria dedicados e acompanhe sua evolução contínua.",
  sideBadge,
}: AuthLayoutShellProps) {
  const { platformName } = useAppearance();
  const name = platformName || "Smart LMS";
  const resolvedBadge = sideBadge || `${name} 2.0`;
  return (
    <div className="relative min-h-screen flex flex-col justify-between pt-10 pb-16 sm:pt-14 sm:pb-20">
      <div className="editorial-container w-full max-w-[68rem]">
        {/* Top bar with back to home and Brand */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
            <span>Voltar ao início</span>
          </Link>
          <BrandMark />
        </div>

        {/* Main Grid: Form + Side Showcase */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
          {/* Form Side: Clean HeroUI Card */}
          <Rise className="w-full">
            <Card className="w-full border border-border bg-surface p-7 sm:p-9 shadow-surface rounded-2xl">
              <div className="mb-6 space-y-1.5">
                <p className="eyebrow">{eyebrow}</p>
                <h1 className="display-2 text-foreground font-extrabold tracking-tight">{title}</h1>
                <p className="text-sm text-muted leading-relaxed">{subtitle}</p>
              </div>

              {children}

              {footerText && footerLinkHref && footerLinkText && (
                <div className="mt-8 pt-6 border-t border-hairline text-center text-sm text-muted">
                  <span>{footerText} </span>
                  <Link
                    href={footerLinkHref}
                    className="font-bold text-accent hover:text-accent-hover hover:underline transition-colors ml-1"
                  >
                    {footerLinkText}
                  </Link>
                </div>
              )}
            </Card>
          </Rise>

          {/* Side Showcase: Value propositions & security assurance */}
          <aside className="hidden lg:flex flex-col justify-between space-y-6 rounded-2xl border border-hairline bg-surface-secondary/40 p-8">
            <div className="space-y-4">
              <Chip color="accent" variant="soft" size="sm">
                <Sparkles className="size-3.5 mr-1" aria-hidden="true" />
                {resolvedBadge}
              </Chip>
              <h2 className="display-3 text-foreground leading-snug font-bold">{sideTitle}</h2>
              <p className="text-sm text-muted leading-relaxed">{sideDescription}</p>
            </div>

            {/* Feature Highlights */}
            <ul className="space-y-3.5 pt-4 border-t border-hairline text-sm text-foreground">
              <li className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                </span>
                <span>Trilhas adaptativas sincronizadas com seu ritmo</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                </span>
                <span>Agentes de IA para feedback imediato e anotações inteligentes</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                </span>
                <span>Certificados reconhecidos e histórico de evolução</span>
              </li>
            </ul>

            {/* Security Notice */}
            <div className="rounded-xl border border-hairline bg-surface p-4 text-xs text-muted space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                <span>Ambiente Seguro e Protegido</span>
              </div>
              <p className="leading-relaxed">
                Seus dados de aprendizagem e credenciais são protegidos com criptografia de 256 bits e estão em total conformidade com a LGPD.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer Security Badges */}
      <div className="editorial-container mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Lock className="size-3.5" aria-hidden="true" /> Criptografia TLS de ponta a ponta
        </span>
        <span className="h-3 w-px bg-border" aria-hidden="true" />
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-success" aria-hidden="true" /> Sessões seguras com tokens protegidos
        </span>
        <span className="h-3 w-px bg-border" aria-hidden="true" />
        <span>{name} © {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}
