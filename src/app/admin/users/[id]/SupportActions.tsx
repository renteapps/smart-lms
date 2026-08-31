"use client";

import { useState } from "react";
import { Mail, KeyRound, MonitorOff, Copy, Check, Link2, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { Alert, Button, toast } from "@heroui/react";
import {
  resendAccessEmail,
  resetUserPassword,
  forceUserLogoff,
  type SupportActionResult,
} from "./support-actions";

type LinkKind = "resendAccess" | "resetPassword";

const LINK_LABELS: Record<LinkKind, string> = {
  resendAccess: "Link mágico de acesso",
  resetPassword: "Link de redefinição de senha",
};

type Tone = "success" | "warning" | "danger";
type Status = {
  tone: Tone;
  title: string;
  detail: string;
  link?: { kind: LinkKind; url: string };
};

const TONE_ICON = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
} as const;

// Trava de segurança no cliente: se a server action não responder, não deixa o botão preso.
function raceTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("client-timeout")), ms)),
  ]);
}

export function SupportActions({
  userId,
  userEmail,
  userName,
}: {
  userId: string;
  userEmail: string;
  userName?: string;
}) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [copied, setCopied] = useState(false);

  const runLinkAction = async (
    actionId: string,
    kind: LinkKind,
    actionFn: () => Promise<SupportActionResult>,
  ) => {
    setLoadingAction(actionId);
    setStatus(null);
    setCopied(false);
    try {
      const res = await raceTimeout(actionFn(), 20_000);

      if (!res.success || !res.magicLink) {
        setStatus({ tone: "danger", title: "Não foi possível gerar o link", detail: res.message });
        toast.danger(res.message);
        return;
      }

      const sent = res.emailSent !== false;
      setStatus({
        tone: sent ? "success" : "warning",
        title: sent ? `E-mail enviado para ${userEmail}` : "Link gerado — e-mail não enviado",
        detail: sent
          ? "Se não chegar (verifique também o spam), copie o link abaixo e envie por outro canal."
          : res.message,
        link: { kind, url: res.magicLink },
      });
      (sent ? toast.success : toast.warning)(
        sent ? `E-mail enviado para ${userEmail}.` : "Link gerado — e-mail não enviado.",
      );
    } catch (e) {
      const timedOut = e instanceof Error && e.message === "client-timeout";
      setStatus({
        tone: "danger",
        title: timedOut ? "A operação demorou demais" : "Ocorreu um erro",
        detail: timedOut
          ? "O servidor não respondeu a tempo. Tente de novo; se persistir, verifique a integração do Resend."
          : "Falha ao executar a ação. Tente novamente.",
      });
      toast.danger(timedOut ? "A operação demorou demais." : "Ocorreu um erro ao realizar a ação.");
    } finally {
      setLoadingAction(null);
    }
  };

  const runPlainAction = async (actionId: string, actionFn: () => Promise<SupportActionResult>) => {
    setLoadingAction(actionId);
    setStatus(null);
    try {
      const res = await raceTimeout(actionFn(), 20_000);
      setStatus({
        tone: res.success ? "success" : "danger",
        title: res.success ? "Feito" : "Não foi possível concluir",
        detail: res.message,
      });
      (res.success ? toast.success : toast.danger)(res.message);
    } catch {
      setStatus({ tone: "danger", title: "Ocorreu um erro", detail: "Falha ao executar a ação. Tente novamente." });
      toast.danger("Ocorreu um erro ao realizar a ação.");
    } finally {
      setLoadingAction(null);
    }
  };

  const copyLink = async () => {
    if (!status?.link) return;
    try {
      await navigator.clipboard.writeText(status.link.url);
      setCopied(true);
      toast.success("Link copiado.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.danger("Não foi possível copiar. Selecione o link manualmente.");
    }
  };

  const StatusIcon = status ? TONE_ICON[status.tone] : null;

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="tertiary"
        fullWidth
        className="justify-start gap-3"
        isDisabled={Boolean(loadingAction)}
        onPress={() =>
          runLinkAction("resendAccess", "resendAccess", () =>
            resendAccessEmail(userId, userEmail, userName),
          )
        }
      >
        <Mail className="size-4" aria-hidden="true" />
        {loadingAction === "resendAccess" ? "Reenviando..." : "Reenviar e-mail de acesso"}
      </Button>
      <Button
        variant="tertiary"
        fullWidth
        className="justify-start gap-3"
        isDisabled={Boolean(loadingAction)}
        onPress={() =>
          runLinkAction("resetPassword", "resetPassword", () =>
            resetUserPassword(userId, userEmail, userName),
          )
        }
      >
        <KeyRound className="size-4" aria-hidden="true" />
        {loadingAction === "resetPassword" ? "Enviando link..." : "Redefinir Senha"}
      </Button>
      <Button
        variant="danger-soft"
        fullWidth
        className="justify-start gap-3"
        isDisabled={Boolean(loadingAction)}
        onPress={() => runPlainAction("forceLogoff", () => forceUserLogoff(userId))}
      >
        <MonitorOff className="size-4" aria-hidden="true" />
        {loadingAction === "forceLogoff" ? "Desconectando..." : "Forçar Logoff"}
      </Button>

      {status && StatusIcon && (
        <Alert status={status.tone} className="mt-2">
          <Alert.Indicator>
            <StatusIcon className="size-4" aria-hidden="true" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>{status.title}</Alert.Title>
            <Alert.Description>{status.detail}</Alert.Description>

            {status.link && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-foreground">
                  <Link2 className="size-3.5" aria-hidden="true" />
                  <span>{LINK_LABELS[status.link.kind]} · uso único · expira em ~1h</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={status.link.url}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 font-mono text-[11px] text-foreground outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <Button variant="secondary" size="sm" className="shrink-0 gap-1.5" onPress={copyLink}>
                    {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
              </div>
            )}
          </Alert.Content>
        </Alert>
      )}
    </div>
  );
}
