"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { 
  Button, 
  Table, 
  Chip, 
  Modal, 
  TextField, 
  Label, 
  Input, 
  Description, 
  FieldError, 
  Select, 
  ListBox, 
  ListBoxItem 
} from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";

type MenuItem = {
  id: string;
  label: string;
  type: string;
  status: string;
  link: string;
};

const initialItems: MenuItem[] = [
  { id: "1", label: "Início", type: "Link Interno", status: "Visível", link: "/dashboard" },
  { id: "2", label: "Meus Cursos", type: "Link Interno", status: "Visível", link: "/cursos" },
  { id: "3", label: "Comunidade", type: "Link Externo", status: "Visível", link: "https://discord.com" },
  { id: "4", label: "Certificados", type: "Link Interno", status: "Oculto", link: "/certificados" },
];

export default function MenuAlunosPage() {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [label, setLabel] = useState("");
  const [type, setType] = useState("Link Interno");
  const [link, setLink] = useState("");
  const [status, setStatus] = useState("Visível");

  const openNewItemModal = () => {
    setEditingItem(null);
    setLabel("");
    setType("Link Interno");
    setLink("");
    setStatus("Visível");
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setLabel(item.label);
    setType(item.type);
    setLink(item.link);
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!label || !link) return;

    if (editingItem) {
      setItems(items.map(it => it.id === editingItem.id ? { ...it, label, type, link, status } : it));
    } else {
      const newItem: MenuItem = {
        id: Math.random().toString(36).slice(2, 9),
        label,
        type,
        link,
        status,
      };
      setItems([...items, newItem]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(it => it.id !== id));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configurações"
        title="Menu"
        description="Gerencie os itens de navegação que aparecem no menu lateral da área de aprendizagem."
        actions={
          <Button variant="primary" className="gap-2" onClick={openNewItemModal}>
            <Plus className="size-4" aria-hidden="true" />
            Adicionar Item
          </Button>
        }
      />

      <Table.Root>
        <Table.ScrollContainer>
          <Table.Content aria-label="Itens do Menu">
            <Table.Header>
              <Table.Column isRowHeader>Rótulo</Table.Column>
              <Table.Column>Tipo</Table.Column>
              <Table.Column>URL DESTINO</Table.Column>
              <Table.Column>VISIBILIDADE</Table.Column>
              <Table.Column>AÇÕES</Table.Column>
            </Table.Header>
            <Table.Body items={items}>
              {(item) => (
                <Table.Row id={item.id}>
                  <Table.Cell className="font-medium">{item.label}</Table.Cell>
                  <Table.Cell className="text-muted">{item.type}</Table.Cell>
                  <Table.Cell>
                    <span className="font-mono text-xs text-muted bg-surface-secondary px-2 py-1 rounded-md">
                      {item.link}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Chip 
                      color={item.status === "Visível" ? "success" : "default"} 
                      variant="soft" 
                      size="sm"
                    >
                      {item.status}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center justify-end gap-2">
                      <Button isIconOnly size="sm" variant="ghost" aria-label="Editar item" onClick={() => openEditModal(item)}>
                        <Pencil className="size-4 text-muted" aria-hidden="true" />
                      </Button>
                      <Button isIconOnly size="sm" variant="ghost" aria-label="Excluir item" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="size-4 text-muted" aria-hidden="true" />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table.Root>

      <Modal.Root isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>{editingItem ? "Editar Item" : "Novo Item"}</Modal.Header>
              <Modal.Body className="space-y-4">
                <TextField value={label} onChange={setLabel} isRequired>
                  <Label>Rótulo</Label>
                  <Input placeholder="Ex.: Início" />
                  <Description>O nome que aparecerá no menu.</Description>
                  <FieldError>Informe o rótulo.</FieldError>
                </TextField>

                <Select selectedKey={type} onSelectionChange={(k) => setType(String(k))}>
                  <Label>Tipo de Link</Label>
                  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBoxItem id="Link Interno">Link Interno</ListBoxItem>
                      <ListBoxItem id="Link Externo">Link Externo</ListBoxItem>
                    </ListBox>
                  </Select.Popover>
                </Select>

                <TextField value={link} onChange={setLink} isRequired>
                  <Label>Destino (URL ou Path)</Label>
                  <Input placeholder="Ex.: /dashboard ou https://..." />
                  <FieldError>Informe o destino.</FieldError>
                </TextField>

                <Select selectedKey={status} onSelectionChange={(k) => setStatus(String(k))}>
                  <Label>Status</Label>
                  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBoxItem id="Visível">Visível</ListBoxItem>
                      <ListBoxItem id="Oculto">Oculto</ListBoxItem>
                    </ListBox>
                  </Select.Popover>
                </Select>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" onClick={handleSave} isDisabled={!label || !link}>
                  Salvar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </div>
  );
}
