"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CATALOG_COURSES } from "@/lib/catalog";
import { getCourseSalesConfig } from "@/lib/salesUrlHelper";

export interface SaleCourse {
  id: string;
  title: string;
  category: string;
  description: string | null;
  cover_url: string | null;
  level: string | null;
  duration: string | null;
  sales_url: string | null;
}

export type UserAccessState =
  | { status: "loading" }
  /** Tem pelo menos uma matrícula ativa ou assinatura ativa. */
  | { status: "has-access" }
  /** Sem acesso — exibe vitrine de compra. */
  | { status: "no-access"; courses: SaleCourse[] }
  | { status: "unauthenticated" };

/**
 * Verifica se o usuário logado tem acesso a algum conteúdo:
 * - Uma matrícula ativa (enrollments.status = 'active'), OU
 * - Uma assinatura ativa (subscriptions.status = 'active')
 *
 * Se não tiver acesso, também busca os cursos publicados com seus links
 * de compra para montar a vitrine na home.
 *
 * O hook só executa o fetch quando `enabled = true` para evitar
 * chamadas desnecessárias em usuários que já têm trilha montada.
 */
export function useUserAccess(enabled: boolean): UserAccessState {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [state, setState] = useState<UserAccessState>({ status: "loading" });

  useEffect(() => {
    if (!enabled) return;
    if (isAuthLoading) return;

    if (!user) {
      setState({ status: "unauthenticated" });
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    async function checkAccess() {
      setState({ status: "loading" });

      try {
        // Verifica matrícula ativa
        const { data: enrollment, error: enrollErr } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", user!.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (enrollErr) console.warn("useUserAccess: erro ao checar matrículas", enrollErr.message);

        if (enrollment) {
          if (!cancelled) setState({ status: "has-access" });
          return;
        }

        // Verifica assinatura ativa
        const { data: subscription, error: subErr } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", user!.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (subErr) console.warn("useUserAccess: erro ao checar assinaturas", subErr.message);

        if (subscription) {
          if (!cancelled) setState({ status: "has-access" });
          return;
        }

        // Sem acesso → busca cursos publicados para a vitrine
        const { data: courses, error: coursesErr } = await supabase
          .from("courses")
          .select("id, title, category, description, cover_url, level, duration, sales_url")
          .eq("is_published", true)
          .order("created_at", { ascending: true });

        if (coursesErr) console.warn("useUserAccess: erro ao buscar cursos", coursesErr.message);

        let finalCourses: SaleCourse[] = [];
        if (courses && courses.length > 0) {
          finalCourses = (courses as SaleCourse[]).map((c) => ({
            ...c,
            sales_url: c.sales_url || getCourseSalesConfig(c.id, c.title).salesUrl || null,
          }));
        } else {
          // Fallback para catálogo padrão se a tabela estiver sem registros
          finalCourses = CATALOG_COURSES.map((c) => ({
            id: c.id,
            title: c.title,
            category: c.category,
            description: c.description,
            cover_url: c.cover,
            level: c.level,
            duration: c.duration,
            sales_url: getCourseSalesConfig(c.id, c.title).salesUrl || null,
          }));
        }

        if (!cancelled) {
          setState({ status: "no-access", courses: finalCourses });
        }
      } catch (err) {
        console.error("useUserAccess: erro inesperado", err);
        // Em caso de erro, fallback para catálogo
        const fallbackCourses: SaleCourse[] = CATALOG_COURSES.map((c) => ({
          id: c.id,
          title: c.title,
          category: c.category,
          description: c.description,
          cover_url: c.cover,
          level: c.level,
          duration: c.duration,
          sales_url: getCourseSalesConfig(c.id, c.title).salesUrl || null,
        }));
        if (!cancelled) setState({ status: "no-access", courses: fallbackCourses });
      }
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [enabled, user, isAuthLoading]);

  return state;
}
