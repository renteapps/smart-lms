"use client";

import React from "react";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { AlertDialog, Button } from "@heroui/react";

type ConfirmTone = "danger" | "primary" | "warning";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  /** Rótulo do botão de confirmação. */
  confirmLabel?: string;
  /** Rótulo do botão de cancelar. */
  cancelLabel?: string;
  /** Intenção da ação: `danger` para exclusões, `warning` para ações arriscadas. */
  tone?: ConfirmTone;
  /** Ícone opcional exibido antes do rótulo de confirmação (ignorado durante o carregamento). */
  confirmIcon?: React.ReactNode;
  /** Bloqueia o diálogo e mostra o estado de carregamento no botão de confirmação. */
  isLoading?: boolean;
  /** Rótulo do botão de confirmação enquanto `isLoading` (padrão: "Aguarde…"). */
  loadingLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;

  /** @deprecated use `confirmLabel`. */
  confirmText?: string;
  /** @deprecated use `cancelLabel`. */
  cancelText?: string;
  /** @deprecated use `tone`. */
  variant?: ConfirmTone;
  /** @deprecated use `tone`. */
  confirmTone?: ConfirmTone | string;
  /** @deprecated use `tone="danger"`. */
  isDestructive?: boolean;
}

const iconStatus = { danger: "danger", warning: "warning", primary: "accent" } as const;

/**
 * Diálogo padronizado de confirmação do Smart LMS.
 *
 * Construído sobre `AlertDialog` (role `alertdialog`, foco inicial no botão
 * seguro). É o único diálogo de confirmação do admin: para conteúdo extra
 * (resumo do item, avisos), passe um `description` em JSX em vez de criar um
 * diálogo próprio.
 */
export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone,
  confirmIcon,
  isLoading = false,
  loadingLabel = "Aguarde…",
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  variant,
  confirmTone,
  isDestructive,
}: ConfirmDialogProps) {
  const resolvedTone: ConfirmTone =
    tone ??
    variant ??
    (isDestructive || confirmTone === "danger" ? "danger" : confirmTone === "warning" ? "warning" : "primary");

  const handleCancel = () => {
    if (isLoading) return;
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (isLoading) return;
    await onConfirm();
  };

  return (
    <AlertDialog.Root
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && isLoading) return;
        onOpenChange(open);
      }}
    >
      <AlertDialog.Backdrop>
        <AlertDialog.Container size="md">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status={iconStatus[resolvedTone]}>
                {resolvedTone === "primary" ? (
                  <Info className="size-5" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="size-5" aria-hidden="true" />
                )}
              </AlertDialog.Icon>
              <AlertDialog.Heading>{title}</AlertDialog.Heading>
            </AlertDialog.Header>

            {description && <AlertDialog.Body>{description}</AlertDialog.Body>}

            <AlertDialog.Footer>
              <Button variant="tertiary" onClick={handleCancel} isDisabled={isLoading}>
                {cancelLabel ?? cancelText ?? "Cancelar"}
              </Button>
              <Button
                variant={resolvedTone === "danger" ? "danger" : "primary"}
                onClick={handleConfirm}
                isDisabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {loadingLabel}
                  </>
                ) : (
                  <>
                    {confirmIcon}
                    {confirmLabel ?? confirmText ?? "Confirmar"}
                  </>
                )}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog.Root>
  );
}
