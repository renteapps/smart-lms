import Link from "next/link";
import { ArrowLeft, BookOpen, Compass } from "lucide-react";
import { buttonVariants } from "@heroui/react";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-76px)] items-center pt-[76px]">
      <div className="editorial-container grid items-center gap-12 py-14 lg:grid-cols-[1fr_0.8fr]">
        <div className="max-w-2xl">
          <p className="eyebrow">Erro 404</p>
          <h1 className="display-1 mt-3 text-foreground sm:text-6xl">
            Esta página saiu da trilha.
          </h1>
          <p className="lede mt-6 max-w-xl text-muted">
            O endereço pode ter mudado, mas sua jornada continua. Volte ao início ou encontre uma nova habilidade para praticar.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className={buttonVariants({
                variant: "primary",
                className: "min-h-12 gap-2 px-6",
              })}
            >
              <ArrowLeft className="size-4" aria-hidden="true" /> Voltar ao início
            </Link>
            <Link
              href="/cursos"
              className={buttonVariants({
                variant: "secondary",
                className: "min-h-12 gap-2 px-6",
              })}
            >
              <BookOpen className="size-4" aria-hidden="true" /> Explorar cursos
            </Link>
          </div>
        </div>

        <div className="relative mx-auto grid aspect-square w-full max-w-md place-items-center rounded-3xl border border-border bg-accent-soft/30">
          <div className="absolute inset-8 rounded-full border border-accent/10" />
          <div className="absolute inset-20 rounded-full border border-accent/15" />
          <span className="relative grid size-28 place-items-center rounded-2xl bg-surface text-accent shadow-elev-2">
            <Compass className="size-12" aria-hidden="true" />
          </span>
          <span className="absolute bottom-10 left-10 size-5 rounded-full bg-warning/70" />
          <span className="absolute right-12 top-14 size-3 rounded-full bg-success" />
        </div>
      </div>
    </div>
  );
}
