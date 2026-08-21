"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@heroui/styles";
import { Separator } from "@heroui/react/separator";
import { BrandMark } from "./BrandMark";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { isNavItemVisible, type NavFooterGroup } from "@/types/navigation";

/*
 * O rodapé segue sem ícones de propósito: o contraste entre a frase da marca e
 * uma lista sóbria de links é o que impede tudo de virar um bloco cinza. O
 * ícone configurado em cada item existe para o menu — aqui ele é ignorado.
 */
const groupGridClasses: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
};

export default function Footer({ groups }: { groups: NavFooterGroup[] }) {
  const { profileRole, isManager, isAuthenticated } = useAuth();
  const viewer = { isAuthenticated, isAdmin: profileRole === "admin", isManager };

  const visibleGroups = groups
    .map((group) => ({ ...group, items: group.items.filter((item) => isNavItemVisible(item, viewer)) }))
    .filter((group) => group.items.length > 0);

  return (
    <footer className="mt-24 border-t border-hairline bg-surface">
      <div className="editorial-container grid gap-14 py-16 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:gap-20 md:py-20">
        <div className="max-w-lg">
          <BrandMark />

          {/*
           * A frase da marca é o único bloco tipográfico grande do rodapé: o
           * contraste entre ela e os links é o que impede o rodapé de virar
           * uma lista cinza uniforme.
           */}
          <p className="display-3 mt-8 text-foreground">Habilidades humanas não são teoria.</p>
          <p className="mt-4 max-w-md text-base leading-7 text-muted">
            São prática, reflexão e pequenas escolhas feitas todos os dias.
          </p>

          <Link
            href="/minha-trilha"
            className={cn(buttonVariants({ variant: "tertiary" }), "icon-lift mt-7 -ml-3")}
          >
            Continuar minha evolução
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className={cn("grid gap-8 sm:gap-12", groupGridClasses[visibleGroups.length] ?? "grid-cols-2")}>
          {visibleGroups.map((group) => (
            <nav key={group.id} aria-label={group.title}>
              <h2 className="eyebrow">{group.title}</h2>
              <ul className="mt-5 flex flex-col">
                {group.items.map((item) => {
                  const className =
                    "inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-muted transition-colors duration-[var(--duration-sm)] hover:text-foreground";
                  return (
                    <li key={item.id}>
                      {item.external ? (
                        <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                          <span className="underline-grow">{item.label}</span>
                        </a>
                      ) : (
                        <Link href={item.href} className={className}>
                          <span className="underline-grow">{item.label}</span>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="editorial-container">
        <Separator />
      </div>

      <div className="editorial-container flex flex-col gap-2 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Smart LMS. Aprender também é humano.</p>
        <p>Privacidade · Termos de uso</p>
      </div>
    </footer>
  );
}
