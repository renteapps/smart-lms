import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/auth";
import { getProfileTestBySlug } from "@/lib/data/profileTests";
import { TakeTestClient } from "./TakeTestClient";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const { supabase } = await getSessionUser();
  const test = await getProfileTestBySlug(supabase, resolvedParams.slug);

  if (!test) {
    return { title: "Teste não encontrado" };
  }

  return {
    title: test.title,
    description: test.description,
  };
}

export default async function DiagnosticoPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const { supabase, user } = await getSessionUser();
  const test = await getProfileTestBySlug(supabase, resolvedParams.slug);

  if (!test || test.status !== "published") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-center px-4">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground mb-2">Teste Indisponível</h1>
          <p className="text-muted">Este teste não foi encontrado ou não está mais disponível.</p>
        </div>
      </div>
    );
  }

  const accessType = test.accessType || "logged_in";
  const isPublicFlow = accessType === "public";

  // Access Control
  if (accessType !== "public") {
    if (!user) {
      redirect(`/login?next=/diagnostico/${test.slug}`);
    }

    if (accessType === "course_owners") {
      // Very basic check. We could use `getEnrolledCourses` or `getCourseAccessMap`
      // For now, if the user doesn't have access, we'll show access denied.
      // Assuming we have an endpoint or logic to verify access.
      const { data: profiles } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const isAdmin = profiles?.role === "admin";
      
      if (!isAdmin && test.requiredCourseIds && test.requiredCourseIds.length > 0) {
          // Fetch student_courses to verify ownership
          const { data: enrollments } = await supabase
             .from("student_courses")
             .select("course_id")
             .eq("user_id", user.id)
             .in("course_id", test.requiredCourseIds);
             
          if (!enrollments || enrollments.length === 0) {
            return (
              <div className="min-h-screen flex items-center justify-center bg-bg text-center px-4">
                <div>
                  <h1 className="text-2xl font-black font-display text-foreground mb-2">Acesso Restrito</h1>
                  <p className="text-muted">Você não possui os cursos necessários para realizar este teste.</p>
                </div>
              </div>
            );
          }
      }
    }

    if (accessType === "plan_owners") {
      const { data: profiles } = await supabase.from("profiles").select("role, plan_id").eq("id", user.id).single();
      const isAdmin = profiles?.role === "admin";
      
      if (!isAdmin && test.requiredPlanIds && test.requiredPlanIds.length > 0) {
         if (!profiles?.plan_id || !test.requiredPlanIds.includes(profiles.plan_id)) {
            return (
              <div className="min-h-screen flex items-center justify-center bg-bg text-center px-4">
                <div>
                  <h1 className="text-2xl font-black font-display text-foreground mb-2">Acesso Restrito</h1>
                  <p className="text-muted">Seu plano atual não permite o acesso a este teste.</p>
                </div>
              </div>
            );
         }
      }
    }
  }

  return <TakeTestClient test={test} isPublicFlow={isPublicFlow && !user} />;
}
