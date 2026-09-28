"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, Button, buttonVariants, Spinner } from "@heroui/react";
import { AuthLayoutShell } from "@/components/auth/AuthLayoutShell";
import { confirmUnsubscribeAction } from "./actions";

const secondaryButton = buttonVariants({
  variant: "outline",
  size: "lg",
  fullWidth: true,
  className: "h-11 rounded-xl font-semibold text-sm",
});

export function UnsubscribeView({
  userId,
  category,
  token,
  valid,
}: {
  userId: string;
  category: string;
  token: string;
  valid: boolean;
}) {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    setFailed(false);
    startTransition(async () => {
      const result = await confirmUnsubscribeAction(userId, category, token);
      if (result.ok) setDone(true);
      else setFailed(true);
    });
  };

  if (!valid) {
    return (
      <AuthLayoutShell
        title="Link inválido"
        subtitle="Este link de descadastro não é válido ou está incompleto."
        eyebrow="Preferências de e-mail"
      >
        <Alert status="warning" className="mb-6">
          <Alert.Indicator>
            <AlertCircle className="size-4" aria-hidden="true" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>O que fazer</Alert.Title>
            <Alert.Description>
              Use o link &ldquo;Descadastrar&rdquo; do e-mail mais recente, ou responda o próprio e-mail pedindo para
              não receber mais os lembretes.
            </Alert.Description>
          </Alert.Content>
        </Alert>
        <Link href="/" className={secondaryButton}>Ir para a plataforma</Link>
      </AuthLayoutShell>
    );
  }

  if (done) {
    return (
      <AuthLayoutShell
        title="Pronto, você foi descadastrado"
        subtitle="Você não vai mais receber os lembretes para renovar a assinatura."
        eyebrow="Preferências de e-mail"
      >
        <Alert status="success" className="mb-6">
          <Alert.Indicator>
            <CheckCircle2 className="size-4" aria-hidden="true" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>Descadastro confirmado</Alert.Title>
            <Alert.Description>
              E-mails sobre a sua conta, como acesso e segurança, continuam chegando normalmente.
            </Alert.Description>
          </Alert.Content>
        </Alert>
        <Link href="/" className={secondaryButton}>Ir para a plataforma</Link>
      </AuthLayoutShell>
    );
  }

  return (
    <AuthLayoutShell
      title="Parar de receber lembretes?"
      subtitle="Confirme para não receber mais os e-mails convidando você a renovar a assinatura."
      eyebrow="Preferências de e-mail"
    >
      {failed && (
        <Alert status="danger" className="mb-6">
          <Alert.Indicator>
            <AlertCircle className="size-4" aria-hidden="true" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>Não foi possível concluir</Alert.Title>
            <Alert.Description>Tente de novo em instantes.</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      <p className="mb-6 text-sm text-muted">
        E-mails sobre a sua conta, como acesso e segurança, continuam chegando normalmente.
      </p>
      <Button
        type="button"
        variant="primary"
        size="lg"
        fullWidth
        isDisabled={isPending}
        onClick={handleConfirm}
        className="h-11 rounded-xl font-semibold text-sm"
      >
        {isPending ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Confirmando...
          </>
        ) : (
          "Confirmar descadastro"
        )}
      </Button>
    </AuthLayoutShell>
  );
}
