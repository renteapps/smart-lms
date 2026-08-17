import type { Metadata } from "next";
import { redirect } from "next/navigation";
import NotesClient from "@/components/notes/NotesClient";
import { getSessionUser } from "@/lib/supabase/auth";
import { getNotes } from "@/lib/data/notes";

export const metadata: Metadata = {
  title: "Anotações | Smart LMS",
  description: "Seu caderno de anotações de aulas, agentes e ideias soltas.",
};

export default async function NotasPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/acessar?redirect=/notas");

  const notes = await getNotes(supabase, user.id);

  return <NotesClient initialNotes={notes} />;
}
