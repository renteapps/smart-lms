import { Route } from "lucide-react";
import { Card } from "@heroui/react/card";
import { Label } from "@heroui/react/label";
import { ProgressBar } from "@heroui/react/progress-bar";
import { getSessionUser } from "@/lib/supabase/auth";
import { getEnrolledCourses, getProgressByCourse } from "@/lib/data/courses";

export async function CurrentStageCard() {
  const { supabase, user } = await getSessionUser();
  
  if (!user) return null;

  try {
    const enrolledCourses = await getEnrolledCourses(supabase, user.id);
    
    if (!enrolledCourses || enrolledCourses.length === 0) {
      return (
        <Card className="border-hairline">
          <Card.Content className="gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success-soft-foreground">
                <Route className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted">Etapa atual</p>
                <p className="truncate font-bold text-foreground">Nenhum curso ativo</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      );
    }

    // Pick the most recent one, or just the first one for now
    const course = enrolledCourses[0];
    const progresses = await getProgressByCourse(supabase, user.id);
    const progressPercentage = progresses.get(course.id) || 0;

    return (
      <Card className="border-hairline">
        <Card.Content className="gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success-soft-foreground">
              <Route className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted">Etapa atual</p>
              <p className="truncate font-bold text-foreground" title={course.title}>
                {course.title}
              </p>
            </div>
          </div>

          <ProgressBar value={progressPercentage} color="accent" size="sm" data-numeric>
            <Label className="text-xs font-semibold text-muted">Progresso</Label>
            <ProgressBar.Output className="text-xs font-bold text-accent" />
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        </Card.Content>
      </Card>
    );
  } catch (error) {
    console.error("Error fetching CurrentStageCard:", error);
    return null;
  }
}
