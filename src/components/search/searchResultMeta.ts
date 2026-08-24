import {
  Bot,
  FileText,
  GraduationCap,
  Layers,
  Play,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import type { SearchResultItem, SearchResultType, SearchTabType } from "@/types/search";

/**
 * Vocabulário visual de cada tipo de resultado, em um lugar só.
 *
 * Cartão, aba e sugestão precisam concordar sobre ícone, rótulo e cor — quando
 * isso mora espalhado em três `switch`, um deles sempre fica para trás.
 */
export interface SearchTypeVisual {
  label: string;
  /** Plural, para abas e cabeçalhos de contagem. */
  plural: string;
  icon: LucideIcon;
  /** Classes do azulejo do ícone. */
  tone: string;
  cta: string;
}

export const SEARCH_TYPE_VISUALS: Record<SearchResultType, SearchTypeVisual> = {
  course: {
    label: "Curso",
    plural: "Cursos",
    icon: GraduationCap,
    tone: "bg-accent text-accent-foreground",
    cta: "Acessar curso",
  },
  lesson: {
    label: "Aula",
    plural: "Aulas",
    icon: Play,
    tone: "bg-accent-soft text-accent-soft-foreground",
    cta: "Assistir aula",
  },
  agent: {
    label: "Agente de IA",
    plural: "Agentes IA",
    icon: Bot,
    tone: "bg-success-soft text-success-soft-foreground",
    cta: "Conversar agora",
  },
  article: {
    label: "Revista",
    plural: "Artigos",
    icon: FileText,
    tone: "bg-background-secondary text-foreground",
    cta: "Ler artigo",
  },
  note: {
    label: "Anotação",
    plural: "Anotações",
    icon: StickyNote,
    tone: "bg-warning-soft text-warning-soft-foreground",
    cta: "Ver anotação",
  },
};

export const SEARCH_TABS: Array<{ id: SearchTabType; label: string; icon: LucideIcon }> = [
  { id: "all", label: "Tudo", icon: Layers },
  { id: "course", label: SEARCH_TYPE_VISUALS.course.plural, icon: SEARCH_TYPE_VISUALS.course.icon },
  { id: "lesson", label: SEARCH_TYPE_VISUALS.lesson.plural, icon: SEARCH_TYPE_VISUALS.lesson.icon },
  { id: "agent", label: SEARCH_TYPE_VISUALS.agent.plural, icon: SEARCH_TYPE_VISUALS.agent.icon },
  { id: "article", label: SEARCH_TYPE_VISUALS.article.plural, icon: SEARCH_TYPE_VISUALS.article.icon },
  { id: "note", label: SEARCH_TYPE_VISUALS.note.plural, icon: SEARCH_TYPE_VISUALS.note.icon },
];

const NOTE_KIND_LABEL: Record<NonNullable<SearchResultItem["metadata"]>["noteKind"] & string, string> = {
  lesson: "de aula",
  agent: "de agente",
  personal: "pessoal",
};

/** Linha de contexto do cabeçalho do cartão: onde esse resultado mora. */
export function resultContextLabel(item: SearchResultItem): string {
  const meta = item.metadata ?? {};

  switch (item.type) {
    case "lesson":
      return meta.courseTitle ?? meta.moduleTitle ?? item.category ?? "Curso";
    case "agent":
      return meta.role ?? item.category ?? "Assistente";
    case "article":
      return item.category ?? "Revista";
    case "note":
      return meta.noteKind ? NOTE_KIND_LABEL[meta.noteKind] : "pessoal";
    case "course":
    default:
      return item.category ?? "Geral";
  }
}

export function formatDuration(value: string | number | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? `${value} min` : null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Rodapé do cartão: a informação que ajuda a decidir se vale clicar. */
export function resultFooterLabel(item: SearchResultItem): string | null {
  const meta = item.metadata ?? {};

  switch (item.type) {
    case "course":
      return meta.level ? `Nível ${meta.level}` : (item.category ?? null);
    case "lesson":
      return meta.moduleTitle ? `Módulo · ${meta.moduleTitle}` : (item.category ?? null);
    case "agent":
      return meta.courseTitle ? `Curso · ${meta.courseTitle}` : "Assistente especializado";
    case "article":
      return meta.author ? `Por ${meta.author}` : null;
    case "note":
      if (!meta.updatedAt) return null;
      try {
        return new Date(meta.updatedAt).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } catch {
        return null;
      }
    default:
      return null;
  }
}
