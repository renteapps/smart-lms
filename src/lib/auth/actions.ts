"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";

export type AuthActionResult = {
  success: boolean;
  error?: string;
  message?: string;
  redirectTo?: string;
  requiresEmailConfirmation?: boolean;
};

async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3888";
  const proto = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signInWithPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const next = (formData.get("next") as string) || "/minha-trilha";

  if (!email || !password) {
    return {
      success: false,
      error: "Por favor, preencha seu e-mail e sua senha.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    let message = "Credenciais inválidas. Verifique seu e-mail e senha.";
    if (error.message.includes("Email not confirmed")) {
      message = "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou solicite novo link.";
    } else if (error.message.includes("Invalid login credentials")) {
      message = "E-mail ou senha incorretos. Tente novamente.";
    }
    return {
      success: false,
      error: message,
    };
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    redirectTo: next,
  };
}

export async function signInWithOtpAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const next = (formData.get("next") as string) || "/minha-trilha";

  if (!email) {
    return {
      success: false,
      error: "Por favor, informe seu e-mail institucional ou pessoal.",
    };
  }

  const origin = await getOrigin();
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: false,
    },
  });

  if (error) {
    return {
      success: false,
      error: "Não foi possível enviar o link de acesso. Verifique se o e-mail está cadastrado.",
    };
  }

  return {
    success: true,
    message: `Enviamos um link mágico de acesso para ${email}. Verifique sua caixa de entrada e spam.`,
  };
}

export async function signUpAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const birthDate = (formData.get("birthDate") as string)?.trim();
  const gender = (formData.get("gender") as string)?.trim();
  const role = (formData.get("role") as string)?.trim();
  const next = (formData.get("next") as string) || "/onboarding";

  if (!email || !password || !fullName) {
    return {
      success: false,
      error: "Nome, e-mail e senha são obrigatórios.",
    };
  }

  if (password.length < 6) {
    return {
      success: false,
      error: "A senha deve conter no mínimo 6 caracteres.",
    };
  }

  const origin = await getOrigin();
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        birth_date: birthDate || null,
        gender: gender || null,
        role: role || null,
      },
      emailRedirectTo,
    },
  });

  if (error) {
    let message = error.message;
    if (error.message.includes("User already registered")) {
      message = "Este endereço de e-mail já possui uma conta ativa. Faça login para continuar.";
    } else if (
      error.message.includes("email rate limit exceeded") ||
      error.message.toLowerCase().includes("rate limit")
    ) {
      message = "Muitas mensagens de e-mail foram solicitadas recentemente. Por favor, verifique sua caixa de entrada e spam ou aguarde alguns minutos antes de tentar novamente.";
    }
    return {
      success: false,
      error: message,
    };
  }

  revalidatePath("/", "layout");

  // Se a confirmação de e-mail estiver ativa no Supabase e a sessão for nula
  const requiresEmailConfirmation = !data.session;

  return {
    success: true,
    requiresEmailConfirmation,
    redirectTo: requiresEmailConfirmation
      ? `/confirmar?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`
      : next,
    message: requiresEmailConfirmation
      ? `Enviamos uma mensagem de confirmação para ${email} com o botão Acessar Portal.`
      : "Conta criada e autenticada com sucesso!",
  };
}

export async function resendSignUpEmailAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const next = (formData.get("next") as string) || "/onboarding";

  if (!email) {
    return {
      success: false,
      error: "Informe o e-mail para reenviar a confirmação.",
    };
  }

  const origin = await getOrigin();
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    let message = error.message;
    if (
      error.message.includes("email rate limit exceeded") ||
      error.message.toLowerCase().includes("rate limit")
    ) {
      message = "Limite temporário de envio de e-mails atingido. Por favor, aguarde alguns minutos antes de solicitar novo reenvio.";
    }
    return {
      success: false,
      error: message,
    };
  }

  return {
    success: true,
    message: `E-mail de confirmação reenviado para ${email}. Verifique sua caixa de entrada.`,
  };
}

export async function resetPasswordForEmailAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();

  if (!email) {
    return {
      success: false,
      error: "Por favor, informe seu e-mail cadastrado.",
    };
  }

  const origin = await getOrigin();
  const redirectTo = `${origin}/auth/confirm?type=recovery&next=/resetar-senha?mode=update`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return {
      success: false,
      error: "Não conseguimos enviar o link de recuperação. Tente novamente mais tarde.",
    };
  }

  return {
    success: true,
    message: `As instruções de redefinição de senha foram enviadas para ${email}.`,
  };
}

export async function updateUserPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password) {
    return {
      success: false,
      error: "Por favor, informe sua nova senha.",
    };
  }

  if (password.length < 6) {
    return {
      success: false,
      error: "A nova senha precisa ter no mínimo 6 caracteres.",
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      error: "As senhas informadas não coincidem.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      success: false,
      error: "Não foi possível atualizar a senha. O link pode ter expirado.",
    };
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    message: "Sua senha foi redefinida com sucesso!",
    redirectTo: "/minha-trilha",
  };
}

export async function verifyOtpAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim();
  const token = (formData.get("token") as string)?.trim();
  const type = (formData.get("type") as EmailOtpType) || "signup";
  const next = (formData.get("next") as string) || "/minha-trilha";

  if (!email || !token) {
    return {
      success: false,
      error: "E-mail e código de verificação são obrigatórios.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type,
  });

  if (error) {
    return {
      success: false,
      error: "Código de verificação incorreto ou expirado. Tente novamente.",
    };
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    redirectTo: next,
  };
}
