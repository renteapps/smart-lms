import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Route } from "lucide-react";
import { buttonVariants } from "@heroui/styles";
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { Label } from "@heroui/react/label";
import { ProgressBar } from "@heroui/react/progress-bar";
import { Rise } from "@/components/ui/Rise";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { ProfileSummary } from "@/components/profile/ProfileSummary";
import { LearningStats } from "./LearningStats";

export const metadata: Metadata = {
  title: "Meu perfil | Smart LMS",
  description: "Gerencie seu perfil e suas preferências de aprendizagem no Smart LMS.",
};

const CURRENT_STAGE_PROGRESS = 68;

export default function PerfilPage() {
  return (
    <div className="pt-[76px]">
      <section className="border-b border-hairline">
        <div className="editorial-container grid gap-8 py-14 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end">
          <Rise>
            <p className="eyebrow">Seu espaço</p>
            <h1 className="display-1 mt-3 text-foreground">Meu perfil</h1>
            <p className="lede mt-6">
              Mantenha seus dados atualizados e ajuste a experiência para aprender no seu ritmo.
            </p>
          </Rise>

          <Link href="/minha-trilha" className={buttonVariants({ variant: "outline" })}>
            Ver minha trilha <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="editorial-container py-10 sm:py-14">
        <section aria-labelledby="learning-summary-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Sua evolução</p>
              <h2
                id="learning-summary-title"
                className="display-3 mt-2 text-foreground"
              >
                Um pouco de cada vez, sempre em frente.
              </h2>
            </div>
            <Chip color="success" variant="soft" size="md">
              <CheckCircle2 className="size-3.5" aria-hidden="true" /> Meta semanal em dia
            </Chip>
          </div>

          <LearningStats />
        </section>

        <div className="mt-12 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-5 lg:sticky lg:top-[100px]" aria-label="Resumo do perfil">
            <ProfileSummary />

            <Card className="border-hairline">
              <Card.Content className="gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success-soft-foreground">
                    <Route className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted">Etapa atual</p>
                    <p className="truncate font-bold text-foreground">Comunicação consciente</p>
                  </div>
                </div>

                <ProgressBar value={CURRENT_STAGE_PROGRESS} color="accent" size="sm" data-numeric>
                  <Label className="text-xs font-semibold text-muted">Progresso</Label>
                  <ProgressBar.Output className="text-xs font-bold text-accent" />
                  <ProgressBar.Track>
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>
              </Card.Content>
            </Card>
          </aside>

          <section aria-labelledby="profile-data-title">
            <h2 id="profile-data-title" className="sr-only">
              Dados e preferências
            </h2>
            <ProfileEditor />
          </section>
        </div>
      </div>
    </div>
  );
}
