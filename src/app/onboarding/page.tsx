'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { mockQuestionnaire, mockEligibleLessons } from '@/lib/mocks/trilhaMocks';
import { generateLearningTrail } from '@/lib/matching';
import dynamic from 'next/dynamic';

const PhysicsKeywordSelector = dynamic(() => import('@/components/PhysicsKeywordSelector'), { ssr: false });

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const questions = mockQuestionnaire.questions;
  const question = questions[currentStep];

  const handleToggleSelect = (optionLabel: string) => {
    const currentAnswer = answers[question.id] || [];
    const isSingle = question.type === 'single';

    if (isSingle) {
      setAnswers({ ...answers, [question.id]: [optionLabel] });
    } else {
      if (currentAnswer.includes(optionLabel)) {
        setAnswers({
          ...answers,
          [question.id]: currentAnswer.filter(l => l !== optionLabel)
        });
      } else {
        setAnswers({
          ...answers,
          [question.id]: [...currentAnswer, optionLabel]
        });
      }
    }
  };

  const isSelected = (label: string) => {
    const answer = answers[question.id];
    return answer ? answer.includes(label) : false;
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const trail = generateLearningTrail('user-1', answers, mockQuestionnaire, mockEligibleLessons);
      localStorage.setItem('minha_trilha', JSON.stringify(trail));
      router.push('/');
    }, 2500);
  };

  if (isGenerating) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg text-text relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-bg to-bg z-0"></div>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="h-20 w-20 rounded-full border-4 border-t-primary border-r-primary/30 border-b-primary/10 border-l-primary/30 z-10"
        />
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, ease: [0.25, 1, 0.5, 1], duration: 0.8 }}
          className="mt-8 text-3xl font-extrabold tracking-tight z-10 text-text"
        >
          Destilando sua Trilha...
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, ease: [0.25, 1, 0.5, 1], duration: 0.8 }}
          className="mt-3 text-lg text-text-mute z-10 font-medium"
        >
          Nossa inteligência está cruzando suas respostas.
        </motion.p>
      </div>
    );
  }

  const progress = ((currentStep) / questions.length) * 100;

  // Variantes do Container para Stagger
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    },
    exit: { opacity: 0, transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] as any } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
        mass: 0.8
      },
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text relative overflow-hidden font-sans selection:bg-primary/20">
      {/* Background Mesh Gradient Animado (Light Zen Style) */}
      <motion.div 
        animate={{ 
          backgroundPosition: ['0% 0%', '100% 100%', '0% 100%', '100% 0%', '0% 0%'] 
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 z-0 opacity-60 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(37, 99, 235, 0.05), transparent 50%), radial-gradient(circle at 85% 30%, rgba(147, 197, 253, 0.08), transparent 50%)',
          backgroundSize: '200% 200%'
        }}
      />

      {/* Barra de Progresso Glassmorphism Light */}
      <div className="h-1.5 w-full bg-border/30 relative z-50">
        <motion.div 
          className="h-full bg-primary" 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }} // Zen easing
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center w-full px-4 sm:px-6 py-12 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex w-full max-w-3xl flex-col items-center justify-center rounded-[var(--radius-lg)] bg-surface/60 backdrop-blur-3xl border border-border/50 p-8 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <motion.span variants={itemVariants} className="mb-6 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary shadow-sm">
              Passo {currentStep + 1}
            </motion.span>
            
            <motion.h1 variants={itemVariants} className="mb-12 text-center text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight text-text tracking-tight">
              {question.text}
            </motion.h1>

            {/* RENDERIZAÇÃO CONDICIONAL */}
            <motion.div variants={itemVariants} className="w-full">
              {question.visualType === 'physics' ? (
                <div className="w-full">
                  <PhysicsKeywordSelector 
                    options={question.options} 
                    selectedLabels={answers[question.id] || []}
                    onToggleSelect={handleToggleSelect}
                  />
                </div>
              ) : question.visualType === 'cards' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {question.options.map((opt, idx) => (
                    <motion.button
                      variants={itemVariants}
                      whileHover={{ scale: 1.01, backgroundColor: "var(--surface)" }}
                      whileTap={{ scale: 0.98 }}
                      key={idx}
                      onClick={() => handleToggleSelect(opt.label)}
                      className={`group flex flex-col items-start justify-between rounded-[var(--radius-lg)] border p-6 text-left transition-all duration-[var(--duration-md)] ease-[var(--ease-zen)] h-44 ${
                        isSelected(opt.label)
                          ? 'border-primary bg-primary/5 shadow-[0_8px_20px_rgba(37,99,235,0.08)]'
                          : 'border-border/60 bg-surface/40 hover:border-border hover:shadow-md'
                      }`}
                    >
                      <span className="text-xl sm:text-2xl font-bold leading-tight text-text">{opt.label}</span>
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors duration-[var(--duration-md)] ${isSelected(opt.label) ? 'bg-primary shadow-sm' : 'border border-border/80 group-hover:border-border'}`}>
                        {isSelected(opt.label) && <motion.div layoutId={`check-${question.id}`} className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {question.options.map((opt, idx) => (
                    <motion.button
                      variants={itemVariants}
                      whileHover={{ x: 4, backgroundColor: "var(--surface)" }}
                      whileTap={{ scale: 0.98 }}
                      key={idx}
                      onClick={() => handleToggleSelect(opt.label)}
                      className={`group flex items-center justify-between rounded-[var(--radius-md)] border px-6 py-5 text-left transition-all duration-[var(--duration-md)] ease-[var(--ease-zen)] ${
                        isSelected(opt.label)
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border/50 bg-surface/30 hover:border-border hover:shadow-sm'
                      }`}
                    >
                      <span className={`text-lg font-medium transition-colors ${isSelected(opt.label) ? 'text-primary' : 'text-text'}`}>{opt.label}</span>
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center transition-colors duration-[var(--duration-md)] ${isSelected(opt.label) ? 'bg-primary' : 'border border-border/80 group-hover:border-border'}`}>
                        {isSelected(opt.label) && <motion.div layoutId={`check-${question.id}`} className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Rodapé Fixo */}
        <div className="absolute bottom-6 sm:bottom-10 flex w-full max-w-3xl justify-between px-6 sm:px-12 items-center pointer-events-none z-50">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            className={`font-semibold text-sm sm:text-base text-text-mute hover:text-text transition-colors duration-[var(--duration-sm)] pointer-events-auto ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            Voltar
          </button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            disabled={!answers[question.id] || answers[question.id].length === 0}
            className="rounded-full bg-primary px-8 sm:px-12 py-3.5 sm:py-4 font-bold text-white transition-all duration-[var(--duration-md)] ease-[var(--ease-zen)] hover:bg-primary-hover hover:shadow-[0_8px_20px_rgba(37,99,235,0.25)] disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none pointer-events-auto shadow-md"
          >
            {currentStep === questions.length - 1 ? 'Montar Trilha' : 'Continuar'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
