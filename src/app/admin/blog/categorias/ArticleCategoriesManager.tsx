"use client";

import { useState, useTransition } from "react";
import { Button, Card, Input, Label, TextField, toast, Table } from "@heroui/react";
import { Edit2, Save, Trash2 } from "lucide-react";
import type { CategoryRow } from "@/app/actions/admin/categories";
import {
  createArticleCategory,
  updateArticleCategory,
  deleteArticleCategory,
} from "@/app/actions/admin/categories";

function slugify(text: string) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-");
}

export function ArticleCategoriesManager({ initialCategories }: { initialCategories: CategoryRow[] }) {
  const [isPending, startTransition] = useTransition();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [oldNameInput, setOldNameInput] = useState("");

  const resetForm = () => {
    setEditingId(null);
    setNameInput("");
    setOldNameInput("");
  };

  const handleEdit = (item: CategoryRow) => {
    setEditingId(item.id);
    setNameInput(item.name);
    setOldNameInput(item.name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    startTransition(async () => {
      const slug = slugify(nameInput);
      const res = editingId
        ? await updateArticleCategory(editingId, nameInput.trim(), slug, oldNameInput)
        : await createArticleCategory(nameInput.trim(), slug);

      if (res.success) {
        toast.success("Categoria salva com sucesso!");
        resetForm();
      } else {
        toast.danger("Erro ao salvar", { description: res.message });
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir '${name}'? Os artigos que utilizam esta opção poderão ser afetados.`)) return;

    startTransition(async () => {
      const res = await deleteArticleCategory(id, name);
      if (res.success) {
        toast.success("Categoria excluída!");
      } else {
        toast.danger("Erro ao excluir", { description: res.message });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <Card.Content className="p-0">
            <Table.Root>
              <Table.ScrollContainer>
                <Table.Content aria-label="Lista de categorias de artigos">
                  <Table.Header>
                    <Table.Column isRowHeader>Nome</Table.Column>
                    <Table.Column>Criado em</Table.Column>
                    <Table.Column className="text-right">Ações</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {initialCategories.map((item) => (
                      <Table.Row key={item.id} id={item.id}>
                        <Table.Cell className="font-medium">{item.name}</Table.Cell>
                        <Table.Cell className="text-muted">
                          {new Date(item.created_at).toLocaleDateString("pt-BR")}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} isDisabled={isPending}>
                              <Edit2 className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
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
                    {initialCategories.length === 0 && (
                      <Table.Row id="empty">
                        <Table.Cell colSpan={3} className="text-center py-8 text-muted">
                          Nenhuma categoria cadastrada.
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

      <div>
        <Card className="sticky top-[100px]">
          <Card.Header>
            <Card.Title>{editingId ? "Editar Categoria" : "Nova Categoria"}</Card.Title>
          </Card.Header>
          <Card.Content>
            <form onSubmit={handleSubmit} className="space-y-4">
              <TextField name="name" value={nameInput} onChange={(v) => setNameInput(v)} isRequired>
                <Label>Nome</Label>
                <Input placeholder="Ex.: Carreira" />
              </TextField>

              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" isDisabled={isPending || !nameInput.trim()} className="flex-1">
                  <Save className="size-4 mr-2" />
                  Salvar
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
