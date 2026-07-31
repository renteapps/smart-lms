import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";

export default function CtaBand() {
  return (
    <section className="editorial-container py-12 sm:py-18">
      <div className="relative overflow-hidden rounded-[14px] bg-ink p-7 text-white shadow-[var(--shadow-card)] sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:p-12">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[48px] border-white/5" aria-hidden="true" />
        <div className="max-w-2xl">
          <span className="grid h-12 w-12 place-items-center rounded-[15px] bg-white/10 text-white"><Route className="h-5 w-5" /></span>
          <h2 className="mt-6 text-3xl font-extrabold tracking-[-0.04em] md:text-4xl">
            Um próximo passo feito para você.
          </h2>
          <p className="mt-4 text-lg leading-8 text-white/70">
            Responda algumas perguntas e receba uma trilha que combina seus objetivos, desafios e ritmo.
          </p>
        </div>
        <Link href="/onboarding" className="relative mt-7 inline-flex min-h-12 shrink-0 items-center gap-2 rounded-[13px] bg-white px-6 font-bold text-ink hover:bg-primary-pale lg:mt-0">Montar minha trilha <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </section>
  );
}
