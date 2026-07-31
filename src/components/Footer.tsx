import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "./BrandMark";

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
    <footer className="mt-20 border-t border-border bg-surface/70">
      <div className="editorial-container grid gap-12 py-14 md:grid-cols-[1.4fr_1fr] md:py-18">
        <div className="max-w-md">
          <BrandMark />
          <p className="mt-5 text-base leading-7 text-text-soft">
            Habilidades humanas não são teoria. São prática, reflexão e pequenas escolhas feitas todos os dias.
          </p>
          <Link href="/minha-trilha" className="mt-6 inline-flex items-center gap-2 font-bold text-primary-active hover:text-primary">
            Continuar minha evolução <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-bold text-ink">{group.title}</h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm font-medium text-text-soft hover:text-primary-active">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border/80">
        <div className="editorial-container flex flex-col gap-2 py-5 text-xs text-text-mute sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Smart LMS. Aprender também é humano.</p>
          <p>Privacidade · Termos de uso</p>
        </div>
      </div>
    </footer>
  );
}
