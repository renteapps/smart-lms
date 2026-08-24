'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, RotateCcw, BarChart3, Award, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileTest, ProfileCategory } from '@/types/profileTest';
import { ArrowRight02Icon } from '@/components/ui/arrow-right-02';
import Link from 'next/link';

interface TakeTestClientProps {
  test: ProfileTest;
  isPublicFlow: boolean;
}

export function TakeTestClient({ test, isPublicFlow }: TakeTestClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Calculate Progress
  const totalQuestions = test.questions?.length || 0;
  const progress = totalQuestions > 0 ? (Object.keys(answers).length / totalQuestions) * 100 : 0;

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 1000 : -1000, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 1000 : -1000, opacity: 0 }),
  };

  const handleNext = () => {
    if (currentStep < totalQuestions) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > -1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    
    // Auto-advance after short delay for better UX
    setTimeout(() => {
      if (currentStep < totalQuestions) {
         setCurrentStep(prev => prev + 1);
      }
    }, 400);
  };

  // Calculate Result Logic
  const results = useMemo(() => {
    if (currentStep !== totalQuestions || !test.questions || !test.categories) return null;

    const scores: Record<string, number> = {};
    test.categories.forEach(c => (scores[c.id] = 0));

    test.questions.forEach(q => {
      const selectedOptionId = answers[q.id];
      const option = q.options.find(o => o.id === selectedOptionId);
      if (option && option.categoryScores) {
        Object.entries(option.categoryScores).forEach(([catId, score]) => {
          if (scores[catId] !== undefined) {
            scores[catId] += score;
          }
        });
      }
    });

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

    const percentages = test.categories.map(cat => ({
      category: cat,
      score: scores[cat.id],
      percentage: totalScore > 0 ? Math.round((scores[cat.id] / totalScore) * 100) : 0,
    })).sort((a, b) => b.percentage - a.percentage);

    const winner = percentages[0]?.category;

    return { winner, percentages };
  }, [answers, currentStep, test]);

  const handleFinish = async () => {
    if (isPublicFlow) {
      // Store pending result and redirect to register
      localStorage.setItem(`pending_diagnostic_${test.slug}`, JSON.stringify(results));
      router.push(`/cadastro?next=/diagnostico/${test.slug}/resultado`);
    } else {
      // Save directly and redirect to results
      localStorage.setItem(`pending_diagnostic_${test.slug}`, JSON.stringify(results));
      router.push(`/diagnostico/${test.slug}/resultado`);
    }
  };

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden flex flex-col">
      {/* HEADER & PROGRESS */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-background-secondary z-50">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="absolute top-6 left-6 z-50">
        <Link href="/" className="p-3 bg-surface/80 backdrop-blur rounded-full border border-border/50 text-muted hover:text-foreground flex items-center justify-center transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </div>

      <div className="flex-1 relative w-full max-w-4xl mx-auto h-full flex flex-col">
        <AnimatePresence initial={false} custom={1}>
          
          {/* --- INTRO SCREEN --- */}
          {currentStep === -1 && (
            <motion.div
              key="intro"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
              className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 bg-bg"
            >
              <div className="max-w-2xl mx-auto text-center space-y-8 mt-12">
                {test.coverUrl && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-full aspect-video rounded-3xl overflow-hidden border border-border/40 shadow-2xl relative"
                  >
                    <img src={test.coverUrl} alt="Capa" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/20 to-transparent" />
                  </motion.div>
                )}

                <div className="space-y-4 relative z-10">
                  <motion.h1 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl sm:text-5xl md:text-6xl font-display font-black tracking-tight text-foreground"
                  >
                    {test.title}
                  </motion.h1>
                  <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg text-muted max-w-xl mx-auto leading-relaxed"
                  >
                    {test.description}
                  </motion.p>
                </div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="pt-8"
                >
                  <Button
                    variant="default"
                    size="lg"
                    className="gap-3 rounded-full px-10 py-7 text-lg font-bold shadow-xl shadow-accent/20 hover:-translate-y-1 hover:shadow-2xl transition-all"
                    onClick={handleNext}
                  >
                    Iniciar Avaliação
                    <ArrowRight02Icon size={24} aria-hidden="true" />
                  </Button>
                  <p className="text-xs text-muted mt-4 opacity-60">Leva menos de 3 minutos</p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* --- QUESTION SCREENS --- */}
          {currentStep > -1 && currentStep < totalQuestions && test.questions && (
            <motion.div
              key={`q-${currentStep}`}
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col pt-24 px-6 sm:px-12 bg-bg overflow-y-auto pb-32"
            >
              <div className="max-w-3xl mx-auto w-full space-y-10 mt-8">
                <div className="space-y-4">
                  <span className="text-sm font-bold text-accent uppercase tracking-widest block">
                    Pergunta {currentStep + 1} de {totalQuestions}
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-display font-black leading-tight text-foreground">
                    {test.questions[currentStep].text}
                  </h2>
                </div>

                <div className="space-y-3">
                  {test.questions[currentStep].options.map((opt) => {
                    const isSelected = answers[test.questions![currentStep].id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleOptionSelect(test.questions![currentStep].id, opt.id)}
                        className={`w-full text-left p-5 sm:p-6 rounded-2xl border-2 transition-all flex items-start gap-4 group ${
                          isSelected
                            ? 'border-accent bg-accent/5 shadow-[0_0_20px_rgb(var(--accent)/0.1)]'
                            : 'border-border/60 bg-surface hover:border-accent/40 hover:bg-background-secondary'
                        }`}
                      >
                        <div className={`w-6 h-6 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'border-accent bg-accent text-accent-foreground' : 'border-border/80 group-hover:border-accent/50'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                        </div>
                        <span className={`text-lg sm:text-xl leading-relaxed transition-colors ${isSelected ? 'text-foreground font-bold' : 'text-foreground font-medium'}`}>
                          {opt.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* --- FINISH SCREEN --- */}
          {currentStep === totalQuestions && (
            <motion.div
              key="finish"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
              className="absolute inset-0 flex flex-col justify-center items-center px-6 bg-bg"
            >
              <div className="text-center space-y-8 max-w-xl mx-auto">
                <div className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                
                <h2 className="text-4xl font-display font-black text-foreground">Análise Concluída!</h2>
                
                <p className="text-lg text-muted">
                  {isPublicFlow 
                    ? "Calculamos o seu perfil. Crie sua conta gratuitamente para ver o seu diagnóstico detalhado e salvar seu progresso."
                    : "Calculamos o seu perfil. Clique no botão abaixo para ver o seu diagnóstico detalhado."
                  }
                </p>

                <Button
                  variant="default"
                  size="lg"
                  className="w-full gap-2 rounded-full py-6 shadow-xl"
                  onClick={handleFinish}
                >
                  {isPublicFlow ? 'Ver meu Resultado' : 'Ver Diagnóstico Completo'}
                  <ArrowRight02Icon size={20} aria-hidden="true" />
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
