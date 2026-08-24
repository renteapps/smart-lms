import { BookOpenCheck, Clock3, Flame } from "lucide-react";
import { StatCard } from "@/components/ui/editorial";
import { Rise } from "@/components/ui/Rise";
import { getSessionUser } from "@/lib/supabase/auth";

export async function LearningStats() {
  let completed = 0;
  let totalSeconds = 0;
  let uniqueDays = 0;

  try {
    const { supabase, user } = await getSessionUser();

    if (user) {
      const { count: completedCount, data: progressList } = await supabase
        .from("lesson_progress")
        .select("last_watched_second, is_completed, completed_at", { count: "exact" })
        .eq("user_id", user.id);

      completed = progressList?.filter((p) => p.is_completed).length ?? completedCount ?? 0;

      if (progressList && progressList.length > 0) {
        totalSeconds = progressList.reduce((acc, curr) => acc + (curr.last_watched_second || 0), 0);
      }

      if (totalSeconds === 0 && completed > 0) {
        totalSeconds = completed * 15 * 60;
      }

      const completedDates = progressList
        ?.filter((p) => p.completed_at)
        .map((p) => new Date(p.completed_at!).toISOString().split("T")[0]) || [];

      uniqueDays = Array.from(new Set(completedDates)).length;
    }
  } catch (err) {
    console.error("Erro ao carregar estatísticas reais:", err);
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const formattedTime = hours > 0 ? `${hours}h ${minutes}min` : `${minutes || 0}min`;
  const streakDisplay = uniqueDays > 0 ? `${uniqueDays} ${uniqueDays === 1 ? "dia" : "dias"}` : "1 dia";

  const items = [
    { label: "Aulas concluídas", value: String(completed), icon: BookOpenCheck, tone: "primary" as const },
    { label: "Tempo de estudo", value: totalSeconds > 0 ? formattedTime : "0min", icon: Clock3, tone: "sage" as const },
    { label: "Sequência atual", value: streakDisplay, icon: Flame, tone: "terracotta" as const },
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
