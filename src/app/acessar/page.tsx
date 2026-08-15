"use client";

import React, { Suspense, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Mail, Sparkles } from "lucide-react";
import {
  Alert,
  Button,
  Checkbox,
  FieldError,
  InputGroup,
  Label,
  Spinner,
  Tabs,
  TextField,
  toast,
} from "@heroui/react";
import { AuthLayoutShell } from "@/components/auth/AuthLayoutShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function AcessarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("redirect") || searchParams.get("next") || "/";
  const urlError = searchParams.get("error");
  const urlMessage = searchParams.get("message");
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  const [authMode, setAuthMode] = useState<string>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    urlError === "auth_callback_failed"
      ? "A validação do acesso falhou ou expirou. Por favor, tente novamente."
      : null
  );
  const [infoMessage, setInfoMessage] = useState<string | null>(urlMessage);
  const [isPending, startTransition] = useTransition();

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Preencha seu e-mail e sua senha para entrar.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          let message = error.message;
          if (error.message.includes("Invalid login credentials")) {
            message = "E-mail ou senha incorretos. Verifique suas credenciais.";
          }
          setErrorMessage(message);
          return;
        }

        toast.success("Acesso realizado com sucesso!");
        window.location.href = next;
      } catch (err: any) {
        setErrorMessage(err?.message || "Falha inesperada de comunicação.");
      }
    });
  };

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!email.trim()) {
      setErrorMessage("Informe seu endereço de e-mail para receber o link de acesso.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo,
            shouldCreateUser: false,
          },
        });

        if (error) {
          let message = error.message;
          if (
            error.message.includes("email rate limit exceeded") ||
            error.message.toLowerCase().includes("rate limit")
          ) {
            message = "Muitas solicitações de e-mail foram feitas recentemente. Aguarde alguns minutos antes de tentar novamente.";
          }
          setErrorMessage(message);
          return;
        }

        setInfoMessage(`Link mágico enviado com sucesso para ${email.trim()}.`);
        toast.success("Link enviado!", { description: "Verifique sua caixa de entrada." });
      } catch (err: any) {
        setErrorMessage(err?.message || "Falha ao solicitar link de acesso.");
      }
    });
  };

  return (
    <AuthLayoutShell
      title="Acesse sua conta"
      subtitle="Entre com suas credenciais para continuar sua trilha de desenvolvimento e projetos."
      footerText="Ainda não tem uma conta no Smart LMS?"
      footerLinkText="Criar conta gratuitamente"
      footerLinkHref="/criar-conta"
    >
      {/* Feedback Alerts */}
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

      {infoMessage && (
        <Alert status="success" className="mb-6">
          <Alert.Indicator>
            <CheckCircle2 className="size-4" aria-hidden="true" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>Tudo certo</Alert.Title>
            <Alert.Description>{infoMessage}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Tabs between Password & Magic Link */}
      <Tabs.Root
        selectedKey={authMode}
        onSelectionChange={(key) => {
          setAuthMode(String(key));
          setErrorMessage(null);
        }}
        className="w-full mb-6"
      >
        <Tabs.List
          aria-label="Método de acesso"
          className="w-full grid grid-cols-2 p-1 bg-surface-secondary/70 rounded-xl border border-hairline"
        >
          <Tabs.Tab
            id="password"
            className="flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg text-muted data-[selected=true]:bg-surface data-[selected=true]:text-foreground data-[selected=true]:shadow-xs transition-all"
          >
            <KeyRound className="size-4" aria-hidden="true" />
            <span>Senha</span>
          </Tabs.Tab>
          <Tabs.Tab
            id="magic-link"
            className="flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg text-muted data-[selected=true]:bg-surface data-[selected=true]:text-foreground data-[selected=true]:shadow-xs transition-all"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            <span>Link Mágico</span>
          </Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: Password Form */}
        <Tabs.Panel id="password" className="pt-2">
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <TextField isRequired fullWidth className="w-full space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                E-mail
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

            <PasswordInput
              id="password"
              name="password"
              label="Senha"
              placeholder="Sua senha de acesso"
              value={password}
              onChange={setPassword}
              isRequired
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between pt-1">
              <Checkbox
                isSelected={rememberMe}
                onChange={setRememberMe}
                className="flex flex-row items-center gap-2.5 cursor-pointer"
              >
                <Checkbox.Content className="flex items-center gap-2.5">
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Label className="text-xs text-muted cursor-pointer font-normal">
                    Lembrar deste dispositivo
                  </Label>
                </Checkbox.Content>
              </Checkbox>

              <Link
                href="/resetar-senha"
                className="text-xs font-semibold text-accent hover:text-accent-hover hover:underline transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>

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
                  <span>Acessando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Smart LMS</span>
                  <ArrowRight className="size-4 ml-1.5" aria-hidden="true" />
                </>
              )}
            </Button>
          </form>
        </Tabs.Panel>

        {/* Tab 2: Magic Link Form */}
        <Tabs.Panel id="magic-link" className="pt-2">
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <p className="text-xs text-muted leading-relaxed">
              Enviaremos um link de acesso instantâneo para o seu e-mail. Sem necessidade de digitar senhas.
            </p>

            <TextField isRequired fullWidth className="w-full space-y-1.5">
              <Label htmlFor="otp-email" className="text-sm font-medium text-foreground">
                E-mail cadastrado
              </Label>
              <InputGroup fullWidth className="w-full">
                <InputGroup.Prefix className="text-muted pl-3">
                  <Mail className="size-4" aria-hidden="true" />
                </InputGroup.Prefix>
                <InputGroup.Input
                  id="otp-email"
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
              className="mt-4 h-11 font-semibold text-sm rounded-xl"
            >
              {isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  <span>Enviando link...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-1.5" aria-hidden="true" />
                  <span>Enviar Link de Acesso</span>
                </>
              )}
            </Button>
          </form>
        </Tabs.Panel>
      </Tabs.Root>
    </AuthLayoutShell>
  );
}

export default function AcessarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] grid place-items-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <AcessarContent />
    </Suspense>
  );
}
