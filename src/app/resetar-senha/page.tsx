"use client";

import React, { Suspense, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Mail, RefreshCw } from "lucide-react";
import {
  Alert,
  Button,
  FieldError,
  InputGroup,
  Label,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import { AuthLayoutShell } from "@/components/auth/AuthLayoutShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function ResetarSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [mode, setMode] = useState<"request" | "update">(
    modeParam === "update" ? "update" : "request"
  );

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && mode === "request") {
      router.replace("/");
    }
  }, [isAuthLoading, isAuthenticated, mode, router]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (modeParam === "update") {
      setMode("update");
    }
  }, [modeParam]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("Por favor, digite seu e-mail para receber as instruções.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const redirectTo = `${origin}/auth/confirm?type=recovery&next=/resetar-senha?mode=update`;

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo,
        });

        if (error) {
          let message = error.message;
          if (
            error.message.includes("email rate limit exceeded") ||
            error.message.toLowerCase().includes("rate limit")
          ) {
            message = "Muitas mensagens de e-mail foram solicitadas recentemente. Aguarde alguns minutos antes de tentar novamente.";
          } else if (
            error.message.includes("Invalid path") ||
            error.message.includes("Failed to fetch") ||
            error.message.includes("NetworkError")
          ) {
            message = "Falha ao conectar aos serviços de autenticação. Tente novamente mais tarde.";
          }
          setErrorMessage(message);
          return;
        }

        setIsSuccess(true);
        setResendCooldown(60);
        toast.success("E-mail enviado!", {
          description: "Verifique sua caixa de entrada para redefinir a senha.",
        });
      } catch (err: any) {
        setErrorMessage(err?.message || "Falha ao enviar e-mail de recuperação.");
      }
    });
  };

  const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password) {
      setErrorMessage("Por favor, crie uma nova senha.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("As duas senhas informadas não são iguais.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({
          password,
        });

        if (error) {
          setErrorMessage(error.message || "Não foi possível atualizar sua senha.");
          return;
        }

        toast.success("Senha alterada com sucesso!");
        router.push("/acessar?message=" + encodeURIComponent("Senha atualizada! Acesse sua conta agora."));
        router.refresh();
      } catch (err: any) {
        setErrorMessage(err?.message || "Ocorreu um erro ao salvar sua nova senha.");
      }
    });
  };

  // Se o usuário está no modo de solicitação e já enviou o e-mail com sucesso:
  if (mode === "request" && isSuccess) {
    return (
      <AuthLayoutShell
        title="Verifique seu e-mail"
        subtitle={`Enviamos as instruções e o link seguro de recuperação para ${email}.`}
        eyebrow="Recuperação de senha"
        footerText="Lembrou sua senha?"
        footerLinkText="Voltar para login"
        footerLinkHref="/acessar"
      >
        <div className="space-y-6 text-center py-4">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-success-soft text-success">
            <Mail className="size-8" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-lg font-bold text-foreground">
              Link de redefinição enviado
            </h2>
            <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
              Clique no link contido na mensagem para criar sua nova senha. Não se esqueça de verificar a pasta de spam.
            </p>
          </div>

          <div className="pt-4 border-t border-hairline flex flex-col gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              isDisabled={resendCooldown > 0 || isPending}
              onClick={() => {
                const fakeForm = { preventDefault: () => {} } as React.FormEvent<HTMLFormElement>;
                handleRequestSubmit(fakeForm);
              }}
              className="h-11 rounded-xl font-semibold"
            >
              <RefreshCw className="size-4 mr-2" aria-hidden="true" />
              {resendCooldown > 0 ? `Reenviar e-mail em ${resendCooldown}s` : "Reenviar e-mail de recuperação"}
            </Button>

            <Link
              href="/acessar"
              className="text-xs font-semibold text-muted hover:text-foreground transition-colors"
            >
              Voltar ao login
            </Link>
          </div>
        </div>
      </AuthLayoutShell>
    );
  }

  // Modo de Atualização (Definição de Nova Senha)
  if (mode === "update") {
    return (
      <AuthLayoutShell
        title="Criar nova senha"
        subtitle="Escolha uma senha forte e segura para proteger seu acesso aos cursos e projetos."
        eyebrow="Redefinição de senha"
        footerText="Deseja cancelar?"
        footerLinkText="Ir para login"
        footerLinkHref="/acessar"
      >
        {errorMessage && (
          <Alert status="danger" className="mb-6">
            <Alert.Indicator>
              <AlertCircle className="size-4" aria-hidden="true" />
            </Alert.Indicator>
            <Alert.Content>
              <Alert.Title>Atenção</Alert.Title>
              <Alert.Description>{errorMessage}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <form onSubmit={handleUpdateSubmit} className="space-y-4">
          <div>
            <PasswordInput
              id="password"
              name="password"
              label="Nova senha"
              placeholder="Digite a nova senha"
              value={password}
              onChange={setPassword}
              isRequired
              autoComplete="new-password"
            />
            <PasswordStrengthIndicator password={password} />
          </div>

          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            label="Confirme a nova senha"
            placeholder="Repita a nova senha"
            value={confirmPassword}
            onChange={setConfirmPassword}
            isRequired
            autoComplete="new-password"
            isInvalid={!!password && !!confirmPassword && password !== confirmPassword}
            errorMessage={
              password && confirmPassword && password !== confirmPassword
                ? "As senhas digitadas não coincidem."
                : undefined
            }
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isDisabled={isPending}
            className="mt-6 h-11 font-semibold text-sm rounded-xl"
          >
            {isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                <span>Salvando nova senha...</span>
              </>
            ) : (
              <>
                <KeyRound className="size-4 mr-2" aria-hidden="true" />
                <span>Salvar nova senha</span>
              </>
            )}
          </Button>
        </form>
      </AuthLayoutShell>
    );
  }

  // Modo Padrão: Solicitar Link de Recuperação
  return (
    <AuthLayoutShell
      title="Recuperar sua senha"
      subtitle="Digite o e-mail cadastrado na plataforma para receber as instruções de recuperação."
      eyebrow="Esqueceu a senha?"
      footerText="Lembrou da sua senha?"
      footerLinkText="Fazer login"
      footerLinkHref="/acessar"
    >
      {errorMessage && (
        <Alert status="danger" className="mb-6">
          <Alert.Indicator>
            <AlertCircle className="size-4" aria-hidden="true" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>Atenção</Alert.Title>
            <Alert.Description>{errorMessage}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <form onSubmit={handleRequestSubmit} className="space-y-4">
        <TextField isRequired fullWidth className="w-full space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            E-mail cadastrado
          </Label>
          <InputGroup fullWidth className="w-full">
            <InputGroup.Prefix className="text-muted pl-3">
              <Mail className="size-4" aria-hidden="true" />
            </InputGroup.Prefix>
            <InputGroup.Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="seu.email@empresa.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              className="w-full text-sm"
              required
            />
          </InputGroup>
          <FieldError />
        </TextField>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isDisabled={isPending}
          className="mt-6 h-11 font-semibold text-sm rounded-xl"
        >
          {isPending ? (
            <>
              <Spinner size="sm" className="mr-2" />
              <span>Enviando link...</span>
            </>
          ) : (
            <>
              <span>Enviar link de recuperação</span>
              <ArrowRight className="size-4 ml-1.5" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>
    </AuthLayoutShell>
  );
}

export default function ResetarSenhaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] grid place-items-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <ResetarSenhaContent />
    </Suspense>
  );
}
