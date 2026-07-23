'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, Play, Lock, Sparkles, Calendar as CalendarIcon, LayoutList } from 'lucide-react';
import LessonCard from '@/components/LessonCard';
import { useNotifications } from '@/contexts/NotificationContext';

type TrilhaItem = {
  courseId: string;
  lessonId: string;
  title: string;
  moduleName?: string;
  duration?: string;
  cover: string;
  progress?: number;
  locked?: boolean;
  reason?: string;
  scheduledDate?: string; 
};

const MOCK_TRILHA: TrilhaItem[] = [
  // HOJE
  {
    courseId: 'c1', lessonId: 'l1', title: 'Fundamentos da Liderança',
    moduleName: 'Módulo 1: A Base', duration: '15m', cover: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=600&auto=format&fit=crop',
    reason: 'Foco em Liderança',
    scheduledDate: new Date(Date.now()).toISOString()
  },
  {
    courseId: 'c1', lessonId: 'l2', title: 'O Papel do Líder Moderno',
    moduleName: 'Módulo 1: A Base', duration: '22m', cover: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=600&auto=format&fit=crop',
    reason: 'Continuação do Módulo',
    scheduledDate: new Date(Date.now()).toISOString()
  },
  // AMANHÃ
  {
    courseId: 'c2', lessonId: 'l3', title: 'Comunicação Não Violenta',
    moduleName: 'Módulo 1: Empatia', duration: '20m', cover: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=600&auto=format&fit=crop',
    reason: 'Foco em Empatia',
    scheduledDate: new Date(Date.now() + 86400000).toISOString()
  },
  {
    courseId: 'c2', lessonId: 'l4', title: 'Como Ouvir na Essência',
    moduleName: 'Módulo 1: Empatia', duration: '18m', cover: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=600&auto=format&fit=crop',
    reason: 'Prática de Escuta',
    scheduledDate: new Date(Date.now() + 86400000).toISOString()
  },
  {
    courseId: 'c2', lessonId: 'l5', title: 'Lidando com Conflitos',
    moduleName: 'Módulo 2: Resolução', duration: '35m', cover: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=600&auto=format&fit=crop',
    reason: 'Foco em Mediação',
    scheduledDate: new Date(Date.now() + 86400000).toISOString()
  },
  // DEPOIS DE AMANHÃ
  {
    courseId: 'c3', lessonId: 'l6', title: 'Gestão de Tempo Eficaz',
    moduleName: 'Módulo 1: Bases', duration: '10m', cover: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=600&auto=format&fit=crop',
    reason: 'Foco em Produtividade',
    locked: true,
    scheduledDate: new Date(Date.now() + 86400000 * 2).toISOString()
  },
  {
    courseId: 'c3', lessonId: 'l7', title: 'Técnica Pomodoro 2.0',
    moduleName: 'Módulo 1: Bases', duration: '12m', cover: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=600&auto=format&fit=crop',
    reason: 'Prática recomendada',
    locked: true,
    scheduledDate: new Date(Date.now() + 86400000 * 2).toISOString()
  },
  // DAQUI A 3 DIAS
  {
    courseId: 'c4', lessonId: 'l8', title: 'Delegação Descomplicada',
    moduleName: 'Módulo 3: Avançado', duration: '40m', cover: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=600&auto=format&fit=crop',
    reason: 'Evolução na Liderança',
    locked: true,
    scheduledDate: new Date(Date.now() + 86400000 * 3).toISOString()
  }
];

