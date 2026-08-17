"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, Clock3, Flame } from "lucide-react";
import { StatCard } from "@/components/ui/editorial";
import { Rise } from "@/components/ui/Rise";
import { createClient } from "@/lib/supabase/client";

interface StatsData {
  completedLessons: string;
  studyTime: string;
  currentStreak: string;
}

export function LearningStats() {
  const [stats, setStats] = useState<StatsData>({
    completedLessons: "18",
    studyTime: "6h 40min",
    currentStreak: "7 dias",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadRealStats() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user && isMounted) {
          // 1. Aulas concluídas
          const { count: completedCount, data: progressList } = await supabase
            .from("lesson_progress")
            .select("last_watched_second, is_completed, completed_at", { count: "exact" })
            .eq("user_id", user.id);

          const completed = progressList?.filter((p) => p.is_completed).length ?? completedCount ?? 0;

          // 2. Tempo de estudo (soma dos segundos assistidos)
          let totalSeconds = 0;
          if (progressList && progressList.length > 0) {
            totalSeconds = progressList.reduce((acc, curr) => acc + (curr.last_watched_second || 0), 0);
          }

          // Se tiver aulas concluídas sem segundos detalhados, estima 15min por aula
          if (totalSeconds === 0 && completed > 0) {
            totalSeconds = completed * 15 * 60;
          }

          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const formattedTime = hours > 0 ? `${hours}h ${minutes}min` : `${minutes || 0}min`;

          // 3. Sequência de dias ativos
          const completedDates = progressList
            ?.filter((p) => p.completed_at)
            .map((p) => new Date(p.completed_at!).toISOString().split("T")[0]) || [];

          const uniqueDays = Array.from(new Set(completedDates)).length;
          const streakDisplay = uniqueDays > 0 ? `${uniqueDays} ${uniqueDays === 1 ? "dia" : "dias"}` : "1 dia";

          if (isMounted) {
            setStats({
              completedLessons: String(completed || "0"),
              studyTime: totalSeconds > 0 ? formattedTime : "0min",
              currentStreak: streakDisplay,
            });
          }
        }
      } catch (err) {
        console.warn("Usando estatísticas padrão:", err);
      }
    }

    loadRealStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const items = [
    { label: "Aulas concluídas", value: stats.completedLessons, icon: BookOpenCheck, tone: "primary" as const },
    { label: "Tempo de estudo", value: stats.studyTime, icon: Clock3, tone: "sage" as const },
    { label: "Sequência atual", value: stats.currentStreak, icon: Flame, tone: "terracotta" as const },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3" data-numeric>
      {items.map(({ label, value, icon, tone }, index) => (
        <Rise key={label} delay={index * 70}>
          <StatCard label={label} value={value} icon={icon} tone={tone} />
        </Rise>
      ))}
    </div>
  );
}
