"use client";

import React, { useState } from "react";
import { ProfileTest, ProfileCategory } from "@/types/profileTest";
import { CheckCircle2, RotateCcw, Award, ArrowRight, Play, BarChart3, SkipForward, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileTestRunnerProps {
  test: ProfileTest;
  config?: {
    allowSkipIfCompleted?: boolean;
    requireRetake?: boolean;
  };
  onComplete: () => void;
}

export default function ProfileTestRunner({ test, config, onComplete }: ProfileTestRunnerProps) {
  // Check if student previously completed test (simulated mock completion)
  const [hasPreviousCompletion, setHasPreviousCompletion] = useState<boolean>(
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

    setResultCategory(winningCat);
    setCategoryPercentages(sortedCategories.map((item) => ({ category: item.category, percentage: item.percentage })));

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
      <div className="bg-surface border border-purple-500/20 rounded-2xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Brain className="w-48 h-48 text-purple-500" />
        </div>

        <div className="max-w-xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-xs font-bold uppercase tracking-wider">
            <Brain className="w-4 h-4" />
            Teste de Perfil Já Realizado
          </div>

          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
            Você já concluiu este teste anteriormente!
          </h2>

          <p className="text-text-soft text-sm sm:text-base leading-relaxed">
            As configurações deste módulo permitem que você aproveite seu resultado prévio sem precisar responder às perguntas novamente.
          </p>

          {/* Previous Result Summary Card */}
          <div className="bg-canvas-soft border border-border rounded-2xl p-6 text-left space-y-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: previousCat.color }} />
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                style={{ backgroundColor: `${previousCat.color}20`, color: previousCat.color }}
              >
                {previousCat.emoji}
              </div>
              <div>
                <span className="text-xs font-bold text-text-soft uppercase tracking-wider block">
                  Seu Perfil Registrado
                </span>
                <h3 className="text-xl font-bold text-ink" style={{ color: previousCat.color }}>
                  {previousCat.name}
                </h3>
              </div>
            </div>
            <p className="text-xs text-text-soft leading-relaxed pt-1">
              {previousCat.description}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                onComplete();
              }}
              className="w-full sm:w-auto px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Usar Resultado Anterior & Avançar
            </button>

            <button
              onClick={handleRestart}
              className="w-full sm:w-auto px-6 py-3.5 bg-surface border border-border hover:bg-canvas-soft text-text-soft hover:text-ink rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Refazer o Teste Agora
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- EMBEDDED TEST RUNNER ---
  return (
    <div className="bg-surface border border-border rounded-2xl shadow-xl overflow-hidden min-h-[480px] flex flex-col relative">
      
      {/* Test Runner Bar */}
      <div className="bg-canvas border-b border-border p-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Avaliação de Perfil
          </span>
        </div>
        <span className="text-xs font-bold text-text-soft truncate max-w-[200px] sm:max-w-xs">
          {test.title}
        </span>
      </div>

      {/* Runner Body */}
      <div className="flex-1 p-6 sm:p-10 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          
          {/* Start Screen */}
          {currentStep === -1 && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-xl mx-auto text-center space-y-6"
            >
              <div className="w-16 h-16 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-sm">
                🎯
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-ink mb-3">
                  {test.title}
                </h2>
                <p className="text-text-soft text-sm sm:text-base leading-relaxed">
                  {test.description || "Responda a estas perguntas rápidas para descobrir o seu perfil comportamental."}
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setCurrentStep(0)}
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 mx-auto hover:-translate-y-0.5"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Iniciar Avaliação de Perfil
                </button>
              </div>
            </motion.div>
          )}

          {/* Question Screen */}
          {currentStep >= 0 && currentStep < totalQuestions && (
            <motion.div
              key={`q-${currentStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto w-full space-y-6"
            >
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-text-soft">
                  <span>Pergunta {currentStep + 1} de {totalQuestions}</span>
                  <span className="text-purple-600 dark:text-purple-400">
                    {Math.round(((currentStep + 1) / totalQuestions) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-canvas-soft rounded-full h-2 overflow-hidden border border-border/50">
                  <div
                    className="bg-purple-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${((currentStep + 1) / totalQuestions) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <h3 className="text-xl sm:text-2xl font-display font-extrabold text-ink leading-snug">
                {test.questions[currentStep].text}
              </h3>

              {/* Options */}
              <div className="space-y-3 pt-2">
                {test.questions[currentStep].options.map((opt) => {
                  const isSelected = answers[test.questions[currentStep].id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(test.questions[currentStep].id, opt.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        isSelected
                          ? "border-purple-500 bg-purple-500/5 shadow-sm"
                          : "border-border hover:border-purple-500/40 bg-surface-card hover:bg-surface-hover"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? "border-purple-500 bg-purple-500 text-white" : "border-border"
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-sm sm:text-base font-medium ${isSelected ? "text-ink font-bold" : "text-text-soft"}`}>
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Next CTA */}
              <div className="flex justify-end pt-4">
                <button
                  disabled={!answers[test.questions[currentStep].id]}
                  onClick={handleNext}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  <span>{currentStep < totalQuestions - 1 ? "Próxima Pergunta" : "Finalizar Teste"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Result Screen */}
          {currentStep === totalQuestions && resultCategory && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto text-center space-y-6"
            >
              <div className="space-y-3">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest block">
                  Diagnóstico Concluído
                </span>
                
                <div
                  className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl shadow-md border-2"
                  style={{ backgroundColor: `${resultCategory.color}20`, color: resultCategory.color, borderColor: resultCategory.color }}
                >
                  {resultCategory.emoji}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-text-soft uppercase tracking-wider block mb-1">
                  Seu Perfil Dominante é:
                </span>
                <h3 className="text-3xl sm:text-4xl font-display font-extrabold" style={{ color: resultCategory.color }}>
                  {resultCategory.name}
                </h3>
              </div>

              {/* Percentages if available */}
              {isPercentageResult && categoryPercentages && (
                <div className="bg-canvas-soft border border-border rounded-xl p-5 text-left space-y-3">
                  <h4 className="font-bold text-xs text-ink uppercase tracking-wide flex items-center gap-2 justify-center mb-3">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    Pontuação Detalhada
                  </h4>
                  {categoryPercentages.map((item) => (
                    <div key={item.category.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span style={{ color: item.category.color }}>{item.category.emoji} {item.category.name}</span>
                        <span className="text-ink">{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-border/40 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.category.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Description Card */}
              <div className="bg-canvas-soft border border-border rounded-xl p-5 text-left space-y-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: resultCategory.color }} />
                <h4 className="font-bold text-xs text-text-soft uppercase tracking-wide flex items-center gap-1.5">
                  <Award className="w-4 h-4" style={{ color: resultCategory.color }} />
                  Sobre o seu Perfil
                </h4>
                <p className="text-text-soft text-sm leading-relaxed">
                  {resultCategory.description}
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleRestart}
                  className="px-5 py-2.5 bg-surface border border-border hover:bg-canvas-soft text-text-soft hover:text-ink rounded-xl font-bold text-xs transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Refazer o Teste
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
