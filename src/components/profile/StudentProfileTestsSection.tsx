"use client";

import React from "react";
import { Button, buttonVariants } from "@heroui/react";
import Link from "next/link";
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { ProgressBar } from "@heroui/react/progress-bar";
import { Award, BarChart3, Brain } from "lucide-react";
import type { ProfileTest, ProfileCategory } from "@/types/profileTest";
import type { ProfileTestResult } from "@/lib/data/profileTests";

interface StudentProfileTestsSectionProps {
  completedResults: ProfileTestResult[];
  availableTests: ProfileTest[];
}

export function StudentProfileTestsSection({ completedResults, availableTests }: StudentProfileTestsSectionProps) {
  const pendingTests = availableTests.filter((test) => !completedResults.some((r) => r.testId === test.id));

  if (completedResults.length === 0 && pendingTests.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="profile-tests-title" className="mt-12 space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="size-5 text-accent" aria-hidden="true" />
        <h2 id="profile-tests-title" className="display-3 text-foreground">
          Diagnósticos de Perfil
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {completedResults.map((result) => {
          const test = availableTests.find((t) => t.id === result.testId);
          const category = test?.categories.find((c: ProfileCategory) => c.id === result.categoryId);
          
          const color = category?.color || "#8B5CF6";
          const emoji = category?.emoji || "✨";
          const description = category?.description || "Perfil diagnosticado.";

          return (
            <Card key={result.testId} className="flex flex-col gap-0 border-hairline overflow-hidden">
              <Card.Header className="bg-background-secondary border-b border-hairline px-5 py-4 flex flex-col items-start gap-1">
                 <p className="eyebrow text-muted truncate max-w-full">{result.testTitle || test?.title}</p>
                 <div className="flex items-center justify-between w-full mt-2">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="grid size-10 place-items-center rounded-xl text-xl"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        {emoji}
                      </span>
                      <div>
                        <p className="font-bold text-foreground font-display tracking-tight text-lg">{result.categoryName}</p>
                        <p className="text-xs text-muted">Realizado em {new Date(result.completedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                 </div>
              </Card.Header>

              <Card.Content className="p-5 flex-1 flex flex-col gap-4">
                <p className="text-sm text-muted leading-relaxed line-clamp-3">
                  {description}
                </p>

                {result.scores && result.scores.length > 0 && (
                  <div className="mt-auto space-y-3 pt-4 border-t border-hairline">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <BarChart3 className="size-3.5 text-muted" aria-hidden="true" /> Distribuição de perfil
                    </p>
                    <div className="space-y-2.5">
                      {result.scores.map((score) => {
                        const scoreCat = test?.categories.find((c: ProfileCategory) => c.id === score.categoryId);
                        const scoreColor = scoreCat?.color || "#cbd5e1";
                        return (
                          <ProgressBar key={score.categoryId} value={score.percentage} size="sm">
                            <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                              <span className="text-muted truncate mr-2">{scoreCat?.emoji || ''} {score.categoryName}</span>
                              <ProgressBar.Output className="text-foreground shrink-0" />
                            </div>
                            <ProgressBar.Track>
                               <ProgressBar.Fill style={{ backgroundColor: scoreColor }} />
                            </ProgressBar.Track>
                          </ProgressBar>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card.Content>
            </Card>
          );
        })}

        {pendingTests.length > 0 && (
          <Card className="flex flex-col gap-0 border-hairline border-dashed bg-background/50 justify-center items-center p-8 text-center min-h-[280px]">
             <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent mb-4">
                <Award className="size-6" aria-hidden="true" />
             </span>
             <h3 className="font-display text-lg font-bold text-foreground">Novos diagnósticos</h3>
             <p className="text-sm text-muted mt-2 max-w-xs mx-auto">
               Você tem {pendingTests.length} teste{pendingTests.length > 1 ? "s" : ""} de perfil disponível para realizar.
             </p>
             <div className="mt-6 flex flex-wrap justify-center gap-2">
                {pendingTests.slice(0, 2).map((test) => (
                  <Link key={test.id} href={`/diagnostico/${test.slug}`}>
                    <Chip variant="soft" color="accent" size="sm" className="cursor-pointer hover:bg-accent hover:text-white transition-colors">
                      {test.title}
                    </Chip>
                  </Link>
                ))}
             </div>
          </Card>
        )}
      </div>
    </section>
  );
}
