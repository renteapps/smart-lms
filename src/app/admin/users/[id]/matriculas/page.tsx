import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProgressByCourse } from "@/lib/data/courses";
import { MatriculasClient } from "./MatriculasClient";
import { AvailableCourse, EnrollmentItem } from "./EnrollmentModals";

export default async function AdminUserMatriculasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Busca perfil do usuário
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", id)
    .maybeSingle();

  if (profileErr || !profile) {
    notFound();
  }

  // 2. Busca matrículas do usuário
  const { data: enrollments, error: enrollmentsErr } = await supabase
    .from("enrollments")
    .select(`
      id,
      status,
      enrolled_at,
      expires_at,
      course_id,
      course:courses (
        id,
        title,
        category,
        cover_url,
        duration
      )
    `)
    .eq("user_id", id)
    .order("enrolled_at", { ascending: false });

  if (enrollmentsErr) {
    console.error("Erro ao buscar matrículas do usuário:", enrollmentsErr);
    notFound();
  }

  // 3. Busca lista de todos os cursos disponíveis na plataforma
  const { data: allCourses } = await supabase
    .from("courses")
    .select("id, title, category, cover_url, duration")
    .order("title", { ascending: true });

  const availableCourses: AvailableCourse[] = (allCourses ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category || "Geral",
    coverUrl: c.cover_url || undefined,
    duration: c.duration || undefined,
  }));

  // 4. Busca progresso por curso
  const progressByCourse = await getProgressByCourse(supabase, id);

  const nowMs = Date.now();

  const matriculas: EnrollmentItem[] = (enrollments ?? []).map((enrollment) => {
    const c = Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course;
    const progress = progressByCourse.get(c?.id || "") ?? 0;

    const expiresAt = enrollment.expires_at;
    const isExpired = expiresAt ? new Date(expiresAt).getTime() < nowMs : false;

    // Formatação de data de expiração
    let expirationLabel = "Vitalício";
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      const formattedExpDate = expDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      expirationLabel = isExpired ? `Expirou em ${formattedExpDate}` : `Expira em ${formattedExpDate}`;
    }

    // Status e tom do badge
    let displayStatus = "Não iniciado";
    let statusTone: "positive" | "primary" | "neutral" | "negative" = "neutral";

    if (isExpired) {
      displayStatus = "Expirado";
      statusTone = "negative";
    } else if (progress === 100 || enrollment.status === "completed") {
      displayStatus = "Concluído";
      statusTone = "positive";
    } else if (progress > 0 || enrollment.status === "active") {
      displayStatus = "Em andamento";
      statusTone = "primary";
    }

    const enrolledAtStr = new Date(enrollment.enrolled_at).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return {
      id: enrollment.id,
      enrollmentId: enrollment.id,
      courseId: c?.id || enrollment.course_id,
      courseName: c?.title || "Curso Removido",
      category: c?.category || "Geral",
      progress: `${progress}%`,
      rawProgress: progress,
      status: displayStatus,
      statusTone,
      enrolledAt: enrolledAtStr,
      expiresAt: expiresAt || null,
      expirationLabel,
      isExpired,
    };
  });

  return (
    <MatriculasClient
      userId={profile.id}
      userName={profile.full_name || "Usuário"}
      userEmail={profile.email || ""}
      matriculas={matriculas}
      availableCourses={availableCourses}
    />
  );
}
