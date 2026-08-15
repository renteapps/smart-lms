"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button, Card, Chip, ProgressBar, Radio, RadioGroup, Separator } from "@heroui/react";
import { ArrowRight, Award, BarChart3, Brain, Play, RotateCcw, SkipForward } from "lucide-react";
import { ProfileTest, ProfileCategory } from "@/types/profileTest";
import { buildProfileTestResult, saveProfileTestResult } from "@/lib/profileTestStorage";
import { notifyTrailChanged } from "@/lib/useTrailStore";

interface ProfileTestRunnerProps {
  test: ProfileTest;
  config?: {
    allowSkipIfCompleted?: boolean;
    requireRetake?: boolean;
  };
  onComplete: () => void;
}

/**
 * Executor do teste de perfil embutido na aula.
 *
 * A cor de cada categoria vem do cadastro (é dado, não token do sistema), então
 * entra apenas como acento pontual — emoji, filete e barra. Título e texto
 * seguem `foreground`/`muted` para o contraste não depender de uma cor que o
 * admin pode trocar.
 */
export default function ProfileTestRunner({ test, config, onComplete }: ProfileTestRunnerProps) {
  const reduceMotion = useReducedMotion();

  // Check if student previously completed test (simulated mock completion)
  const [hasPreviousCompletion] = useState<boolean>(
    Boolean(config?.allowSkipIfCompleted && !config?.requireRetake && test.completionsCount && test.completionsCount > 0)
  );

  const [mode, setMode] = useState<'previous_result' | 'take_test'>(
    hasPreviousCompletion ? 'previous_result' : 'take_test'
  );

  // -1 = Start Screen, 0 to N-1 = Questions, N = Result Screen
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [resultCategory, setResultCategory] = useState<ProfileCategory | null>(
    test.categories[0] || null
  );
  const [categoryPercentages, setCategoryPercentages] = useState<{ category: ProfileCategory; percentage: number }[] | null>(null);

  const totalQuestions = test.questions.length;

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleNext = () => {
    if (currentStep < totalQuestions - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      calculateResult();
      setCurrentStep(totalQuestions);
    }
  };

  const calculateResult = () => {
    const categoryTotals: Record<string, number> = {};

    test.categories.forEach((cat) => {
      categoryTotals[cat.id] = 0;
    });

    let totalPointsAwarded = 0;
    test.questions.forEach((q) => {
      const selectedOptId = answers[q.id];
      if (selectedOptId) {
        const option = q.options.find((o) => o.id === selectedOptId);
        if (option && option.categoryScores) {
          Object.entries(option.categoryScores).forEach(([catId, points]) => {
            categoryTotals[catId] = (categoryTotals[catId] || 0) + points;
            totalPointsAwarded += points;
          });
        }
      }
    });

    const sortedCategories = test.categories
      .map((cat) => {
        const score = categoryTotals[cat.id] || 0;
        const percentage = totalPointsAwarded > 0 ? Math.round((score / totalPointsAwarded) * 100) : 0;
        return { category: cat, score, percentage };
      })
      .sort((a, b) => b.score - a.score);

    const winningCat = sortedCategories[0]?.category || test.categories[0];
    const percentages = sortedCategories.map((item) => ({ category: item.category, percentage: item.percentage }));

    setResultCategory(winningCat);
    setCategoryPercentages(percentages);

    /*
     * O resultado precisa sobreviver à tela. Antes ele só existia neste estado
     * local: a categoria vencedora era calculada, exibida e perdida no unmount —
     * o sinal de personalização mais forte da plataforma indo para o lixo.
     */
    if (winningCat) {
      saveProfileTestResult(buildProfileTestResult(test, winningCat, percentages));
      notifyTrailChanged();
    }

    // Trigger completion callback
    onComplete();

    // Fire confetti
    setTimeout(async () => {
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: [winningCat?.color || "#8B5CF6", "#FFFFFF", "#F59E0B"]
        });
      } catch {
        // Ignore fallback
      }
    }, 300);
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentStep(-1);
    setMode('take_test');
  };

  const isPercentageResult = test.resultType === 'percentage';

  // --- PREVIOUS RESULT SCREEN (WHEN SKIP ALLOWED & ALREADY DONE) ---
  if (mode === 'previous_result' && config?.allowSkipIfCompleted && !config?.requireRetake) {
    const previousCat = test.categories[0] || { name: 'Líder Visionário', emoji: '🚀', color: '#3B82F6', description: 'Perfil comportamental já diagnosticado.' };

    return (
      <Card className="gap-0 overflow-hidden p-0">
        <Card.Content className="px-6 py-10 sm:px-10 sm:py-14">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
            <Chip color="accent" variant="soft" size="sm">
              <Brain className="size-3.5" aria-hidden="true" />
              Teste de perfil já realizado
            </Chip>

            <div>
              <h2 className="display-3 text-foreground">Você já concluiu este teste anteriormente</h2>
              <p className="lede mx-auto mt-4">
                As configurações deste módulo permitem que você aproveite seu resultado prévio sem precisar responder às perguntas novamente.
              </p>
            </div>

            {/* Previous Result Summary Card */}
            <div className="relative w-full overflow-hidden rounded-xl border border-hairline bg-background-secondary p-6 text-left">
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: previousCat.color }} />
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-12 shrink-0 place-items-center rounded-xl text-2xl"
                  style={{ backgroundColor: `${previousCat.color}20` }}
                >
                  {previousCat.emoji}
                </span>
                <div className="min-w-0">
                  <p className="eyebrow">Seu perfil registrado</p>
                  <h3 className="mt-1 font-display text-xl font-bold tracking-[-0.02em] text-foreground">
                    {previousCat.name}
                  </h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted">{previousCat.description}</p>
            </div>

            {/* Action CTAs */}
            <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button variant="primary" onClick={() => onComplete()} className="w-full gap-2 sm:w-auto">
                <SkipForward className="size-4" aria-hidden="true" />
                Usar resultado anterior e avançar
              </Button>
              <Button variant="outline" onClick={handleRestart} className="w-full gap-2 sm:w-auto">
                <RotateCcw className="size-4" aria-hidden="true" />
                Refazer o teste agora
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>
    );
  }

  // --- EMBEDDED TEST RUNNER ---
  return (
    <Card className="flex min-h-[30rem] flex-col gap-0 overflow-hidden p-0">
      {/* Test Runner Bar */}
      <Card.Header className="flex-row items-center justify-between gap-4 border-b border-separator bg-background-secondary px-5 py-3.5 sm:px-7">
        <p className="eyebrow flex items-center gap-2 text-accent">
          <Brain className="size-4" aria-hidden="true" />
          Avaliação de perfil
        </p>
        <span className="max-w-[16rem] truncate text-xs font-semibold text-muted">{test.title}</span>
      </Card.Header>

      {/* Runner Body */}
      <Card.Content className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 sm:py-14">
        <AnimatePresence mode="wait">

          {/* Start Screen */}
          {currentStep === -1 && (
            <motion.div
              key="start"
              initial={reduceMotion ? false : { opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -15 }}
              className="mx-auto flex max-w-xl flex-col items-center gap-6 text-center"
            >
              <span aria-hidden="true" className="grid size-16 place-items-center rounded-2xl bg-accent-soft text-3xl">
                🎯
              </span>

              <div>
                <h2 className="display-3 text-foreground">{test.title}</h2>
                <p className="lede mx-auto mt-4">
                  {test.description || "Responda a estas perguntas rápidas para descobrir o seu perfil comportamental."}
                </p>
              </div>

              <Button variant="primary" size="lg" onClick={() => setCurrentStep(0)} className="press mt-2 gap-2">
                <Play className="size-5 fill-current" aria-hidden="true" />
                Iniciar avaliação de perfil
              </Button>
            </motion.div>
          )}

          {/* Question Screen */}
          {currentStep >= 0 && currentStep < totalQuestions && (
            <motion.div
              key={`q-${currentStep}`}
              initial={reduceMotion ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
              className="mx-auto w-full max-w-2xl"
            >
              {/* Progress Bar */}
              <ProgressBar
                value={((currentStep + 1) / totalQuestions) * 100}
                color="accent"
                size="sm"
                aria-label={`Pergunta ${currentStep + 1} de ${totalQuestions}`}
              >
                <div className="flex items-center justify-between gap-4 text-xs font-bold">
                  <span className="text-muted" data-numeric>
                    Pergunta {currentStep + 1} de {totalQuestions}
                  </span>
                  <ProgressBar.Output className="text-accent" />
                </div>
                <ProgressBar.Track className="mt-2">
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>

              {/* Question Text */}
              <h3 className="display-3 mt-8 text-foreground">{test.questions[currentStep].text}</h3>

              {/* Options */}
              <RadioGroup
                aria-label={test.questions[currentStep].text}
                value={answers[test.questions[currentStep].id] ?? null}
                onChange={(optionId) => handleSelectOption(test.questions[currentStep].id, optionId)}
                className="mt-7 gap-2.5"
              >
                {test.questions[currentStep].options.map((opt) => (
                  <Radio key={opt.id} value={opt.id} className="group w-full">
                    <Radio.Content className="min-h-14 w-full items-start rounded-xl border border-hairline bg-surface px-4 py-4 text-base transition-[border-color,background-color] duration-[var(--duration-md)] hover:border-accent/50 group-data-[selected]:border-accent group-data-[selected]:bg-accent-soft/60">
                      <Radio.Control className="mt-0.5">
                        <Radio.Indicator />
                      </Radio.Control>
                      <span className="text-left font-medium text-foreground group-data-[selected]:font-bold">
                        {opt.text}
                      </span>
                    </Radio.Content>
                  </Radio>
                ))}
              </RadioGroup>

              {/* Next CTA */}
              <div className="mt-8 flex justify-end">
                <Button
                  variant="primary"
                  isDisabled={!answers[test.questions[currentStep].id]}
                  onClick={handleNext}
                  className="gap-2"
                >
                  {currentStep < totalQuestions - 1 ? "Próxima pergunta" : "Finalizar teste"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Result Screen */}
          {currentStep === totalQuestions && resultCategory && (
            <motion.div
              key="result"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 text-center"
            >
              <div className="flex flex-col items-center gap-4">
                <p className="eyebrow text-accent">Diagnóstico concluído</p>
                <span
                  aria-hidden="true"
                  className="grid size-20 place-items-center rounded-2xl border-2 text-4xl shadow-elev-2"
                  style={{ backgroundColor: `${resultCategory.color}20`, borderColor: resultCategory.color }}
                >
                  {resultCategory.emoji}
                </span>
              </div>

              <div>
                <p className="eyebrow">Seu perfil dominante é</p>
                <h3 className="display-2 mt-2 text-foreground">{resultCategory.name}</h3>
              </div>

              {/* Percentages if available */}
              {isPercentageResult && categoryPercentages && (
                <div className="w-full rounded-xl border border-hairline bg-background-secondary p-5 text-left">
                  <p className="eyebrow flex items-center justify-center gap-2">
                    <BarChart3 className="size-4 text-accent" aria-hidden="true" />
                    Pontuação detalhada
                  </p>
                  <div className="mt-5 flex flex-col gap-4">
                    {categoryPercentages.map((item) => (
                      <ProgressBar
                        key={item.category.id}
                        value={item.percentage}
                        size="sm"
                        aria-label={item.category.name}
                      >
                        <div className="flex items-center justify-between gap-4 text-xs font-bold">
                          <span className="text-foreground">
                            <span aria-hidden="true">{item.category.emoji}</span> {item.category.name}
                          </span>
                          <ProgressBar.Output className="text-muted" />
                        </div>
                        <ProgressBar.Track className="mt-1.5">
                          <ProgressBar.Fill style={{ backgroundColor: item.category.color }} />
                        </ProgressBar.Track>
                      </ProgressBar>
                    ))}
                  </div>
                </div>
              )}

              {/* Description Card */}
              <div className="relative w-full overflow-hidden rounded-xl border border-hairline bg-background-secondary p-5 text-left">
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: resultCategory.color }} />
                <p className="eyebrow flex items-center gap-2">
                  <Award className="size-4" aria-hidden="true" style={{ color: resultCategory.color }} />
                  Sobre o seu perfil
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">{resultCategory.description}</p>
              </div>

              <Separator className="w-full" />

              <Button variant="outline" size="sm" onClick={handleRestart} className="gap-2">
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Refazer o teste
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </Card.Content>
    </Card>
  );
}
