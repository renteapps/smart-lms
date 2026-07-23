import React, { useMemo } from 'react';
import { Questionnaire, ContentMapping } from '@/types/trilha';
import { Calendar, Video, Folder, BookOpen, FileText, Link as LinkIcon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrailPreviewProps {
  questionnaire: Questionnaire;
}

export const TrailPreview: React.FC<TrailPreviewProps> = ({ questionnaire }) => {
  
  // Extract all content mappings from the questionnaire to simulate a generated trail
  const allMappings = useMemo(() => {
    const mappings: ContentMapping[] = [];
    questionnaire.questions.forEach(q => {
      q.options.forEach(opt => {
        if (opt.contentMappings) {
          mappings.push(...opt.contentMappings);
        }
      });
    });

    // Remove duplicates by ID (in a real scenario, this would depend on user answers)
    const uniqueMap = new Map<string, ContentMapping>();
    mappings.forEach(m => uniqueMap.set(m.id, m));
    
    // Sort by unlockAfterDays
    return Array.from(uniqueMap.values()).sort((a, b) => a.unlockAfterDays - b.unlockAfterDays);
  }, [questionnaire]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'lesson': return <Video size={16} className="text-blue-400" />;
      case 'module': return <Folder size={16} className="text-yellow-400" />;
      case 'course': return <BookOpen size={16} className="text-green-400" />;
      case 'article': return <FileText size={16} className="text-purple-400" />;
      case 'external_link': return <LinkIcon size={16} className="text-gray-400" />;
      default: return <FileText size={16} />;
    }
  };

  const getDayLabel = (days: number) => {
    if (days === 0) return 'Imediato (Dia 0)';
    if (days === 1) return 'Dia Seguinte (Dia 1)';
    return `Dia ${days}`;
  };

  // Group by unlock days
  const groupedTimeline = useMemo(() => {
    const groups: Record<number, ContentMapping[]> = {};
    allMappings.forEach(m => {
      if (!groups[m.unlockAfterDays]) groups[m.unlockAfterDays] = [];
      groups[m.unlockAfterDays].push(m);
    });
    return groups;
  }, [allMappings]);

  const sortedDays = Object.keys(groupedTimeline).map(Number).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/20">
          <Sparkles size={24} />
        </div>
        <h3 className="text-xl font-bold text-ink-deep mb-2">Simulação de Trilha</h3>
        <p className="text-sm text-text-soft max-w-md mx-auto">
          Esta é uma visão consolidada de <strong>todos</strong> os conteúdos mapeados neste questionário. 
          Na prática, o aluno verá apenas a intersecção de suas respostas.
        </p>
      </div>

      <div className="relative pl-4 border-l-2 border-border/60 ml-4 space-y-8 pb-8">
        {allMappings.length === 0 ? (
          <div className="text-text-mute text-sm italic py-4">
            Nenhum conteúdo mapeado ainda. Adicione mapeamentos nas opções do questionário.
          </div>
        ) : (
          sortedDays.map((day, idx) => (
            <motion.div 
              key={day}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative"
            >
              <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-bg" />
              
              <div className="flex items-center gap-2 mb-4 text-primary font-bold">
                <Calendar size={18} />
                <h4>{getDayLabel(day)}</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedTimeline[day].map(item => (
                  <div 
                    key={item.id}
                    className="bg-surface border border-border/60 rounded-xl p-4 shadow-sm hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg shrink-0">
                        {getIconForType(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-sm text-text truncate" title={item.title}>
                          {item.title}
                        </h5>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium text-text-mute uppercase tracking-wider">
                            {item.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
