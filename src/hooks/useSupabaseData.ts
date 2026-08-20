import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProfileTest } from "@/types/profileTest";

type DailyPillData = { id: string; title: string; challenge: string };
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
        // Fetch daily pill (get one active pill)
        const { data: pillData, error: pillError } = await supabase
          .from("pilulas")
          .select("*")
          .eq("status", "Ativa")
          .limit(1)
          .single();

        if (!pillError && pillData) {
          setDailyPill(pillData);
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
