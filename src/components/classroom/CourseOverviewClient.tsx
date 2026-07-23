"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PlayCircle, FileText, CheckCircle, Trophy, BookOpen, Clock, ChevronDown } from "lucide-react";
import { useState } from "react";

type CourseData = any; // You would import your types here

export default function CourseOverviewClient({
  course,
  totalLessons,
  completedLessons,
  progressPercentage,
  nextLesson
}: {
  course: CourseData;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  nextLesson: any;
}) {
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(
    course.modules.reduce((acc: any, mod: any) => ({ ...acc, [mod.id]: true }), {})
  );

  const toggleModule = (id: string) => {
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="w-full min-h-screen bg-bg pt-28 pb-20">
      {/* Hero Banner (contained to avoid navbar clash) */}
      <div className="relative w-full max-w-7xl mx-auto min-h-[400px] md:min-h-[450px] py-16 rounded-[var(--radius-3xl)] flex items-center justify-start overflow-hidden mb-12 shadow-2xl">
        {/* Backdrops */}
        <div className="absolute inset-0 z-0 bg-black">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[10s] ease-out scale-105 opacity-60"
            style={{ backgroundImage: `url(https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2000&auto=format&fit=crop)` }}
          />
          {/* Gradient to darken the left side for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
          {/* Gradient to blend smoothly into the page background at the bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-12">
          <motion.div 
            initial="hidden"
            animate="show"
            variants={containerVariants}
            className="max-w-3xl"
          >
            <motion.span variants={itemVariants} className="inline-block px-4 py-1.5 bg-primary/90 backdrop-blur-md rounded-full text-xs font-bold tracking-widest text-white uppercase mb-6 shadow-lg">
              Visão Geral do Curso
            </motion.span>
            <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl lg:text-7xl font-display font-extrabold mb-6 leading-[1.1] text-white">
              {course.title}
            </motion.h1>
            <motion.p variants={itemVariants} className="text-white/80 text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
              {course.description}
            </motion.p>

            {nextLesson && (
              <motion.div variants={itemVariants}>
                <Link
                  href={`/courses/${course.id}/lessons/${nextLesson.id}`}
                  className="group inline-flex items-center gap-3 bg-primary text-on-primary px-8 py-4 rounded-[var(--radius-xl)] font-bold text-lg hover:bg-primary-hover hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(37,99,235,0.3)] transition-all duration-[var(--duration-md)] ease-[var(--ease-zen)]"
                >
                  <PlayCircle className="w-6 h-6 fill-current/10" />
                  {completedLessons === 0 ? "Começar Curso Agora" : "Continuar Aula"}
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Main Content Grid */}
      <motion.div 
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="max-w-6xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12"
      >
        {/* Left Column: Syllabus */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div variants={itemVariants}>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-8 flex items-center gap-3 text-text">
              <BookOpen className="w-7 h-7 text-primary" />
              Conteúdo do Curso
            </h2>
            
            <div className="space-y-4">
              {course.modules.map((module: any) => (
                <div key={module.id} className="bg-surface rounded-[var(--radius-lg)] border border-border/50 overflow-hidden shadow-sm transition-all duration-[var(--duration-md)] hover:border-border">
                  {/* Module Header */}
                  <button 
                    onClick={() => toggleModule(module.id)}
                    className="w-full flex items-center justify-between p-6 bg-surface-hover/30 hover:bg-surface-hover transition-colors"
                  >
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Módulo {module.order}</span>
                      <h3 className="text-lg md:text-xl font-bold text-text">{module.title}</h3>
                    </div>
                    <div className={`p-2 rounded-full bg-canvas-soft transition-transform duration-[var(--duration-md)] ${expandedModules[module.id] ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-5 h-5 text-text-soft" />
                    </div>
                  </button>

                  {/* Module Lessons */}
                  <AnimatePresence>
                    {expandedModules[module.id] && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="divide-y divide-border/50 bg-surface-card/30"
                      >
                        {module.lessons.map((lesson: any) => (
                          <Link
                            key={lesson.id}
                            href={`/courses/${course.id}/lessons/${lesson.id}`}
                            className="flex items-center gap-4 p-5 hover:bg-surface-hover transition-all duration-[var(--duration-sm)] group"
                          >
                            <div className="flex-shrink-0">
                              {lesson.isCompleted ? (
                                <CheckCircle className="w-6 h-6 text-emerald-500" />
                              ) : lesson.type === 'video' ? (
                                <PlayCircle className="w-6 h-6 text-text-mute group-hover:text-primary transition-colors" />
                              ) : (
                                <FileText className="w-6 h-6 text-text-mute group-hover:text-primary transition-colors" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate transition-colors ${lesson.isCompleted ? 'text-text-soft' : 'text-text group-hover:text-primary'}`}>
                                {lesson.title}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-text-soft whitespace-nowrap bg-canvas-soft px-3 py-1.5 rounded-full">
                              <Clock className="w-3.5 h-3.5" />
                              {lesson.durationInMinutes} min
                            </div>
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Progress & Stats */}
        <div className="space-y-6">
          <motion.div variants={itemVariants} className="bg-surface/60 backdrop-blur-xl border border-border/60 rounded-[var(--radius-xl)] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-28">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3 text-text">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-500" />
              </div>
              Seu Progresso
            </h3>
            
            <div className="flex items-end justify-between mb-3">
              <span className="text-4xl font-display font-extrabold text-primary">{progressPercentage}%</span>
              <span className="text-sm font-medium text-text-soft mb-1.5">
                {completedLessons} de {totalLessons} aulas
              </span>
            </div>
            
            <div className="w-full bg-canvas-soft rounded-full h-2 mb-8 overflow-hidden shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1.5, ease: [0.25, 1, 0.5, 1], delay: 0.2 }}
                className="bg-primary h-full rounded-full relative"
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
              </motion.div>
            </div>

            <div className="space-y-5 pt-6 border-t border-border/50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-soft font-medium">Tempo estimado</span>
                <span className="font-bold text-text bg-surface-hover px-3 py-1 rounded-md">
                  {Math.round(course.modules.reduce((acc: any, mod: any) => acc + mod.lessons.reduce((acc2: any, l: any) => acc2 + l.durationInMinutes, 0), 0) / 60)}h{' '}
                  {course.modules.reduce((acc: any, mod: any) => acc + mod.lessons.reduce((acc2: any, l: any) => acc2 + l.durationInMinutes, 0), 0) % 60}m
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-soft font-medium">Certificado</span>
                <span className="font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-md">Incluso</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
