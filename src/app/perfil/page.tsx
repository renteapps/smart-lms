import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Flame,
  Route,
  Sparkles,
} from "lucide-react";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { ProfileSummary } from "@/components/profile/ProfileSummary";

export const metadata: Metadata = {
  title: "Meu perfil | Smart LMS",
  description: "Gerencie seu perfil e suas preferências de aprendizagem no Smart LMS.",
};

const learningStats = [
  { label: "Aulas concluídas", value: "18", icon: BookOpenCheck, tone: "bg-primary-pale text-primary-active" },
  { label: "Tempo de estudo", value: "6h 40min", icon: Clock3, tone: "bg-accent-sage/15 text-positive" },
  { label: "Sequência atual", value: "7 dias", icon: Flame, tone: "bg-accent-orange/12 text-accent-orange" },
];

export default function PerfilPage() {
  return (
    <div className="pt-[76px]">
      <section className="border-b border-border bg-primary-pale/35">
        <div className="editorial-container grid gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-surface px-3 py-1.5 text-xs font-bold text-primary-active shadow-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Seu espaço
            </div>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.04] tracking-[-0.05em] text-ink sm:text-5xl">
              Meu perfil
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-text-soft sm:text-lg">
              Mantenha seus dados atualizados e ajuste a experiência para aprender no seu ritmo.
            </p>
          </div>

          <Link
            href="/minha-trilha"
            className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-[12px] border border-border bg-surface px-4 text-sm font-bold text-ink shadow-sm hover:border-primary/30 hover:text-primary-active"
          >
            Ver minha trilha <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="editorial-container py-8 sm:py-12">
        <section aria-labelledby="learning-summary-title">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Sua evolução</p>
              <h2 id="learning-summary-title" className="mt-1.5 text-2xl font-extrabold tracking-[-0.035em] text-ink">
                Um pouco de cada vez, sempre em frente.
              </h2>
            </div>
            <span className="hidden items-center gap-2 text-sm font-bold text-positive sm:flex">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Meta semanal em dia
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {learningStats.map(({ label, value, icon: Icon, tone }) => (
              <article key={label} className="editorial-card flex items-center gap-4 p-5">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[13px] ${tone}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-text-mute">{label}</p>
                  <p className="mt-0.5 font-display text-xl font-extrabold tracking-[-0.025em] text-ink">{value}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-5 lg:sticky lg:top-[100px]">
            <ProfileSummary />

            <div className="editorial-card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-accent-sage/15 text-positive">
                  <Route className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-text-mute">Etapa atual</p>
                  <p className="font-bold text-ink">Comunicação consciente</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs font-semibold text-text-soft">
                <span>Progresso</span>
                <span className="text-primary-active">68%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas-soft" role="progressbar" aria-label="Progresso na etapa atual" aria-valuenow={68} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full w-[68%] rounded-full bg-primary" />
              </div>
            </div>
          </aside>

          <ProfileEditor />
        </div>
      </div>
    </div>
  );
}