export default function MinhaTrilhaPage() {
  const [trilha, setTrilha] = useState<TrilhaItem[] | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!isLoaded || !trilha) return;
    
    const todayStr = new Date().toLocaleDateString('pt-BR');
    const lastNotified = localStorage.getItem('@smartlms:last_trilha_notif');

    if (lastNotified !== todayStr) {
      const todayItems = trilha.filter(item => {
        if (!item.scheduledDate || item.locked) return false;
        const itemDate = new Date(item.scheduledDate).toLocaleDateString('pt-BR');
        return itemDate === todayStr || new Date(item.scheduledDate) <= new Date();
      });

      if (todayItems.length > 0) {
        addNotification({
          title: "Aulas liberadas na sua trilha!",
          message: `Você tem ${todayItems.length} aula(s) disponíveis hoje. Continue sua jornada de aprendizado!`,
          targetAudience: "all"
        });
        localStorage.setItem('@smartlms:last_trilha_notif', todayStr);
      }
    }
  }, [isLoaded, trilha, addNotification]);

  useEffect(() => {
    const saved = localStorage.getItem('minha_trilha');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const withDates = parsed.items?.map((item: any, i: number) => ({
          ...item,
          scheduledDate: new Date(Date.now() + i * 86400000).toISOString()
        })) || parsed;
        
        setTrilha(withDates.length > 0 ? withDates : MOCK_TRILHA);
      } catch (e) {
        setTrilha(MOCK_TRILHA);
      }
    } else {
      setTrilha(MOCK_TRILHA);
    }
    setIsLoaded(true);
  }, []);

  if (!isLoaded || !trilha) {
    return <div className="min-h-screen bg-bg" />;
  }

  const groupedByDate = trilha.reduce((acc, item) => {
    const dateStr = item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) : 'Sem data';
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(item);
    return acc;
  }, {} as Record<string, TrilhaItem[]>);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, x: -20 },
    show: { opacity: 1, y: 0, x: 0, transition: { type: "spring" as const, stiffness: 200, damping: 20 } }
  };

  return (
    <div className="min-h-screen bg-bg text-text overflow-x-hidden font-sans">
      {/* HEADER / HERO SECTION */}
      <div className="relative pt-24 pb-12 px-6 sm:px-12 lg:px-24 border-b border-border/30">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-text-mute hover:text-primary transition-colors mb-8 font-medium">
              <ChevronLeft className="w-5 h-5" /> Voltar para o início
            </Link>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-pale border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> IA Curadoria
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 leading-tight text-text">
                Sua Jornada <br className="hidden md:block"/> <span className="text-primary">Personalizada</span>
              </h1>
            </motion.div>
          </div>

          {/* TOGGLE VISÃO */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center bg-surface border border-border/40 rounded-full p-1 backdrop-blur-md shadow-sm"
          >
            <button 
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${viewMode === 'timeline' ? 'bg-primary text-on-primary shadow-sm' : 'text-text-mute hover:text-text'}`}
            >
              <LayoutList className="w-4 h-4" /> Trilha
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${viewMode === 'calendar' ? 'bg-primary text-on-primary shadow-sm' : 'text-text-mute hover:text-text'}`}
            >
              <CalendarIcon className="w-4 h-4" /> Agenda
            </button>
          </motion.div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-12 lg:px-24 pb-32">
        <AnimatePresence mode="wait">
          
          {/* VISÃO: TIMELINE */}
          {viewMode === 'timeline' && (
            <motion.div 
              key="timeline"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
              className="relative pt-12"
            >
              <div className="absolute left-[39px] md:left-[51px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-primary via-primary/20 to-transparent z-0 rounded-full" />

              {trilha.map((item, index) => {
                const isFirst = index === 0;
                return (
                  <motion.div key={item.lessonId + index} variants={itemVariants} className="relative flex items-start gap-6 md:gap-12 mb-16 last:mb-0 group">
                    <div className="relative z-10 shrink-0 mt-4 md:mt-8">
                      <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full border bg-surface flex items-center justify-center transition-all duration-300 ${item.locked ? 'opacity-50 border-border/40' : 'border-border/80 group-hover:border-primary/50 group-hover:shadow-md'}`}>
                        <div className={`w-3 h-3 rounded-full ${item.locked ? 'bg-border' : 'bg-primary'}`} />
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 md:w-8 md:h-8 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] md:text-xs font-bold text-text-soft shadow-sm">
                        {index + 1}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="md:inline-block">
                        <div className="relative">
                           <LessonCard 
                              id={item.lessonId} title={item.title} moduleName={item.moduleName} cover={item.cover || ""} duration={item.duration || ""} progress={item.progress} locked={item.locked} reason={item.reason}
                              href={item.locked ? "https://hotmart.com" : `/courses/${item.courseId}/lessons/${item.lessonId}`}
                              className="w-full md:w-80"
                           />
                           <div className="absolute top-6 -right-4 translate-x-full hidden lg:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              {item.locked ? <span className="flex items-center gap-1.5 text-xs font-bold text-text-mute uppercase tracking-widest"><Lock className="w-3.5 h-3.5"/> Upgrade Requerido</span>
                              : isFirst ? <span className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-widest"><Play className="w-3.5 h-3.5 fill-current"/> Próxima aula</span>
                              : <span className="flex items-center gap-1.5 text-xs font-bold text-text-mute uppercase tracking-widest">Liberada</span>}
                           </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* VISÃO: CALENDÁRIO / AGENDA */}
          {viewMode === 'calendar' && (
            <motion.div 
              key="calendar"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
              className="pt-12 space-y-12"
            >
              {Object.entries(groupedByDate).map(([dateLabel, items], dateIndex) => (
                <motion.div key={dateLabel} variants={itemVariants} className="relative">
                  {/* Cabeçalho do Dia */}
                  <div className="sticky top-20 z-20 flex items-center gap-4 mb-8 backdrop-blur-md py-4 -mx-4 px-4 bg-bg/90 border-b border-border/30">
                    <div className="w-14 h-14 rounded-[var(--radius-lg)] bg-surface border border-border/80 flex flex-col items-center justify-center text-center shadow-md">
                      <span className="text-[10px] font-bold text-primary uppercase leading-tight">{dateLabel.split(',')[0]}</span>
                      <span className="text-lg font-extrabold text-text leading-tight">{dateLabel.split(' ')[1]}</span>
                    </div>
                    <div className="flex-1 h-[1px] bg-border/80" />
                  </div>

                  {/* Grid de aulas do dia */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                    {items.map((item, idx) => (
                      <div key={idx} className="relative mt-2">
                        <LessonCard 
                          id={item.lessonId} title={item.title} moduleName={item.moduleName} cover={item.cover || ""} duration={item.duration || ""} progress={item.progress} locked={item.locked} reason={item.reason}
                          href={item.locked ? "https://hotmart.com" : `/courses/${item.courseId}/lessons/${item.lessonId}`}
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
