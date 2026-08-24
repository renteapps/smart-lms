"use client";

import { useState, useTransition } from "react";
import { Button, Card, Input, Label, TextArea, TextField, toast, Table } from "@heroui/react";
import { Edit2, Plus, Save, Trash2, User, UserCheck } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import type { AuthorRow } from "@/app/actions/admin/authors";
import {
  createArticleAuthor,
  updateArticleAuthor,
  deleteArticleAuthor,
} from "@/app/actions/admin/authors";

export function ArticleAuthorsManager({ initialAuthors }: { initialAuthors: AuthorRow[] }) {
  const [isPending, startTransition] = useTransition();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [bioInput, setBioInput] = useState("");

  const resetForm = () => {
    setEditingId(null);
    setNameInput("");
    setTitleInput("");
    setAvatarUrlInput("");
    setBioInput("");
  };

  const handleEdit = (item: AuthorRow) => {
    setEditingId(item.id);
    setNameInput(item.name);
    setTitleInput(item.title || "");
    setAvatarUrlInput(item.avatarUrl || "");
    setBioInput(item.bio || "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      toast.danger("Informe o nome do autor.");
      return;
    }

    startTransition(async () => {
      const payload = {
        name: nameInput.trim(),
        title: titleInput.trim(),
        avatarUrl: avatarUrlInput.trim() || null,
        bio: bioInput.trim() || null,
      };

      const res = editingId
        ? await updateArticleAuthor(editingId, payload)
        : await createArticleAuthor(payload);

      if (res.success) {
        toast.success(editingId ? "Autor atualizado com sucesso!" : "Autor criado com sucesso!");
        resetForm();
      } else {
        toast.danger("Erro ao salvar", { description: res.message });
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o autor "${name}"? Os artigos associados não serão apagados.`)) return;

    startTransition(async () => {
      const res = await deleteArticleAuthor(id, name);
      if (res.success) {
        toast.success("Autor excluído com sucesso!");
        if (editingId === id) resetForm();
      } else {
        toast.danger("Erro ao excluir", { description: res.message });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Tabela de Autores */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <Card.Content className="p-0">
            <Table.Root>
              <Table.ScrollContainer>
                <Table.Content aria-label="Lista de autores de artigos">
                  <Table.Header>
                    <Table.Column isRowHeader>Autor</Table.Column>
                    <Table.Column>Cargo / Título</Table.Column>
                    <Table.Column>Artigos</Table.Column>
                    <Table.Column>Criado em</Table.Column>
                    <Table.Column className="text-right">Ações</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {initialAuthors.map((item) => (
                      <Table.Row key={item.id} id={item.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            {item.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.avatarUrl}
                                alt=""
                                className="size-9 shrink-0 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent-soft-foreground">
                                {item.name.charAt(0)}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground">{item.name}</p>
                              <p className="text-xs text-muted">/autor/{item.slug}</p>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-sm text-muted">
                            {item.title || "—"}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-semibold text-foreground">
                            {item.articlesCount ?? 0}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="text-muted text-sm">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString("pt-BR") : "—"}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              isIconOnly
                              aria-label={`Editar ${item.name}`}
                              onClick={() => handleEdit(item)}
                              isDisabled={isPending}
                            >
                              <Edit2 className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              isIconOnly
                              aria-label={`Excluir ${item.name}`}
                              className="text-danger hover:bg-danger-soft hover:text-danger-soft-foreground"
                              onClick={() => handleDelete(item.id, item.name)}
                              isDisabled={isPending}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                    {initialAuthors.length === 0 && (
                      <Table.Row id="empty">
                        <Table.Cell colSpan={5} className="text-center py-10 text-muted">
                          Nenhum autor cadastrado ainda.
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table.Root>
          </Card.Content>
        </Card>
      </div>

      {/* Formulário de Criação / Edição */}
      <div>
        <Card className="sticky top-[100px]">
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              {editingId ? <Edit2 className="size-4 text-accent" /> : <Plus className="size-4 text-accent" />}
              {editingId ? "Editar Autor" : "Novo Autor"}
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-center pb-1">
                <ImageUpload
                  label="Foto do autor"
                  value={avatarUrlInput}
                  onChange={(url) => setAvatarUrlInput(url ?? "")}
                  folder="authors"
                  aspect="square"
                  previewClassName="rounded-full !size-24 !max-w-24 shadow-sm"
                  description="Recomendado: 1:1, até 5MB."
                  fallback={
                    <div className="flex size-full items-center justify-center bg-accent-soft font-bold text-xl text-accent-soft-foreground">
                      {nameInput.trim() ? nameInput.trim().charAt(0).toUpperCase() : <User className="size-6 opacity-50" />}
                    </div>
                  }
                />
              </div>

              <TextField name="name" value={nameInput} onChange={(v) => setNameInput(v)} isRequired>
                <Label>Nome</Label>
                <Input placeholder="Ex.: Lucas Lima" />
              </TextField>

              <TextField name="title" value={titleInput} onChange={(v) => setTitleInput(v)}>
                <Label>Título / Cargo</Label>
                <Input placeholder="Ex.: Especialista em Liderança" />
              </TextField>

              <TextField name="bio" value={bioInput} onChange={(v) => setBioInput(v)}>
                <Label>Biografia curta</Label>
                <TextArea
                  rows={3}
                  placeholder="Resumo sobre a atuação do autor..."
                  className="resize-none"
                />
              </TextField>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={isPending || !nameInput.trim()}
                  className="flex-1"
                >
                  <Save className="size-4 mr-2" />
                  {isPending ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Autor"}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={resetForm} isDisabled={isPending}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
