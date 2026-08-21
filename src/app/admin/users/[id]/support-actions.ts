"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin";
}

export async function resendAccessEmail(userId: string, email: string) {
  if (!(await checkAdmin())) return { success: false, message: "Acesso negado." };
  
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (error) {
    console.error("Error resending access email", error);
    return { success: false, message: "Erro ao enviar e-mail de acesso." };
  }

  return { success: true, message: "E-mail de acesso reenviado com sucesso!" };
}

export async function resetUserPassword(userId: string, email: string) {
  if (!(await checkAdmin())) return { success: false, message: "Acesso negado." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error) {
    console.error("Error sending reset password link", error);
    return { success: false, message: "Erro ao enviar link de redefinição de senha." };
  }

  return { success: true, message: "E-mail de redefinição de senha enviado!" };
}

export async function forceUserLogoff(userId: string) {
  if (!(await checkAdmin())) return { success: false, message: "Acesso negado." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.signOut(userId);

  if (error) {
    console.error("Error forcing logoff", error);
    return { success: false, message: "Erro ao forçar logoff." };
  }

  return { success: true, message: "Logoff forçado com sucesso! Todas as sessões foram encerradas." };
}

export async function updateUserConfig(userId: string, data: { status: string; role: string }) {
  if (!(await checkAdmin())) return { success: false, message: "Acesso negado." };

  const admin = createAdminClient();
  
  const { error } = await admin
    .from("profiles")
    .update({ 
      status: data.status,
      role: data.role
    })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user config", error);
    return { success: false, message: "Erro ao atualizar configurações." };
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath(`/admin/users/${userId}/configuracoes`);
  return { success: true, message: "Configurações atualizadas com sucesso!" };
}
