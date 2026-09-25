"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, Building2, CheckCircle2 } from "lucide-react";
import { Alert, Button, buttonVariants, Spinner } from "@heroui/react";
import { AuthLayoutShell } from "@/components/auth/AuthLayoutShell";
import { acceptInviteAction, type AcceptInviteState } from "./actions";

export type InviteInfo = {
  state: "pending" | "expired" | "accepted" | "invalid";
  email: string;
  organizationName: string;
};

const ACCEPT_ERRORS: Partial<Record<AcceptInviteState, string>> = {
  expired: "Este convite expirou. Peça ao gestor da sua empresa para reenviá-lo.",
  no_seats: "A empresa não tem mais vagas disponíveis. Fale com o gestor do contrato.",
  invalid: "Este convite não é mais válido. Peça um novo ao gestor da sua empresa.",
  unauthenticated: "Sua sessão expirou. Entre novamente para aceitar o convite.",
  error: "Não foi possível aceitar o convite agora. Tente novamente em instantes.",
};

const primaryButton = buttonVariants({
  variant: "primary",
  size: "lg",
  fullWidth: true,
  className: "h-11 rounded-xl font-semibold text-sm",
});
const secondaryButton = buttonVariants({
  variant: "outline",
  size: "lg",
  fullWidth: true,
  className: "h-11 rounded-xl font-semibold text-sm",
});

function Notice({ status, title, children }: { status: "danger" | "warning" | "success"; title: string; children: React.ReactNode }) {
  return (
    <Alert status={status} className="mb-6">
      <Alert.Indicator>
        {status === "success"
          ? <CheckCircle2 className="size-4" aria-hidden="true" />
          : <AlertCircle className="size-4" aria-hidden="true" />}
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

export function InviteView({
  token,
  invite,
  sessionEmail,
}: {
  token: string;
  invite: InviteInfo;
  sessionEmail: string | null;
}) {
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const company = invite.organizationName || "sua empresa";
  const returnTo = `/convite/${encodeURIComponent(token)}`;
  const emailMatches = Boolean(sessionEmail) && sessionEmail!.toLowerCase() === invite.email.toLowerCase();

  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      const result = await acceptInviteAction(token);
      if (result.state === "accepted" || result.state === "already_member") {
        setAccepted(true);
      } else if (result.state === "wrong_email") {
        setError(`Este convite foi enviado para ${result.email ?? invite.email}. Entre com esse e-mail para aceitá-lo.`);
      } else {
        setError(ACCEPT_ERRORS[result.state] ?? ACCEPT_ERRORS.error!);
      }
    });
  };

  if (accepted || invite.state === "accepted") {
    return (
      <AuthLayoutShell
        title="Convite aceito"
        subtitle={`Você agora faz parte da equipe ${company} na plataforma.`}
        eyebrow="Tudo pronto"
        sideTitle="Aprenda junto com a sua equipe."
        sideDescription="Os cursos liberados pela sua empresa aparecem na sua área assim que o gestor os atribuir a você."
      >
        <Notice status="success" title="Bem-vindo(a) à equipe">
          Os cursos que a {company} liberar para você aparecem na sua área de estudos.
        </Notice>
        <Link href={sessionEmail ? "/" : `/acessar?redirect=/`} className={primaryButton}>
          {sessionEmail ? "Ir para a plataforma" : "Entrar na plataforma"}
        </Link>
      </AuthLayoutShell>
    );
  }

  if (invite.state !== "pending") {
    const expired = invite.state === "expired";
    return (
      <AuthLayoutShell
        title={expired ? "Convite expirado" : "Convite indisponível"}
        subtitle={
          expired
            ? `O prazo deste convite da ${company} terminou.`
            : "Este link de convite não é válido ou foi cancelado."
        }
        eyebrow="Convite de empresa"
      >
        <Notice status="warning" title="O que fazer agora">
          Peça ao gestor da sua empresa para reenviar o convite. O link novo chega no seu e-mail.
        </Notice>
        <Link href="/acessar" className={secondaryButton}>
          Ir para o login
        </Link>
      </AuthLayoutShell>
    );
  }

  return (
    <AuthLayoutShell
      title={`Convite da ${company}`}
      subtitle={`A ${company} liberou para você o acesso à plataforma de estudos.`}
      eyebrow="Convite de empresa"
      sideTitle="Aprenda junto com a sua equipe."
      sideDescription="Aceite o convite com o e-mail convidado para entrar na equipe da sua empresa."
    >
      {error && (
        <Notice status="danger" title="Não foi possível aceitar">
          {error}
        </Notice>
      )}

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-hairline bg-surface-secondary/50 p-5">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Building2 className="size-6" aria-hidden="true" />
        </div>
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-foreground">{company}</p>
          <p className="truncate text-muted">Convite para {invite.email}</p>
        </div>
      </div>

      {!sessionEmail && (
        <div className="space-y-3">
          <Link
            href={`/criar-conta?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(returnTo)}`}
            className={primaryButton}
          >
            Criar minha conta
          </Link>
          <Link href={`/acessar?redirect=${encodeURIComponent(returnTo)}`} className={secondaryButton}>
            Já tenho conta
          </Link>
          <p className="pt-2 text-center text-xs text-muted">
            Use o e-mail <strong className="text-foreground">{invite.email}</strong> — o convite só vale para ele.
          </p>
        </div>
      )}

      {sessionEmail && !emailMatches && (
        <Notice status="warning" title="Você está com outra conta">
          Você entrou como {sessionEmail}, mas o convite é para {invite.email}. Saia e entre com o e-mail convidado
          para aceitar.
        </Notice>
      )}

      {sessionEmail && emailMatches && (
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          isDisabled={isPending}
          onClick={handleAccept}
          className="h-11 rounded-xl font-semibold text-sm"
        >
          {isPending ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Aceitando convite...
            </>
          ) : (
            "Aceitar convite"
          )}
        </Button>
      )}
    </AuthLayoutShell>
  );
}
