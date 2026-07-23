import React from "react";
import { Lightbulb, Target, Sparkles, ChevronRight } from "lucide-react";

interface DailyPillProps {
  challenge?: string;
  title?: string;
}

export default function DailyPill({ 
  title = "Pílula Diária de Micro-learning",
  challenge = "Hoje, tente praticar a escuta ativa em sua próxima reunião, esperando 2 segundos antes de responder." 
}: DailyPillProps) {
  return (
    <div className="w-full px-4 md:px-8 mb-12 relative z-30">
      <div className="max-w-4xl mx-auto">
        <div className="group flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
          
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
              <Lightbulb className="w-5 h-5" />
            </div>
            
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-[10px] md:text-xs font-bold text-primary tracking-widest uppercase">{title}</h3>
              </div>
              <p className="text-sm font-medium text-text-soft group-hover:text-text transition-colors">
                "{challenge}"
              </p>
            </div>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors ml-14 md:ml-0 whitespace-nowrap">
            <span>Aceitar</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
        </div>
      </div>
    </div>
  );
}
