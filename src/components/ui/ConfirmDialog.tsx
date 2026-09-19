"use client";

import React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Button, Modal } from "@heroui/react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary" | "warning";
  confirmTone?: "danger" | "primary" | "warning" | string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Diálogo padronizado de confirmação do Smart LMS.
 * 
 * Substitui os diálogos nativos `window.confirm` e `window.alert`,
 * proporcionando foco acessível, respeito aos tokens do HeroUI v3,
 * prevenção intencional de ações destrutivas e animação consistente.
 */
export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmText,
  confirmLabel,
  cancelText,
  cancelLabel,
  variant,
  confirmTone,
  isDestructive,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const resolvedConfirmText = confirmText ?? confirmLabel ?? "Confirmar";
  const resolvedCancelText = cancelText ?? cancelLabel ?? "Cancelar";
  const resolvedVariant = (variant ??
    (isDestructive || confirmTone === "danger"
      ? "danger"
      : confirmTone === "warning"
      ? "warning"
      : "primary")) as "danger" | "primary" | "warning";
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
    <Modal.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog className="p-6">
            <div className="flex items-start gap-4">
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  resolvedVariant === "danger"
                    ? "bg-danger-soft text-danger"
                    : resolvedVariant === "warning"
                    ? "bg-warning-soft text-warning"
                    : "bg-accent-soft text-accent"
                }`}
                aria-hidden="true"
              >
                {resolvedVariant === "danger" || resolvedVariant === "warning" ? (
                  <AlertTriangle className="size-5" />
                ) : (
                  <Info className="size-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <Modal.Header className="p-0 font-display text-lg font-bold text-foreground">
                  {title}
                </Modal.Header>
                {description && (
                  <Modal.Body className="p-0 pt-2 text-sm leading-relaxed text-muted">
                    {description}
                  </Modal.Body>
                )}
              </div>
            </div>

            <Modal.Footer className="mt-6 flex items-center justify-end gap-2 p-0">
              <Button
                variant="tertiary"
                onClick={handleCancel}
                isDisabled={isLoading}
              >
                {resolvedCancelText}
              </Button>
              <Button
                variant={resolvedVariant === "danger" ? "danger" : resolvedVariant === "warning" ? "primary" : "primary"}
                onClick={handleConfirm}
                isDisabled={isLoading}
              >
                {resolvedConfirmText}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
