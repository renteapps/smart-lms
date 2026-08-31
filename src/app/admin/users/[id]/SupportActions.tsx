"use client";

import { useState } from "react";
import { Mail, KeyRound, MonitorOff, Copy, Check, Link2 } from "lucide-react";
import { Button, toast } from "@heroui/react";
import {
  resendAccessEmail,
  resetUserPassword,
  forceUserLogoff,
  type SupportActionResult,
} from "./support-actions";

type LinkKind = "resendAccess" | "resetPassword";
type LinkInfo = { kind: LinkKind; url: string; emailSent: boolean };

const LINK_LABELS: Record<LinkKind, string> = {
  resendAccess: "Link mágico de acesso",
  resetPassword: "Link de redefinição de senha",
};

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
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAction = async (
    actionId: string,
    actionFn: () => Promise<SupportActionResult>,
    linkKind?: LinkKind,
  ) => {
    setLoadingAction(actionId);
    try {
      const res = await actionFn();
      if (res.success) {
        if (res.emailSent === false) {
          toast.warning(res.message);
        } else {
          toast.success(res.message);
        }
        if (linkKind && res.magicLink) {
          setLinkInfo({ kind: linkKind, url: res.magicLink, emailSent: res.emailSent !== false });
          setCopied(false);
        }
      } else {
        toast.danger(res.message);
      }
    } catch {
      toast.danger("Ocorreu um erro ao realizar a ação.");
    } finally {
      setLoadingAction(null);
    }
  };

  const copyLink = async () => {
    if (!linkInfo) return;
    try {
      await navigator.clipboard.writeText(linkInfo.url);
      setCopied(true);
      toast.success("Link copiado para a área de transferência.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.danger("Não foi possível copiar. Selecione o link manualmente.");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="tertiary"
        fullWidth
        className="justify-start gap-3"
        isDisabled={Boolean(loadingAction)}
        onPress={() =>
          handleAction(
            "resendAccess",
            () => resendAccessEmail(userId, userEmail, userName),
            "resendAccess",
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
          handleAction(
            "resetPassword",
            () => resetUserPassword(userId, userEmail, userName),
            "resetPassword",
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
        onPress={() => handleAction("forceLogoff", () => forceUserLogoff(userId))}
      >
        <MonitorOff className="size-4" aria-hidden="true" />
        {loadingAction === "forceLogoff" ? "Desconectando..." : "Forçar Logoff"}
      </Button>

      {linkInfo && (
        <div className="mt-2 rounded-xl border border-hairline bg-surface-secondary/60 p-3">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-foreground">
            <Link2 className="size-3.5" aria-hidden="true" />
            <span>{LINK_LABELS[linkInfo.kind]}</span>
          </div>
          <p className="mb-2 text-xs text-muted">
            {linkInfo.emailSent
              ? "E-mail enviado. Use o link abaixo caso o usuário não receba — envie por WhatsApp ou outro canal."
              : "O e-mail automático não saiu. Copie o link e envie ao usuário por WhatsApp ou outro canal."}{" "}
            Uso único, expira em cerca de 1 hora.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={linkInfo.url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 font-mono text-[11px] text-foreground outline-none focus:ring-2 focus:ring-accent/40"
            />
            <Button variant="secondary" size="sm" className="shrink-0 gap-1.5" onPress={copyLink}>
              {copied ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
