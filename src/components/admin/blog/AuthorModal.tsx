"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button, Input, Label, Modal, TextArea, TextField, toast } from "@heroui/react";
import { User, Briefcase, Sparkles, Save } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { createArticleAuthor, updateArticleAuthor } from "@/app/actions/admin/authors";
import type { ArticleAuthor } from "@/types/blog";

interface AuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (author: ArticleAuthor) => void;
  authorToEdit?: ArticleAuthor | null;
}

export function AuthorModal({
  isOpen,
  onClose,
  onSaved,
  authorToEdit,
}: AuthorModalProps) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (authorToEdit) {
      setName(authorToEdit.name || "");
      setTitle(authorToEdit.title || "");
      setAvatarUrl(authorToEdit.avatarUrl || "");
      setBio(authorToEdit.bio || "");
    } else {
      setName("");
      setTitle("");
      setAvatarUrl("");
      setBio("");
    }
  }, [authorToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.danger("Informe o nome do autor.");
      return;
    }

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        title: title.trim(),
        avatarUrl: avatarUrl.trim() || null,
        bio: bio.trim() || null,
      };

      const result = authorToEdit
        ? await updateArticleAuthor(authorToEdit.id, payload)
        : await createArticleAuthor(payload);

      if (result.success && result.data) {
        toast.success(authorToEdit ? "Autor atualizado com sucesso!" : "Autor criado com sucesso!");
        onSaved(result.data);
        onClose();
      } else {
        toast.danger("Erro ao salvar autor", { description: result.message });
      }
    });
  };

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open && !isPending) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="md" scroll="inside">
          <Modal.Dialog className="max-w-lg">
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <Modal.Header>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                    <User className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <Modal.Heading>
                      {authorToEdit ? "Editar Autor" : "Novo Autor do Blog"}
                    </Modal.Heading>
                    <p className="text-xs text-muted">
                      Cadastre o nome, foto de perfil e cargo/título do autor.
                    </p>
                  </div>
                </div>
              </Modal.Header>

              <Modal.Body className="space-y-5 py-4">
                <div className="flex justify-center pb-1">
                  <ImageUpload
                    label="Foto do autor (Avatar)"
                    value={avatarUrl}
                    onChange={(url) => setAvatarUrl(url ?? "")}
                    folder="authors"
                    aspect="square"
                    previewClassName="rounded-full !size-28 !max-w-28 shadow-sm"
                    description="Recomendado: foto quadrada (1:1), máx 5MB."
                    fallback={
                      <div className="flex size-full items-center justify-center bg-accent-soft font-bold text-2xl text-accent-soft-foreground">
                        {name.trim() ? name.trim().charAt(0).toUpperCase() : <User className="size-8 opacity-50" />}
                      </div>
                    }
                  />
                </div>

                <TextField value={name} onChange={setName} isRequired>
                  <Label>Nome do autor</Label>
                  <Input placeholder="Ex.: Lucas Lima" autoFocus={!authorToEdit} />
                </TextField>

                <TextField value={title} onChange={setTitle}>
                  <Label>Título / Cargo / Especialidade</Label>
                  <Input placeholder="Ex.: Especialista em Liderança & Inovação" />
                </TextField>

                <TextField value={bio} onChange={setBio}>
                  <Label>Biografia curta (opcional)</Label>
                  <TextArea
                    rows={3}
                    placeholder="Breve resumo sobre a trajetória ou foco de atuação do autor..."
                    className="resize-none"
                  />
                </TextField>
              </Modal.Body>

              <Modal.Footer>
                <Button type="button" variant="tertiary" onClick={onClose} isDisabled={isPending}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" isDisabled={isPending || !name.trim()}>
                  <Save className="size-4" aria-hidden="true" />
                  {isPending ? "Salvando..." : authorToEdit ? "Salvar Alterações" : "Criar Autor"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
