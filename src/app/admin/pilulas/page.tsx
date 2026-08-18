import { createClient } from "@/lib/supabase/server";
import { AdminPilulasClient } from "./AdminPilulasClient";

export default async function AdminPilulasPage() {
  const supabase = await createClient();

  const { data: dbPilulas } = await supabase
    .from("pilulas")
    .select("*")
    .order("created_at", { ascending: false });

  // Map to the format expected by the frontend
  const initialPilulas = (dbPilulas || []).map((dbPilula) => ({
    id: dbPilula.id,
    title: dbPilula.title,
    category: dbPilula.category,
    format: dbPilula.format,
    summary: dbPilula.summary,
    challenge: dbPilula.challenge,
    estimatedMinutes: dbPilula.estimated_minutes,
    courseTitle: dbPilula.course_title,
    status: dbPilula.status,
    mediaUrl: dbPilula.media_url,
    publishDate: dbPilula.publish_date,
    completionsCount: dbPilula.completions_count || 0,
    likesCount: dbPilula.likes_count || 0,
    createdAt: dbPilula.created_at,
    updatedAt: dbPilula.updated_at,
  }));

  return <AdminPilulasClient initialPilulas={initialPilulas} />;
}
