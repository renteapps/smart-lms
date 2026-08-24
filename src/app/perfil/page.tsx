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
import { AiCreditsCard } from "@/components/profile/AiCreditsCard";
import { StudentProfileTestsSection } from "@/components/profile/StudentProfileTestsSection";
import { getAiCreditBalance } from "@/lib/aiCredits";
import { requireUser } from "@/lib/supabase/auth";
import { getAccessibleProfileTests, getMyProfileTestResults, getProfileTests } from "@/lib/data/profileTests";
import { LearningStats } from "./LearningStats";
import { CurrentStageCard } from "./CurrentStageCard";

export const metadata: Metadata = {
  title: "Meu Perfil",
  description: "Gerencie seu perfil e suas preferências de aprendizagem.",
};

export default async function PerfilPage() {
  const { supabase, user } = await requireUser();
  const aiCreditBalance = await getAiCreditBalance(supabase);
  
  const [profileTestResults, allProfileTests] = await Promise.all([
    getMyProfileTestResults(supabase, user.id),
    getProfileTests(supabase, true), // onlyPublished = true
  ]);
  const availableTests = await getAccessibleProfileTests(supabase, user.id, allProfileTests);

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

        {/* No mobile, o resumo (foto, nome) aparece no topo. A edição de dados logo abaixo. Os cards secundários (créditos, etapa) ficam pro final. */}
        <div className="mb-6 block lg:hidden">
          <ProfileSummary />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-6 lg:mt-12 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-5 lg:sticky lg:top-[100px]" aria-label="Resumo do perfil">
            <div className="hidden lg:block">
              <ProfileSummary />
            </div>

            <AiCreditsCard balance={aiCreditBalance} />

            <CurrentStageCard />
          </aside>

          <div>
            <section aria-labelledby="profile-data-title">
              <h2 id="profile-data-title" className="sr-only">
                Dados e preferências
              </h2>
              <ProfileEditor />
            </section>

            {/* Profile Tests Result Section */}
            <StudentProfileTestsSection 
              completedResults={profileTestResults} 
              availableTests={availableTests} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
