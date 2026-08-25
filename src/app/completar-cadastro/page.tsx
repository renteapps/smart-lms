import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/auth";
import { isProfileComplete } from "@/lib/profileCompleteness";
import { CompleteProfileForm } from "./CompleteProfileForm";

export const metadata: Metadata = {
  title: "Complete seu cadastro",
  description: "Falta pouco para liberar o acesso completo à plataforma.",
};

/**
 * Etapa obrigatória para quem chegou pelo webhook de compra (Eduzz/Hotmart) e
 * nunca passou pelo formulário de /criar-conta — ver lib/profileCompleteness.ts
 * para o porquê desses seis campos especificamente. O bloqueio de verdade é no
 * middleware; esta página só apresenta o formulário e, se alguém chegar aqui
 * já com o perfil completo (voltou pela URL salva, por exemplo), manda de
 * volta para onde ela estava indo.
 */
export default async function CompletarCadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { supabase, user } = await requireUser();
  const { next } = await searchParams;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, phone, birth_date, gender, career_role")
    .eq("id", user.id)
    .maybeSingle();

  const initial = {
    fullName: profile?.full_name ?? "",
    username: profile?.username ?? "",
    phone: profile?.phone ?? "",
    birthDate: profile?.birth_date ?? "",
    gender: profile?.gender ?? "",
    careerRole: profile?.career_role ?? "",
  };

  if (profile && isProfileComplete({
    fullName: profile.full_name,
    username: profile.username,
    phone: profile.phone,
    birthDate: profile.birth_date,
    gender: profile.gender,
    careerRole: profile.career_role,
  })) {
    redirect(next && next.startsWith("/") ? next : "/");
  }

  return <CompleteProfileForm initial={initial} next={next && next.startsWith("/") ? next : "/"} />;
}
