import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@heroui/styles";
import { Separator } from "@heroui/react/separator";
import { BrandMark } from "./BrandMark";
import { cn } from "@/lib/utils";

const footerGroups = [
  {
    title: "Aprender",
    links: [
      { label: "Todos os cursos", href: "/cursos" },
      { label: "Minha trilha", href: "/minha-trilha" },
      { label: "Anotações", href: "/notas" },
    ],
  },
  {
    title: "Descobrir",
    links: [
      { label: "Insights", href: "/blog" },
      { label: "Refazer onboarding", href: "/onboarding" },
      { label: "Painel administrativo", href: "/admin" },
    ],
  },
];

export default function Footer() {
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

        <div className="grid grid-cols-2 gap-8 sm:gap-12">
          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="eyebrow">{group.title}</h2>
              <ul className="mt-5 flex flex-col">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-muted transition-colors duration-[var(--duration-sm)] hover:text-foreground"
                    >
                      <span className="underline-grow">{link.label}</span>
                    </Link>
                  </li>
                ))}
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
