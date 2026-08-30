"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Description, FieldError, Input, Label, Modal, TextArea, TextField } from "@heroui/react";
import { Plus } from "lucide-react";
import { isReservedPageSlug, isValidPageSlugFormat, slugify } from "@/lib/pageBuilder";
import { createPage } from "./actions";

/**
 * "Nova página" — vive na lista de /admin/pages. O endereço é derivado do
 * título automaticamente até o admin editar o campo manualmente; a partir
 * daí ele deixa de seguir o título (mesmo padrão usado nas telas de blog,
 * planos e categorias).
 */
export function CreatePageDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const slugError = effectiveSlug.length === 0
    ? null
    : !isValidPageSlugFormat(effectiveSlug)
      ? "Use só letras minúsculas, números e hifens."
      : isReservedPageSlug(effectiveSlug)
        ? "Este endereço já é usado pela plataforma."
        : null;

  const reset = () => {
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) reset();
  };

  const handleSubmit = () => {
    if (!title.trim() || !effectiveSlug || slugError) return;
    startTransition(async () => {
      const result = await createPage({ title, slug: effectiveSlug, description });
      if (!result.success || !result.slug) {
        setError(result.message);
        return;
      }
      setIsOpen(false);
      reset();
      router.push(`/admin/pages/${result.slug}`);
    });
  };

  return (
    <>
      <Button variant="primary" onPress={() => setIsOpen(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Nova página
      </Button>

      <Modal.Root isOpen={isOpen} onOpenChange={handleOpenChange}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>Nova página</Modal.Header>
              <Modal.Body className="space-y-4">
                <TextField value={title} onChange={setTitle} isRequired>
                  <Label>Título</Label>
                  <Input placeholder="Ex.: Sobre nós" maxLength={180} />
                </TextField>

                <TextField value={effectiveSlug} onChange={(value) => { setSlug(value); setSlugTouched(true); }} isInvalid={Boolean(slugError)}>
                  <Label>Endereço</Label>
                  <Input placeholder="sobre-nos" />
                  <Description>Fica em /pagina/{effectiveSlug || "..."}</Description>
                  {slugError && <FieldError>{slugError}</FieldError>}
                </TextField>

                <TextField value={description} onChange={setDescription}>
                  <Label>Descrição (opcional)</Label>
                  <TextArea placeholder="Só para identificar a página na lista — não aparece publicada." maxLength={500} />
                </TextField>

                {error && <p className="text-sm font-semibold text-danger">{error}</p>}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onClick={() => handleOpenChange(false)}>Cancelar</Button>
                <Button variant="primary" onClick={handleSubmit} isDisabled={isPending || !title.trim() || !effectiveSlug || Boolean(slugError)}>
                  Criar página
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </>
  );
}
