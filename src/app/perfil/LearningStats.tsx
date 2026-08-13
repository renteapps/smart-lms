"use client";

import { BookOpenCheck, Clock3, Flame } from "lucide-react";
import { StatCard } from "@/components/ui/editorial";
import { Rise } from "@/components/ui/Rise";

/**
 * As métricas moram aqui, e não na página, porque `StatCard` recebe o ícone como
 * componente — e função não atravessa a fronteira server → client. Mantendo a
 * lista dentro de um client component, o ícone nunca precisa ser serializado.
 */
const learningStats = [
  { label: "Aulas concluídas", value: "18", icon: BookOpenCheck, tone: "primary" },
  { label: "Tempo de estudo", value: "6h 40min", icon: Clock3, tone: "sage" },
  { label: "Sequência atual", value: "7 dias", icon: Flame, tone: "terracotta" },
] as const;

export function LearningStats() {
  return (
    /* `data-numeric` herda: todos os valores comparáveis viram tabulares. */
    <div className="grid gap-4 sm:grid-cols-3" data-numeric>
      {learningStats.map(({ label, value, icon, tone }, index) => (
        <Rise key={label} delay={index * 70}>
          <StatCard label={label} value={value} icon={icon} tone={tone} />
        </Rise>
      ))}
    </div>
  );
}
