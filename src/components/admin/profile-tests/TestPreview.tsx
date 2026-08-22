'use client';

import React, { useState } from 'react';
import { ProfileTest, ProfileCategory } from '@/types/profileTest';
import { X, CheckCircle2, RotateCcw, Award, Play, BarChart3 } from 'lucide-react';
import { ArrowRight02Icon } from '@/components/ui/arrow-right-02';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Modal } from '@heroui/react';

interface TestPreviewProps {
  test: ProfileTest;
  onClose: () => void;
}

export const TestPreview: React.FC<TestPreviewProps> = ({ test, onClose }) => {
  // -1 = Start Screen, 0 to N-1 = Questions, N = Result
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> optionId
  
  const [resultCategory, setResultCategory] = useState<ProfileCategory | null>(null);
  const [categoryPercentages, setCategoryPercentages] = useState<{ category: ProfileCategory, percentage: number }[] | null>(null);

  const totalQuestions = test.questions.length;

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers({ ...answers, [questionId]: optionId });
  };

  const handleNext = () => {
    if (currentStep < totalQuestions - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      calculateResult();
      setCurrentStep(totalQuestions); // Move to results step for animation tracking
    }
  };

  const calculateResult = () => {
    const categoryTotals: Record<string, number> = {};

    // Initialize
    test.categories.forEach((cat) => {
      categoryTotals[cat.id] = 0;
    });

    // Sum scores
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

    // Sort categories by score
    const sortedCategories = test.categories.map(cat => {
      const score = categoryTotals[cat.id] || 0;
      const percentage = totalPointsAwarded > 0 ? Math.round((score / totalPointsAwarded) * 100) : 0;
      return {
        category: cat,
        score,
        percentage
      };
    }).sort((a, b) => b.score - a.score);

    const winningCat = sortedCategories[0]?.category || test.categories[0];
    
    setResultCategory(winningCat);
    setCategoryPercentages(sortedCategories.map(item => ({ category: item.category, percentage: item.percentage })));

    // Fire confetti effect
    setTimeout(async () => {
      try {
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: [winningCat?.color || '#3B82F6', '#FFFFFF', '#F59E0B']
        });
      } catch {
        // Ignore if confetti fails
      }
    }, 400); // slight delay to wait for animation
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentStep(-1);
    setResultCategory(null);
    setCategoryPercentages(null);
  };

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  const isPercentageResult = test.resultType === 'percentage';

  return (
    <Modal.Root isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" className="h-[90vh] max-w-2xl p-0 sm:h-[80vh]">
          <Modal.Dialog className="relative flex h-full flex-col overflow-hidden rounded-4xl p-0">

        {/* Top Header */}
        <div className="bg-surface/80 backdrop-blur-md border-b border-border/40 p-4 sm:p-6 flex items-center justify-between z-10 shrink-0">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-accent bg-accent/10 px-2.5 py-0.5 rounded-full mb-1 inline-block">
              Simulador do Aluno
            </span>
            <h2 className="font-display font-black text-lg text-foreground leading-tight truncate max-w-[200px] sm:max-w-md">
              {test.title || 'Teste sem título'}
            </h2>
          </div>
          <Button isIconOnly variant="ghost" size="sm" aria-label="Fechar preview" className="shrink-0 rounded-full" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="flex-1 relative overflow-hidden bg-background">
          <AnimatePresence mode="wait" custom={1}>
            
            {/* --- START SCREEN --- */}
            {currentStep === -1 && (
              <motion.div
                key="start"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                className="absolute inset-0 flex flex-col h-full overflow-y-auto"
              >
                {test.coverUrl ? (
                  <div className="h-48 sm:h-64 w-full shrink-0 relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent z-10" />
                    <img src={test.coverUrl} alt={test.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-24 shrink-0 bg-gradient-to-br from-primary/20 to-accent-cyan/10" />
                )}
                
                <div className="px-6 pb-12 pt-6 sm:px-12 flex-1 flex flex-col z-20 relative -mt-12 sm:-mt-20">
                  <div className="bg-surface border border-border/50 shadow-xl rounded-3xl p-6 sm:p-8 flex-1 flex flex-col justify-center items-center text-center space-y-6">
                    <div className="w-16 h-16 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-sm mb-2">
                      🎯
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-display font-black text-foreground mb-4">
                        {test.title || 'Teste de Perfil'}
                      </h1>
                      <p className="text-foreground leading-relaxed text-sm sm:text-base">
                        {test.description || 'Descubra mais sobre o seu perfil comportamental respondendo a este teste rápido e intuitivo.'}
                      </p>
                    </div>

                    <div className="pt-6 w-full max-w-sm">
                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        className="gap-2 rounded-2xl py-4 text-lg shadow-lg shadow-accent/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/30"
                        onClick={handleNext}
                      >
                        <Play className="size-5 fill-current" aria-hidden="true" />
                        Iniciar Teste
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- QUESTION SCREENS --- */}
            {currentStep >= 0 && currentStep < totalQuestions && (
              <motion.div
                key={`q-${currentStep}`}
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                className="absolute inset-0 flex flex-col h-full overflow-y-auto"
              >
                <div className="px-6 py-8 sm:px-12 sm:py-12 max-w-2xl mx-auto w-full space-y-8 pb-32">
                  
                  {/* Progress */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-end text-muted">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Pergunta {currentStep + 1} de {totalQuestions}
                      </span>
                      <span className="text-sm font-black text-accent">
                        {Math.round(((currentStep + 1) / totalQuestions) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-border/40 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-accent h-full transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${((currentStep + 1) / totalQuestions) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Question Title */}
                  <h3 className="text-2xl sm:text-3xl font-display font-black text-foreground leading-tight">
                    {test.questions[currentStep].text}
                  </h3>

                  {/* Options */}
                  <div className="space-y-3 pt-4">
                    {test.questions[currentStep].options.map((opt) => {
                      const isSelected = answers[test.questions[currentStep].id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => handleSelectOption(test.questions[currentStep].id, opt.id)}
                          className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 group ${
                            isSelected
                              ? 'border-accent bg-accent/5 shadow-md shadow-accent/5'
                              : 'border-border/60 hover:border-accent/40 bg-surface hover:bg-background-secondary'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'border-accent bg-accent text-accent-foreground' : 'border-border/80 group-hover:border-accent/50'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                          </div>
                          <span className={`text-base leading-relaxed transition-colors ${isSelected ? 'text-foreground font-bold' : 'text-foreground font-medium'}`}>
                            {opt.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fixed Footer CTA */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-bg via-bg to-transparent">
                  <div className="max-w-2xl mx-auto flex justify-end">
                    <Button
                      variant="primary"
                      size="lg"
                      isDisabled={!answers[test.questions[currentStep].id]}
                      className="gap-2 rounded-full px-8 py-4 shadow-lg shadow-accent/20 hover:-translate-y-1 hover:shadow-xl"
                      onClick={handleNext}
                    >
                      <span className="text-sm">
                        {currentStep < totalQuestions - 1 ? 'Próxima Pergunta' : 'Finalizar Teste'}
                      </span>
                      <ArrowRight02Icon size={20} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- RESULT SCREEN --- */}
            {currentStep === totalQuestions && resultCategory && (
              <motion.div
                key="result"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
                className="absolute inset-0 flex flex-col h-full overflow-y-auto bg-surface"
              >
                <div className="px-6 py-12 sm:px-12 sm:py-16 max-w-2xl mx-auto w-full flex flex-col items-center text-center space-y-8">
                  
                  <div className="space-y-4 w-full">
                    <span className="text-xs font-bold text-muted uppercase tracking-widest block animate-pulse">
                      Análise Concluída
                    </span>
                    
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
                      className="w-28 h-28 mx-auto rounded-4xl flex items-center justify-center text-6xl shadow-xl border-4 border-surface"
                      style={{ backgroundColor: `${resultCategory.color}20`, color: resultCategory.color, outline: `2px solid ${resultCategory.color}` }}
                    >
                      {resultCategory.emoji}
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <span className="text-sm font-bold text-muted uppercase tracking-wider block mb-2">
                      Seu Perfil Dominante é:
                    </span>
                    <h3 className="text-4xl sm:text-5xl font-display font-black leading-tight" style={{ color: resultCategory.color }}>
                      {resultCategory.name}
                    </h3>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="w-full space-y-6"
                  >
                    {/* PERCENTAGE DIAGNOSTIC SECTION */}
                    {isPercentageResult && categoryPercentages && (
                      <div className="bg-background-secondary border border-border/50 rounded-3xl p-6 sm:p-8 space-y-5">
                        <h4 className="font-bold text-sm text-foreground uppercase tracking-wide flex items-center gap-2 justify-center mb-6">
                          <BarChart3 className="w-5 h-5 text-accent" />
                          Seu Diagnóstico Completo
                        </h4>
                        
                        <div className="space-y-4">
                          {categoryPercentages.map((item, index) => (
                            <div key={item.category.id} className="space-y-1.5 relative group">
                              <div className="flex justify-between items-end text-sm">
                                <span className="font-bold flex items-center gap-1.5" style={{ color: item.category.color }}>
                                  <span>{item.category.emoji}</span>
                                  <span>{item.category.name}</span>
                                </span>
                                <span className="font-black text-foreground">{item.percentage}%</span>
                              </div>
                              <div className="w-full bg-border/40 rounded-full h-2.5 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.percentage}%` }}
                                  transition={{ duration: 1, delay: 0.8 + (index * 0.1), ease: "easeOut" }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: item.category.color }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ALWAYS SHOW THE DOMINANT CATEGORY DETAILS */}
                    <div className="bg-background-secondary border border-border/50 rounded-3xl p-6 sm:p-8 text-left space-y-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: resultCategory.color }} />
                      <h4 className="font-bold text-sm text-muted uppercase tracking-wide flex items-center gap-2">
                        <Award className="w-5 h-5" style={{ color: resultCategory.color }} />
                        Detalhes do seu perfil
                      </h4>
                      <p className="text-foreground leading-relaxed text-sm sm:text-base">
                        {resultCategory.description}
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="pt-4"
                  >
                    <Button
                      variant="outline"
                      size="lg"
                      className="gap-2 rounded-full px-8 py-4 hover:-translate-y-1 hover:shadow-md"
                      onClick={handleRestart}
                    >
                      <RotateCcw className="size-4" aria-hidden="true" />
                      Refazer o Teste
                    </Button>
                  </motion.div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
};
