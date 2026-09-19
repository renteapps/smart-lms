"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deletePage } from "./actions";

type DeletePageDialogProps = {
  page: { slug: string; title: string } | null;
  onClose: () => void;
};

export function DeletePageDialog({ page, onClose }: DeletePageDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  if (!page) return null;

  const handleConfirm = () => {
    startTransition(async () => {
      await deletePage(page.slug);
      onClose();
      router.refresh();
    });
  };

  return (
    <ConfirmDialog
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      tone="danger"
      title={`Excluir “${page.title}”?`}
      description={<p>O rascunho e o conteúdo publicado desta página são apagados. Esta ação não pode ser desfeita.</p>}
      confirmLabel="Excluir página"
      confirmIcon={<Trash2 className="size-4" aria-hidden="true" />}
      isLoading={isPending}
      loadingLabel="Excluindo…"
      onConfirm={handleConfirm}
    />
  );
}
