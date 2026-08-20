"use client";

import { useState, useTransition } from "react";
import { Button, Card, Input, Label, TextField, toast, Table } from "@heroui/react";
import { Edit2, Plus, Save, Trash2 } from "lucide-react";
import type { CategoryRow, TagRow } from "@/app/actions/admin/categories";
import { 
  createCategory, 
  updateCategory, 
  deleteCategory, 
  createTag, 
  updateTag, 
  deleteTag 
} from "@/app/actions/admin/categories";

function slugify(text: string) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-");
}

export function CategoriesManager({ 
  initialCategories, 
  initialTags 
}: { 
  initialCategories: CategoryRow[]; 
  initialTags: TagRow[]; 
}) {
  const [activeTab, setActiveTab] = useState<"categories" | "tags">("categories");
  const [isPending, startTransition] = useTransition();

  // State for form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [oldNameInput, setOldNameInput] = useState("");

  const resetForm = () => {
    setEditingId(null);
    setNameInput("");
    setOldNameInput("");
  };

  const handleEdit = (item: CategoryRow | TagRow) => {
    setEditingId(item.id);
    setNameInput(item.name);
    setOldNameInput(item.name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    startTransition(async () => {
      const slug = slugify(nameInput);
      let res;
      
      if (activeTab === "categories") {
        if (editingId) {
          res = await updateCategory(editingId, nameInput.trim(), slug, oldNameInput);
        } else {
          res = await createCategory(nameInput.trim(), slug);
        }
      } else {
        if (editingId) {
          res = await updateTag(editingId, nameInput.trim(), slug, oldNameInput);
        } else {
          res = await createTag(nameInput.trim(), slug);
        }
      }

      if (res.success) {
        toast.success(`${activeTab === "categories" ? "Categoria" : "Tag"} salva com sucesso!`);
        resetForm();
      } else {
        toast.danger("Erro ao salvar", { description: res.message });
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir '${name}'? Os cursos que utilizam esta opção poderão ser afetados.`)) return;
    
    startTransition(async () => {
      let res;
      if (activeTab === "categories") {
        res = await deleteCategory(id, name);
      } else {
        res = await deleteTag(id, name);
      }

      if (res.success) {
        toast.success(`${activeTab === "categories" ? "Categoria" : "Tag"} excluída!`);
      } else {
        toast.danger("Erro ao excluir", { description: res.message });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      {/* List and Tabs */}
      <div className="md:col-span-2 space-y-6">
        <div className="flex space-x-4 border-b border-border pb-2">
          <button 
            className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "categories" ? "border-b-2 border-accent text-accent" : "text-muted hover:text-foreground"}`}
            onClick={() => { setActiveTab("categories"); resetForm(); }}
          >
            Categorias ({initialCategories.length})
          </button>
          <button 
            className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "tags" ? "border-b-2 border-accent text-accent" : "text-muted hover:text-foreground"}`}
            onClick={() => { setActiveTab("tags"); resetForm(); }}
          >
            Tags ({initialTags.length})
          </button>
        </div>

        <Card>
          <Card.Content className="p-0">
            <Table.Root>
              <Table.ScrollContainer>
                <Table.Content aria-label={`Lista de ${activeTab}`}>
                  <Table.Header>
                    <Table.Column isRowHeader>Nome</Table.Column>
                    <Table.Column>Criado em</Table.Column>
                    <Table.Column className="text-right">Ações</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {(activeTab === "categories" ? initialCategories : initialTags).map((item) => (
                      <Table.Row key={item.id} id={item.id}>
                        <Table.Cell className="font-medium">{item.name}</Table.Cell>
                        <Table.Cell className="text-muted">
                          {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEdit(item)}
                              isDisabled={isPending}
                            >
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
                    {(activeTab === "categories" ? initialCategories : initialTags).length === 0 && (
                      <Table.Row id="empty">
                        <Table.Cell colSpan={3} className="text-center py-8 text-muted">
                          Nenhum registro encontrado.
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

      {/* Form Sidebar */}
      <div>
        <Card className="sticky top-[100px]">
          <Card.Header>
            <Card.Title>
              {editingId ? `Editar ${activeTab === "categories" ? "Categoria" : "Tag"}` : `Nova ${activeTab === "categories" ? "Categoria" : "Tag"}`}
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <form onSubmit={handleSubmit} className="space-y-4">
              <TextField name="name" value={nameInput} onChange={(v) => setNameInput(v)} isRequired>
                <Label>Nome</Label>
                <Input placeholder={activeTab === "categories" ? "Ex.: Vendas" : "Ex.: intermediário"} />
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
