"use client";

import React, { Suspense, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Mail,
  MailCheck,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Alert, Button, buttonVariants, Spinner, toast } from "@heroui/react";
import { AuthLayoutShell } from "@/components/auth/AuthLayoutShell";
import { resendSignUpEmailAction } from "@/lib/auth/actions";
import { useAppearance } from "@/contexts/AppearanceContext";

function getWebmailProviderUrl(email: string): { name: string; url: string } | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  if (domain === "gmail.com" || domain === "googlemail.com") {
    return { name: "Abrir Gmail", url: "https://mail.google.com" };
  }
  if (
    domain === "outlook.com" ||
    domain === "hotmail.com" ||
    domain === "live.com" ||
    domain === "msn.com"
  ) {
    return { name: "Abrir Outlook", url: "https://outlook.live.com" };
  }
  if (domain === "yahoo.com" || domain === "yahoo.com.br") {
    return { name: "Abrir Yahoo Mail", url: "https://mail.yahoo.com" };
  }
  if (domain === "icloud.com" || domain === "me.com") {
    return { name: "Abrir iCloud Mail", url: "https://www.icloud.com/mail" };
  }
  return null;
}

function ConfirmarContent() {
  const router = useRouter();
  const { platformName } = useAppearance();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const statusParam = searchParams.get("status");
  const errorParam = searchParams.get("error");
  const next = searchParams.get("redirect") || searchParams.get("next") || "/onboarding";

  const isConfirmedSuccess = statusParam === "sucesso";

  const [email] = useState(emailParam);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [countdown, setCountdown] = useState(4);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === "token_invalido_ou_expirado"
      ? "O link de confirmação expirou ou é inválido. Por favor, solicite um novo envio abaixo."
      : null
  );
  const [isPending, startTransition] = useTransition();

  // Contador de reenvio de e-mail (cooldown)
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Redirecionamento automático quando a conta já foi confirmada
  useEffect(() => {
    if (isConfirmedSuccess) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        router.push(next);
      }
    }
  }, [isConfirmedSuccess, countdown, next, router]);

  const handleResend = () => {
    if (!email.trim()) {
      setErrorMessage("Não foi possível identificar o e-mail cadastrado para reenvio.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      try {
        const result = await resendSignUpEmailAction({
          email: email.trim(),
          next: next,
        });
        if (!result.success) {
          setErrorMessage(result.error || "Não foi possível reenviar o e-mail no momento.");
        } else {
          setResendCooldown(60);
          toast.success("E-mail reenviado com sucesso!", {
            description: `Verifique a caixa de entrada de ${email}.`,
          });
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Ocorreu um erro ao tentar reenviar a mensagem.");
      }
    });
  };

  const webmail = getWebmailProviderUrl(email);

  // -------------------------------------------------------------
  // ESTADO 1: Conta Criada e Confirmada com Sucesso -> Onboarding
  // -------------------------------------------------------------
  if (isConfirmedSuccess) {
    return (
      <AuthLayoutShell
        title="Conta criada e confirmada!"
        subtitle={`Seu acesso à ${platformName || "plataforma"} foi ativado com sucesso. Estamos preparando seu ambiente personalizado.`}
        eyebrow="Tudo pronto"
        sideTitle="Sua evolução começa agora."
        sideDescription="Você será conduzido pelo Onboarding interativo para configurar suas metas, trilhas recomendadas e mentor de IA."
        sideBadge="Acesso Liberado"
      >
        <div className="space-y-6 py-4 text-center">
          {/* Success Badge */}
          <div className="mx-auto grid size-20 place-items-center rounded-2xl bg-success-soft text-success shadow-sm">
            <CheckCircle2 className="size-10" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h2 className="display-3 font-extrabold text-foreground">
              Seja bem-vindo à {platformName || "nossa plataforma"}!
            </h2>
            <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
              Sua conta foi validada com sucesso. Redirecionando para o seu Onboarding em{" "}
              <span className="font-bold text-foreground text-base">{countdown}s</span>...
            </p>
          </div>

          <div className="pt-4 border-t border-hairline flex flex-col gap-3">
            <Link
              href={next}
              className={buttonVariants({
                variant: "primary",
                size: "lg",
                fullWidth: true,
                className: "h-11 rounded-xl font-semibold text-sm shadow-sm",
              })}
            >
              <span>Ir para o Onboarding</span>
              <ArrowRight className="size-4 ml-2" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </AuthLayoutShell>
    );
  }

  // -------------------------------------------------------------
  // ESTADO 2: Aguardando toque no botão "Acessar Portal" no E-mail
  // -------------------------------------------------------------
  return (
    <AuthLayoutShell
      title="Verifique seu e-mail"
      subtitle={
        email
          ? `Enviamos uma mensagem para ${email} com o botão "Acessar Portal".`
          : 'Enviamos uma mensagem para seu e-mail cadastrado com o botão "Acessar Portal".'
      }
      eyebrow="Quase lá"
      footerText="Precisa alterar o e-mail digitado?"
      footerLinkText="Voltar para o cadastro"
      footerLinkHref="/criar-conta"
      sideTitle="Ambiente de alta segurança."
      sideDescription="Ao tocar no botão do e-mail, seu cadastro é confirmado instantaneamente e você inicia seu Onboarding."
      sideBadge="Confirmação Segura"
    >
      {/* Error alert */}
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

      {/* Main Instruction Card */}
      <div className="rounded-2xl border border-hairline bg-surface-secondary/50 p-6 space-y-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent shadow-xs">
            <MailCheck className="size-7" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="font-display font-bold text-base text-foreground">
              Toque no botão &ldquo;Acessar Portal&rdquo; no seu e-mail
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Abra a mensagem recebida e clique no botão de acesso. Você não precisa digitar nenhum código — o acesso será validado e você entrará diretamente na tela de Onboarding.
            </p>
          </div>
        </div>

        {/* Email Address Highlight */}
        {email && (
          <div className="rounded-xl border border-border bg-surface px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="text-muted flex items-center gap-2">
              <Mail className="size-3.5" aria-hidden="true" />
              Destinatário:
            </span>
            <span className="font-semibold text-foreground truncate max-w-[220px] sm:max-w-xs">{email}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 space-y-3">
        {webmail && (
          <a
            href={webmail.url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              variant: "primary",
              size: "lg",
              fullWidth: true,
              className: "h-11 rounded-xl font-semibold text-sm",
            })}
          >
            <span>{webmail.name}</span>
            <ExternalLink className="size-4 ml-2" aria-hidden="true" />
          </a>
        )}

        <Button
          type="button"
          variant={webmail ? "outline" : "primary"}
          size="lg"
          fullWidth
          isDisabled={resendCooldown > 0 || isPending || !email}
          onClick={handleResend}
          className="h-11 rounded-xl font-semibold text-sm"
        >
          {isPending ? (
            <>
              <Spinner size="sm" className="mr-2" />
              <span>Reenviando mensagem...</span>
            </>
          ) : (
            <>
              <RefreshCw className="size-4 mr-2" aria-hidden="true" />
              <span>
                {resendCooldown > 0
                  ? `Reenviar disponível em ${resendCooldown}s`
                  : "Reenviar e-mail de confirmação"}
              </span>
            </>
          )}
        </Button>
      </div>

      {/* Spam Hint */}
      <div className="mt-6 rounded-xl border border-hairline bg-surface p-4 text-center text-xs text-muted space-y-1">
        <p className="font-medium text-foreground">Não encontrou a mensagem na caixa de entrada?</p>
        <p>Verifique sua pasta de <strong>Spam</strong> ou <strong>Lixo Eletrônico</strong>.</p>
      </div>
    </AuthLayoutShell>
  );
}

export default function ConfirmarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] grid place-items-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <ConfirmarContent />
    </Suspense>
  );
}
