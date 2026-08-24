import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProfileTest } from "@/types/profileTest";

type DailyPillData = { id: string; title: string; challenge: string; likesCount?: number };
type ProfileTestRow = {
  id: string;
  title: string;
  description: string;
  cover_url?: string;
  status: ProfileTest["status"];
  result_type?: ProfileTest["resultType"];
  categories: ProfileTest["categories"];
  questions: ProfileTest["questions"];
  created_at: string;
  updated_at: string;
};

export function useSupabaseData() {
  const [dailyPill, setDailyPill] = useState<DailyPillData | null>(null);
  const [profileTests, setProfileTests] = useState<ProfileTest[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch daily pill with user personalization (days after signup, tags, and not dismissed/completed)
        const today = new Date().toISOString().slice(0, 10);
        const { data: { user } } = await supabase.auth.getUser();

        const inactivePillIds = new Set<string>();
        const userTags = new Set<string>();
        let daysSinceSignup = 0;

        if (user) {
          const [interactionsRes, profileRes, trailRes, questionnaireRes] = await Promise.all([
            supabase.from("pilula_interactions").select("pilula_id, completed, dismissed").eq("user_id", user.id),
            supabase.from("profiles").select("created_at").eq("id", user.id).maybeSingle(),
            supabase.from("student_trails").select("questionnaire_data").eq("user_id", user.id).maybeSingle(),
            supabase.from("trail_questionnaires").select("questions").eq("status", "published").maybeSingle(),
          ]);

          (interactionsRes.data || []).forEach((row: { pilula_id: string; completed?: boolean; dismissed?: boolean }) => {
            if (row.completed || row.dismissed) {
              inactivePillIds.add(row.pilula_id);
            }
          });

          if (profileRes.data?.created_at) {
            const userCreatedAt = new Date(profileRes.data.created_at);
            daysSinceSignup = Math.max(0, Math.floor((Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24)));
          }

          const answers = (trailRes.data?.questionnaire_data as { answers?: Record<string, string[]> })?.answers || {};
          const questions = (questionnaireRes.data?.questions as Array<{ id: string; options: Array<{ label: string; tags?: string[] }> }>) || [];
          questions.forEach((q) => {
            const selected = answers[q.id] || [];
            q.options.forEach((opt) => {
              if (selected.includes(opt.label)) {
                userTags.add(opt.label.toLowerCase().trim());
                (opt.tags || []).forEach((t) => userTags.add(t.toLowerCase().trim()));
              }
            });
          });
        }

        const { data: allActive, error: pillError } = await supabase
          .from("pilulas")
          .select("*")
          .eq("status", "Ativa")
          .or(`publish_date.is.null,publish_date.lte.${today}`);

        if (!pillError && Array.isArray(allActive)) {
          const eligible = allActive.filter((p) => {
            if (inactivePillIds.has(p.id)) return false;
            if (p.days_after_signup !== null && p.days_after_signup !== undefined) {
              if (daysSinceSignup < Number(p.days_after_signup)) return false;
            }
            const pillTags: string[] = Array.isArray(p.target_tags) ? p.target_tags : [];
            if (pillTags.length > 0) {
              const hasTag = pillTags.some((t) => userTags.has(t.toLowerCase().trim()));
              if (!hasTag) return false;
            }
            return true;
          });

          if (eligible.length > 0) {
            eligible.sort((a, b) => {
              const aTags: string[] = Array.isArray(a.target_tags) ? a.target_tags : [];
              const bTags: string[] = Array.isArray(b.target_tags) ? b.target_tags : [];
              const aTagMatches = aTags.filter((t) => userTags.has(t.toLowerCase().trim())).length;
              const bTagMatches = bTags.filter((t) => userTags.has(t.toLowerCase().trim())).length;
              if (aTagMatches !== bTagMatches) return bTagMatches - aTagMatches;

              const aDays = a.days_after_signup ?? -1;
              const bDays = b.days_after_signup ?? -1;
              if (aDays !== bDays) return bDays - aDays;

              const aTime = new Date(a.publish_date || a.created_at).getTime();
              const bTime = new Date(b.publish_date || b.created_at).getTime();
              return bTime - aTime;
            });
            const chosen = eligible[0];
            const { count: likesCount } = await supabase
              .from("pilula_interactions")
              .select("*", { count: "exact", head: true })
              .eq("pilula_id", chosen.id)
              .eq("liked", true);

            setDailyPill({
              id: chosen.id,
              title: chosen.title,
              challenge: chosen.challenge,
              likesCount: likesCount ?? 0,
            });
          } else {
            setDailyPill(null);
          }
        }

        // Fetch profile tests
        const { data: testsData, error: testsError } = await supabase
          .from("profile_tests")
          .select("*")
          .eq("status", "published");

        if (!testsError && testsData) {
          const mappedTests = (testsData as ProfileTestRow[]).map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            coverUrl: t.cover_url,
            status: t.status,
            resultType: t.result_type,
            categories: t.categories,
            questions: t.questions,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
          }));
          setProfileTests(mappedTests);
        }
      } catch (error) {
        console.error("Error fetching data from Supabase:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [supabase]);

  return { dailyPill, profileTests, loading };
}
