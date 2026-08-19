"use server";

import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

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
    .select("preferences")
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

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      email: email,
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

  // Registra no histórico de acesso
  const { data: userResponse } = await supabase.auth.getUser();
  const currentUser = userResponse.user;
  
  if (currentUser) {
    await supabase.from("audit_logs").insert({
      actor_id: id,
      action: "update_profile",
      metadata: { admin_id: currentUser.id },
      ip_address: "::1", // Pelo server actions não temos o IP direto tão fácil, usando fallback
    });
  }

  revalidatePath(`/admin/users/${id}`);
  revalidatePath(`/admin/users/${id}/editar`);
  revalidatePath(`/admin/users/${id}/historico`);

  return { success: true };
}
