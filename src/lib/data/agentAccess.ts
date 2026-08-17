import { CATALOG_COURSES } from "@/lib/catalog";
import type { Agent } from "@/types/agente";
import type { DB } from "./types";

export interface OptionItem {
  id: string;
  name: string;
  subtitle?: string;
  category?: string;
  badge?: string;
}

export const DEFAULT_PLANS: OptionItem[] = [
  { id: "1", name: "Plano Básico", subtitle: "R$ 29,90/mês", badge: "Mensal", category: "Básico" },
  { id: "2", name: "Plano Pro", subtitle: "R$ 59,90/mês", badge: "Mensal / Anual", category: "Recomendado" },
  { id: "3", name: "Plano Vitalício", subtitle: "R$ 499,90", badge: "Vitalício", category: "Completo" },
];

/**
 * Obtém a lista de cursos disponíveis para vínculo.
 * Tenta buscar do banco de dados e recorre ao catálogo padrão se vazio.
 */
export async function getAvailableCourses(db?: DB): Promise<OptionItem[]> {
  if (db) {
    try {
      const { data, error } = await db
        .from("courses")
        .select("id, title, category, level")
        .order("title", { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((c: { id: string; title: string; category?: string; level?: string }) => ({
          id: c.id,
          name: c.title,
          subtitle: c.level || "Curso",
          category: c.category || "Geral",
        }));
      }
    } catch {
      // fallback
    }
  }

  return CATALOG_COURSES.map((c) => ({
    id: c.id,
    name: c.title,
    subtitle: `${c.level} · ${c.duration}`,
    category: c.category,
  }));
}

/**
 * Obtém a lista de planos de assinatura disponíveis para vínculo.
 */
export async function getAvailablePlans(db?: DB): Promise<OptionItem[]> {
  if (db) {
    try {
      const { data, error } = await db
        .from("plans")
        .select("id, name, price, frequency, is_highlighted")
        .order("order_index", { ascending: true })
        .order("price", { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((p: { id: string; name: string; price?: number; frequency?: string; is_highlighted?: boolean }) => ({
          id: p.id,
          name: p.name,
          subtitle: p.price != null ? `R$ ${Number(p.price).toFixed(2).replace(".", ",")}` : undefined,
          badge: p.frequency ? p.frequency.charAt(0).toUpperCase() + p.frequency.slice(1) : undefined,
          category: p.is_highlighted ? "Destaque" : undefined,
        }));
      }
    } catch {
      // fallback
    }
  }

  return DEFAULT_PLANS;
}

export interface UserAccessContext {
  userId?: string | null;
  isAdmin?: boolean;
  enrolledCourseIds?: string[];
  activePlanIds?: string[];
}

export interface AgentAccessResult {
  hasAccess: boolean;
  isRestricted: boolean;
  reason?: "admin" | "unrestricted" | "enrolled_course" | "active_plan" | "no_access";
  missingCourses?: string[];
  missingPlans?: string[];
}

/**
 * Verifica se um usuário possui acesso a um agente baseado em:
 * 1. Admin tem acesso irrestrito
 * 2. Agente sem restrições (sem courseIds e sem planIds) é livre para todos
 * 3. Aluno matriculado em qualquer um dos courseIds vinculados
 * 4. Aluno assinante de qualquer um dos planIds vinculados
 */
export function checkAgentAccess(
  agent: Pick<Agent, "courseIds" | "planIds" | "courseTitles" | "planNames">,
  userContext: UserAccessContext = {},
): AgentAccessResult {
  const { isAdmin = false, enrolledCourseIds = [], activePlanIds = [] } = userContext;

  if (isAdmin) {
    return { hasAccess: true, isRestricted: false, reason: "admin" };
  }

  const courseIds = (agent.courseIds ?? []).filter(Boolean);
  const planIds = (agent.planIds ?? []).filter(Boolean);

  const isRestricted = courseIds.length > 0 || planIds.length > 0;

  // Sem restrições = liberado para todos
  if (!isRestricted) {
    return { hasAccess: true, isRestricted: false, reason: "unrestricted" };
  }

  // Verifica se o aluno possui algum dos cursos vinculados
  if (courseIds.length > 0 && enrolledCourseIds.some((id) => courseIds.includes(id))) {
    return { hasAccess: true, isRestricted: true, reason: "enrolled_course" };
  }

  // Verifica se o aluno possui algum dos planos vinculados
  if (planIds.length > 0 && activePlanIds.some((id) => planIds.includes(id))) {
    return { hasAccess: true, isRestricted: true, reason: "active_plan" };
  }

  return {
    hasAccess: false,
    isRestricted: true,
    reason: "no_access",
    missingCourses: agent.courseTitles ?? [],
    missingPlans: agent.planNames ?? [],
  };
}

/**
 * Retorna uma descrição amigável das regras de acesso ao agente.
 */
export function formatAgentAccessSummary(
  agent: Pick<Agent, "courseIds" | "planIds" | "courseTitles" | "planNames">,
): string {
  const courseCount = agent.courseIds?.length ?? 0;
  const planCount = agent.planIds?.length ?? 0;

  if (courseCount === 0 && planCount === 0) {
    return "Acesso livre para todos os alunos da plataforma";
  }

  const parts: string[] = [];

  if (courseCount > 0) {
    if (courseCount === 1 && agent.courseTitles?.[0]) {
      parts.push(`Curso “${agent.courseTitles[0]}”`);
    } else {
      parts.push(`${courseCount} ${courseCount === 1 ? "curso vinculado" : "cursos vinculados"}`);
    }
  }

  if (planCount > 0) {
    if (planCount === 1 && agent.planNames?.[0]) {
      parts.push(`Plano “${agent.planNames[0]}”`);
    } else {
      parts.push(`${planCount} ${planCount === 1 ? "plano vinculado" : "planos vinculados"}`);
    }
  }

  return `Disponível para alunos de ${parts.join(" ou ")}`;
}
