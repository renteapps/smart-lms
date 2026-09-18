"use server";

import { requireAdmin } from "@/lib/supabase/auth";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(id: string, data: {
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  company: string;
  careerRole: string;
  department: string;
  zipCode: string;
  address: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  state: string;
}) {
  const { supabase, adminClient, user: currentUser } = await requireAdmin();

  const fullName = data.fullName;
  const email = data.email;
  const phone = data.phone;
  const birthDate = data.birthDate;
  
  const company = data.company;
  const careerRole = data.careerRole;
  const department = data.department;

  const zipCode = data.zipCode;
  const address = data.address;
  const addressNumber = data.addressNumber;
  const neighborhood = data.neighborhood;
  const city = data.city;
  const state = data.state;

  // Atualiza também no array preferences
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences, email")
    .eq("id", id)
    .single();

  const currentPreferences = (profile?.preferences as Record<string, unknown>) || {};
  
  const newPreferences = {
    ...currentPreferences,
    department,
    zipCode,
    address,
    addressNumber,
    neighborhood
  };

  // profiles.email é espelho de auth.users (trigger sync_profile_email) e é a
  // chave com que o webhook de pagamento acha o comprador. Trocar só o espelho
  // descasava os dois; a troca vai pelo Auth e o trigger atualiza o perfil.
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail && normalizedEmail !== (profile?.email ?? "").toLowerCase()) {
    const { error: emailError } = await adminClient.auth.admin.updateUserById(id, { email: normalizedEmail });
    if (emailError) {
      console.error("Erro ao atualizar e-mail:", emailError);
      return { error: "Não foi possível alterar o e-mail." };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
      birth_date: birthDate || null,
      company: company || null,
      career_role: careerRole || null,
      city: city || null,
      state: state || null,
      preferences: newPreferences,
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar perfil:", error);
    return { error: "Não foi possível salvar as alterações." };
  }

  // Quem fez é o admin; o usuário editado é o alvo (o histórico lê as duas colunas).
  await supabase.from("audit_logs").insert({
    actor_id: currentUser.id,
    action: "update_profile",
    target_type: "user",
    target_id: id,
    metadata: { admin_id: currentUser.id },
  });

  revalidatePath(`/admin/users/${id}`);
  revalidatePath(`/admin/users/${id}/editar`);
  revalidatePath(`/admin/users/${id}/historico`);

  return { success: true };
}
