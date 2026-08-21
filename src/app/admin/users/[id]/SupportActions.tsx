"use client";

import { useState } from "react";
import { Mail, KeyRound, MonitorOff } from "lucide-react";
import { Button, toast } from "@heroui/react";
import { resendAccessEmail, resetUserPassword, forceUserLogoff } from "./support-actions";

export function SupportActions({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleAction = async (actionId: string, actionFn: () => Promise<{ success: boolean; message: string }>) => {
    setLoadingAction(actionId);
    try {
      const res = await actionFn();
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.danger(res.message);
      }
    } catch {
      toast.danger("Ocorreu um erro ao realizar a ação.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button 
        variant="tertiary" 
        fullWidth 
        className="justify-start gap-3"
        isDisabled={Boolean(loadingAction)}
        onPress={() => handleAction("resendAccess", () => resendAccessEmail(userId, userEmail))}
      >
        <Mail className="size-4" aria-hidden="true" />
        {loadingAction === "resendAccess" ? "Reenviando..." : "Reenviar e-mail de acesso"}
      </Button>
      <Button 
        variant="tertiary" 
        fullWidth 
        className="justify-start gap-3"
        isDisabled={Boolean(loadingAction)}
        onPress={() => handleAction("resetPassword", () => resetUserPassword(userId, userEmail))}
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
    </div>
  );
}
