"use server";

import { revalidatePath } from "next/cache";
import { parseAiCreditBalance, type AiCreditBalance } from "@/lib/aiCredits";
import { createClient } from "@/lib/supabase/server";

type AddAiCreditsResult =
  | { success: true; balance: AiCreditBalance }
  | { success: false; message: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function addAiCreditsToUser(userId: string, amount: number): Promise<AddAiCreditsResult> {
  if (!UUID_PATTERN.test(userId)) {
    return { success: false, message: "Usuário inválido." };
  }

  if (!Number.isInteger(amount) || amount < 1 || amount > 10000) {
    return { success: false, message: "Informe uma quantidade entre 1 e 10.000 créditos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Sua sessão expirou. Entre novamente para continuar." };
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (callerProfile?.role !== "admin") {
    return { success: false, message: "Somente administradores podem adicionar créditos." };
  }

  const { data, error } = await supabase.rpc("add_ai_credits", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    console.error("[admin:add-ai-credits]", error.message);
    return { success: false, message: "Não foi possível adicionar os créditos. Tente novamente." };
  }

  const balance = parseAiCreditBalance(data);
  if (!balance) {
    return { success: false, message: "Os créditos foram processados, mas o novo saldo não pôde ser carregado." };
  }

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/perfil");

  return { success: true, balance };
}
