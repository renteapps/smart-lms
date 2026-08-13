import { mockEligibleLessons } from "@/lib/mocks/trilhaMocks";

export type UserTrailContent = {
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

const DAY_IN_MS = 86_400_000;
const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=85&w=1000&auto=format&fit=crop";

const DEMO_CONTENT: Array<Omit<UserTrailContent, "scheduledDate"> & { dayOffset: number }> = [
  { courseId: "c1", lessonId: "l1", title: "Fundamentos da Liderança", moduleName: "Módulo 1 · A base", duration: "15 min", cover: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=85&w=1000&auto=format&fit=crop", reason: "Foco em liderança", dayOffset: 0 },
  { courseId: "c1", lessonId: "l2", title: "O papel do líder moderno", moduleName: "Módulo 1 · A base", duration: "22 min", cover: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=85&w=1000&auto=format&fit=crop", reason: "Continuação", dayOffset: 0 },
  { courseId: "c2", lessonId: "l3", title: "Comunicação não violenta", moduleName: "Módulo 1 · Empatia", duration: "20 min", cover: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=85&w=1000&auto=format&fit=crop", reason: "Foco em empatia", dayOffset: 1 },
  { courseId: "c2", lessonId: "l4", title: "Como ouvir na essência", moduleName: "Módulo 1 · Empatia", duration: "18 min", cover: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=85&w=1000&auto=format&fit=crop", reason: "Prática de escuta", dayOffset: 1 },
  { courseId: "c2", lessonId: "l5", title: "Lidando com conflitos", moduleName: "Módulo 2 · Resolução", duration: "35 min", cover: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=85&w=1000&auto=format&fit=crop", reason: "Foco em mediação", dayOffset: 1 },
  { courseId: "c3", lessonId: "l6", title: "Gestão de tempo eficaz", moduleName: "Módulo 1 · Bases", duration: "10 min", cover: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=85&w=1000&auto=format&fit=crop", reason: "Próxima etapa", locked: true, dayOffset: 2 },
  { courseId: "c3", lessonId: "l7", title: "Técnica Pomodoro 2.0", moduleName: "Módulo 1 · Bases", duration: "12 min", cover: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=85&w=1000&auto=format&fit=crop", reason: "Prática recomendada", locked: true, dayOffset: 2 },
];

export function createDemoTrail(from = new Date()): UserTrailContent[] {
  return DEMO_CONTENT.map(({ dayOffset, ...item }) => ({
    ...item,
    scheduledDate: new Date(from.getTime() + dayOffset * DAY_IN_MS).toISOString(),
  }));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseDuration(value: unknown, fallbackMinutes?: number) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return `${Math.round(value / 60)} min`;
  return fallbackMinutes ? `${fallbackMinutes} min` : "10 min";
}

export function normalizeSavedTrail(raw: string, now = new Date()): UserTrailContent[] {
  const parsed: unknown = JSON.parse(raw);
  const items = Array.isArray(parsed)
    ? parsed
    : isObject(parsed) && Array.isArray(parsed.items)
      ? parsed.items
      : [];
  const generatedAt = isObject(parsed) && typeof parsed.generatedAt === "number"
    ? new Date(parsed.generatedAt)
    : now;

  return items.flatMap((rawItem, index) => {
    if (!isObject(rawItem) || typeof rawItem.lessonId !== "string") return [];

    const catalogLesson = mockEligibleLessons.find((lesson) => lesson.lessonId === rawItem.lessonId);
    const scheduledDate = typeof rawItem.scheduledDate === "string"
      ? rawItem.scheduledDate
      : new Date(generatedAt.getTime() + index * DAY_IN_MS).toISOString();

    return [{
      courseId: typeof rawItem.courseId === "string" ? rawItem.courseId : "c1",
      lessonId: rawItem.lessonId,
      title: typeof rawItem.title === "string" ? rawItem.title : catalogLesson?.title ?? "Conteúdo da sua trilha",
      moduleName: typeof rawItem.moduleName === "string" ? rawItem.moduleName : catalogLesson?.courseSlug,
      duration: parseDuration(rawItem.duration, catalogLesson ? Math.round(catalogLesson.duration / 60) : undefined),
      cover: typeof rawItem.cover === "string" ? rawItem.cover : DEFAULT_COVER,
      progress: typeof rawItem.progress === "number" ? rawItem.progress : undefined,
      locked: rawItem.locked === true,
      reason: typeof rawItem.reason === "string" ? rawItem.reason : undefined,
      scheduledDate,
    }];
  });
}

export function getWeekBounds(date = new Date()) {
  const start = new Date(date);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

export function getTrailForWeek(items: UserTrailContent[], date = new Date()) {
  const { start, end } = getWeekBounds(date);

  return items
    .filter((item) => {
      if (!item.scheduledDate) return false;
      const scheduledDate = new Date(item.scheduledDate);
      return !Number.isNaN(scheduledDate.getTime()) && scheduledDate >= start && scheduledDate < end;
    })
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());
}

export function getDurationInMinutes(duration?: string) {
  if (!duration) return 0;
  const value = Number.parseInt(duration, 10);
  return Number.isNaN(value) ? 0 : value;
}

export type TrailFocusDay = {
  /** Início do dia em foco. */
  date: Date;
  items: UserTrailContent[];
  /** 0 = hoje, 1 = amanhã, 2+ = dias à frente. */
  offsetInDays: number;
  totalMinutes: number;
};

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Escolhe o dia que a home deve mostrar: hoje, se houver conteúdo agendado;
 * caso contrário, o próximo dia que tiver.
 *
 * Dias passados são descartados — a home responde "o que eu faço agora", e um
 * conteúdo de terça-feira exibido na quinta só gera culpa, não ação. O histórico
 * continua acessível em /minha-trilha.
 *
 * Retorna `null` quando não há nada agendado de hoje em diante.
 */
export function getFocusDay(items: UserTrailContent[], now = new Date()): TrailFocusDay | null {
  const today = startOfDay(now);

  const upcoming = items
    .flatMap((item) => {
      if (!item.scheduledDate) return [];
      const scheduled = new Date(item.scheduledDate);
      if (Number.isNaN(scheduled.getTime())) return [];

      const day = startOfDay(scheduled);
      if (day < today) return [];

      return [{ item, day }];
    })
    .sort((a, b) => a.day.getTime() - b.day.getTime());

  const first = upcoming[0];
  if (!first) return null;

  const focusTime = first.day.getTime();
  const dayItems = upcoming.filter((entry) => entry.day.getTime() === focusTime).map((entry) => entry.item);

  return {
    date: first.day,
    items: dayItems,
    offsetInDays: Math.round((focusTime - today.getTime()) / DAY_IN_MS),
    totalMinutes: dayItems.reduce((total, item) => total + getDurationInMinutes(item.duration), 0),
  };
}
