"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { AlertDialog, Button } from "@heroui/react";
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
    <AlertDialog.Root isOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container size="md">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </AlertDialog.Icon>
              <AlertDialog.Heading>Excluir “{page.title}”?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>O rascunho e o conteúdo publicado desta página são apagados. Esta ação não pode ser desfeita.</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="tertiary" onClick={onClose} isDisabled={isPending}>Cancelar</Button>
              <Button variant="danger" onClick={handleConfirm} isDisabled={isPending}>
                <Trash2 className="size-4" aria-hidden="true" />
                Excluir página
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog.Root>
  );
}
