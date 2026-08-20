import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CatalogCourse } from "@/types/course";
import type { ProfileTest } from "@/types/profileTest";

export function useSupabaseData() {
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [dailyPill, setDailyPill] = useState<any>(null);
  const [profileTests, setProfileTests] = useState<ProfileTest[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("*")
          .order("created_at", { ascending: false });

        if (!coursesError && coursesData) {
          const mappedCourses = coursesData.map(c => ({
            id: c.id,
            title: c.title,
            category: c.category,
            description: c.description || c.short_description || "",
            cover: c.cover_url || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=85&w=1200&auto=format&fit=crop",
            duration: c.duration || "0h 0min",
            lessonCount: 0, // Should be fetched from related lessons table ideally
            level: c.level as any,
          }));
          setCourses(mappedCourses);
        }

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
          const mappedTests = testsData.map((t: any) => ({
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

  return { courses, dailyPill, profileTests, loading };
}
