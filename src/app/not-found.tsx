import Link from "next/link";
import { ArrowLeft, BookOpen, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-76px)] items-center pt-[76px]">
      <div className="editorial-container grid items-center gap-12 py-14 lg:grid-cols-[1fr_0.8fr]">
        <div className="max-w-2xl">
          <p className="eyebrow">Erro 404</p>
          <h1 className="mt-3 text-5xl font-extrabold leading-[1.02] tracking-[-0.06em] text-ink sm:text-7xl">Esta página saiu da trilha.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-text-soft">O endereço pode ter mudado, mas sua jornada continua. Volte ao início ou encontre uma nova habilidade para praticar.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[13px] bg-primary px-5 font-bold text-on-primary hover:bg-primary-active"><ArrowLeft className="h-4 w-4" /> Voltar ao início</Link>
            <Link href="/cursos" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[13px] border border-border bg-surface px-5 font-bold text-ink hover:border-primary/30 hover:text-primary-active"><BookOpen className="h-4 w-4" /> Explorar cursos</Link>
          </div>
        </div>

        <div className="relative mx-auto grid aspect-square w-full max-w-md place-items-center rounded-[14px] border border-border bg-primary-pale/55">
          <div className="absolute inset-8 rounded-full border border-primary/10" />
          <div className="absolute inset-20 rounded-full border border-primary/15" />
          <span className="relative grid h-28 w-28 place-items-center rounded-[12px] bg-surface text-primary shadow-[var(--shadow-card-hover)]"><Compass className="h-12 w-12" /></span>
          <span className="absolute bottom-10 left-10 h-5 w-5 rounded-full bg-accent-orange/70" />
          <span className="absolute right-12 top-14 h-3 w-3 rounded-full bg-accent-sage" />
        </div>
      </div>
    </div>
  );
}
