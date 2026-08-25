"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getCourseSalesConfig } from "@/lib/salesUrlHelper";
import { isSubscriptionActive } from "@/lib/courseAccess";

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
 * - Uma assinatura que concede acesso segundo status + data de corte.
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
      const frame = window.requestAnimationFrame(() => setState({ status: "unauthenticated" }));
      return () => window.cancelAnimationFrame(frame);
    }

    let cancelled = false;
    const supabase = createClient();

    async function checkAccess() {
      setState({ status: "loading" });

      try {
        // Verifica matrícula ativa
        const nowIso = new Date().toISOString();
        const { data: enrollment, error: enrollErr } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", user!.id)
          .eq("status", "active")
          .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
          .limit(1)
          .maybeSingle();

        if (enrollErr) console.warn("useUserAccess: erro ao checar matrículas", enrollErr.message);

        if (enrollment) {
          if (!cancelled) setState({ status: "has-access" });
          return;
        }

        // Verifica assinatura ativa
        const { data: subscriptions, error: subErr } = await supabase
          .from("subscriptions")
          .select("id, status, current_period_end")
          .eq("user_id", user!.id);

        if (subErr) console.warn("useUserAccess: erro ao checar assinaturas", subErr.message);

        if ((subscriptions ?? []).some((subscription) => isSubscriptionActive({
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
        }))) {
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
        }

        if (!cancelled) {
          setState({ status: "no-access", courses: finalCourses });
        }
      } catch (err) {
        console.error("useUserAccess: erro inesperado", err);
        if (!cancelled) setState({ status: "no-access", courses: [] });
      }
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [enabled, user, isAuthLoading]);

  return state;
}
