'use client';

import React, { useState } from 'react';
import { ProfileTest, ProfileCategory } from '@/types/profileTest';
import { X, CheckCircle2, RotateCcw, Award, ArrowRight, Play, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 overflow-hidden">
      <div className="bg-bg border border-border/60 rounded-[2rem] max-w-2xl w-full h-[90vh] sm:h-[80vh] flex flex-col shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Top Header */}
        <div className="bg-surface/80 backdrop-blur-md border-b border-border/40 p-4 sm:p-6 flex items-center justify-between z-10 shrink-0">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mb-1 inline-block">
              Simulador do Aluno
            </span>
            <h2 className="font-display font-black text-lg text-ink-deep leading-tight truncate max-w-[200px] sm:max-w-md">
              {test.title || 'Teste sem título'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-mute hover:text-text rounded-full hover:bg-canvas-soft transition-colors shrink-0"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 relative overflow-hidden bg-canvas">
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
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-sm mb-2">
                      🎯
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-display font-black text-ink-deep mb-4">
                        {test.title || 'Teste de Perfil'}
                      </h1>
                      <p className="text-body-text leading-relaxed text-sm sm:text-base">
                        {test.description || 'Descubra mais sobre o seu perfil comportamental respondendo a este teste rápido e intuitivo.'}
                      </p>
                    </div>

                    <div className="pt-6 w-full max-w-sm">
                      <button
                        onClick={handleNext}
                        className="w-full bg-primary text-on-primary py-4 rounded-2xl font-bold text-lg hover:bg-primary-active transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        Iniciar Teste
                      </button>
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
                    <div className="flex justify-between items-end text-text-soft">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Pergunta {currentStep + 1} de {totalQuestions}
                      </span>
                      <span className="text-sm font-black text-primary">
                        {Math.round(((currentStep + 1) / totalQuestions) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-border/40 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${((currentStep + 1) / totalQuestions) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Question Title */}
                  <h3 className="text-2xl sm:text-3xl font-display font-black text-ink-deep leading-tight">
                    {test.questions[currentStep].text}
                  </h3>

                  {/* Options */}
                  <div className="space-y-3 pt-4">
                    {test.questions[currentStep].options.map((opt) => {
                      const isSelected = answers[test.questions[currentStep].id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectOption(test.questions[currentStep].id, opt.id)}
                          className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 group ${
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-md shadow-primary/5'
                              : 'border-border/60 hover:border-primary/40 bg-surface hover:bg-canvas-soft'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'border-primary bg-primary text-on-primary' : 'border-border/80 group-hover:border-primary/50'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                          <span className={`text-base leading-relaxed transition-colors ${isSelected ? 'text-ink-deep font-bold' : 'text-text font-medium'}`}>
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
                    <button
                      disabled={!answers[test.questions[currentStep].id]}
                      onClick={handleNext}
                      className="bg-primary text-on-primary px-8 py-4 rounded-full font-bold hover:bg-primary-active transition-all disabled:opacity-30 disabled:hover:-translate-y-0 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-1"
                    >
                      <span className="text-sm">
                        {currentStep < totalQuestions - 1 ? 'Próxima Pergunta' : 'Finalizar Teste'}
                      </span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
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
                    <span className="text-xs font-bold text-text-mute uppercase tracking-widest block animate-pulse">
                      Análise Concluída
                    </span>
                    
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
                      className="w-28 h-28 mx-auto rounded-[2rem] flex items-center justify-center text-6xl shadow-xl border-4 border-surface"
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
                    <span className="text-sm font-bold text-text-soft uppercase tracking-wider block mb-2">
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
                      <div className="bg-canvas-soft border border-border/50 rounded-3xl p-6 sm:p-8 space-y-5">
                        <h4 className="font-bold text-sm text-ink-deep uppercase tracking-wide flex items-center gap-2 justify-center mb-6">
                          <BarChart3 className="w-5 h-5 text-primary" />
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
                                <span className="font-black text-ink-deep">{item.percentage}%</span>
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
                    <div className="bg-canvas-soft border border-border/50 rounded-3xl p-6 sm:p-8 text-left space-y-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: resultCategory.color }} />
                      <h4 className="font-bold text-sm text-text-soft uppercase tracking-wide flex items-center gap-2">
                        <Award className="w-5 h-5" style={{ color: resultCategory.color }} />
                        Detalhes do seu perfil
                      </h4>
                      <p className="text-body-text leading-relaxed text-sm sm:text-base">
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
                    <button
                      onClick={handleRestart}
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold bg-canvas border border-border hover:bg-border/50 text-text transition-all hover:shadow-md hover:-translate-y-1"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Refazer o Teste
                    </button>
                  </motion.div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
