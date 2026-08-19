"use client";

import { useState } from "react";
import Image from "next/image";
import { Button, Card, Chip, Input, Label, ListBox, ListBoxItem, Select } from "@heroui/react";
import { PageHeader } from "@/components/ui/editorial";
import { ImageUpload } from "@/components/ui/ImageUpload";

type Banner = {
  id: string;
  title: string;
  image: string;
  order: number;
};

type Shelf = {
  id: string;
  title: string;
  type: string;
};

const shelfTypeOptions = [
  { id: "Dinâmico", label: "Dinâmico (automático)" },
  { id: "Manual", label: "Manual (escolher cursos)" },
];

export default function AdminHome() {
  const [banners, setBanners] = useState<Banner[]>([
    {
      id: "1",
      title: "Comunicação e Liderança",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop",
      order: 1,
    }
  ]);

  const [shelves, setShelves] = useState<Shelf[]>([
    { id: "1", title: "Continuar Assistindo", type: "Dinâmico" },
    { id: "2", title: "Em Destaque", type: "Manual" },
    { id: "3", title: "Trilha Liderança", type: "Manual" },
  ]);

  // Form states for Banners
  const [bannerFormVisible, setBannerFormVisible] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerFormData, setBannerFormData] = useState({ title: "", image: "" });

  // Form states for Shelves
  const [shelfFormVisible, setShelfFormVisible] = useState(false);
  const [editingShelfId, setEditingShelfId] = useState<string | null>(null);
  const [shelfFormData, setShelfFormData] = useState({ title: "", type: "Dinâmico" });

  // Banner Actions
  const openAddBanner = () => {
    setBannerFormData({ title: "", image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop" });
    setEditingBannerId(null);
    setBannerFormVisible(true);
  };

  const openEditBanner = (banner: Banner) => {
    setBannerFormData({ title: banner.title, image: banner.image });
    setEditingBannerId(banner.id);
    setBannerFormVisible(true);
  };

  const saveBanner = () => {
    if (!bannerFormData.title || !bannerFormData.image) return;
    if (editingBannerId) {
      setBanners(banners.map(b => b.id === editingBannerId ? { ...b, ...bannerFormData } : b));
    } else {
      setBanners([...banners, { id: Date.now().toString(), order: banners.length + 1, ...bannerFormData }]);
    }
    setBannerFormVisible(false);
  };

  const deleteBanner = (id: string) => {
    if (window.confirm("Remover este banner?")) {
      setBanners(banners.filter(b => b.id !== id));
    }
  };

  // Shelf Actions
  const openAddShelf = () => {
    setShelfFormData({ title: "", type: "Dinâmico" });
    setEditingShelfId(null);
    setShelfFormVisible(true);
  };

  const openEditShelf = (shelf: Shelf) => {
    setShelfFormData({ title: shelf.title, type: shelf.type });
    setEditingShelfId(shelf.id);
    setShelfFormVisible(true);
  };

  const saveShelf = () => {
    if (!shelfFormData.title) return;
    if (editingShelfId) {
      setShelves(shelves.map(s => s.id === editingShelfId ? { ...s, ...shelfFormData } : s));
    } else {
      setShelves([...shelves, { id: Date.now().toString(), ...shelfFormData }]);
    }
    setShelfFormVisible(false);
  };

  const deleteShelf = (id: string) => {
    if (window.confirm("Remover esta prateleira?")) {
      setShelves(shelves.filter(s => s.id !== id));
    }
  };

  return (
    <div className="space-y-7 pb-20">
      <PageHeader eyebrow="Plataforma" title="Editar Home Page" description="Organize destaques e coleções que aparecem para os estudantes." />

      <div className="grid gap-6">
        {/* Carrossel */}
        <Card>
          <Card.Header className="flex flex-row items-start justify-between gap-4">
            <div>
              <Card.Title>Carrossel principal (hero)</Card.Title>
              <Card.Description>Gerencie os banners em destaque na página inicial.</Card.Description>
            </div>
            {!bannerFormVisible && (
              <Button variant="primary" size="sm" onClick={openAddBanner}>
                Adicionar banner
              </Button>
            )}
          </Card.Header>
          <Card.Content className="space-y-4">
            {bannerFormVisible && (
              <div className="rounded-xl border border-border/60 bg-background-secondary p-5">
                <h3 className="mb-4 font-bold text-foreground">{editingBannerId ? "Editar banner" : "Novo banner"}</h3>
                <div className="mb-4 grid gap-4">
                  <div>
                    <Label className="mb-1 block text-sm font-medium text-foreground">Título</Label>
                    <Input
                      value={bannerFormData.title}
                      onChange={(e) => setBannerFormData({ ...bannerFormData, title: e.target.value })}
                      placeholder="Ex: Liderança do Futuro"
                    />
                  </div>
                  <ImageUpload
                    label="Imagem do banner"
                    value={bannerFormData.image}
                    onChange={(url) => setBannerFormData({ ...bannerFormData, image: url ?? "" })}
                    folder="banners"
                    aspect="wide"
                    description="Recomendado: 1920x1005px."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="tertiary" size="sm" onClick={() => setBannerFormVisible(false)}>Cancelar</Button>
                  <Button variant="primary" size="sm" onClick={saveBanner}>Salvar banner</Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {banners.map((banner) => (
                <div key={banner.id} className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border/40 bg-background-secondary p-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    <div className="relative h-14 w-24 overflow-hidden rounded-lg bg-background shadow-elev-1">
                      <Image src={banner.image} fill sizes="96px" className="object-cover" alt={banner.title} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{banner.title}</p>
                      <p className="text-sm text-muted">Ordem: {banner.order}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-accent" onClick={() => openEditBanner(banner)}>Editar</Button>
                    <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger-soft-foreground" onClick={() => deleteBanner(banner.id)}>Remover</Button>
                  </div>
                </div>
              ))}
              {banners.length === 0 && !bannerFormVisible && (
                <p className="py-4 text-center text-sm italic text-muted">Nenhum banner cadastrado.</p>
              )}
            </div>
          </Card.Content>
        </Card>

        {/* Prateleiras */}
        <Card>
          <Card.Header className="flex flex-row items-start justify-between gap-4">
            <div>
              <Card.Title>Prateleiras de cursos (rows)</Card.Title>
              <Card.Description>Organize quais categorias ou coleções de cursos aparecem na home.</Card.Description>
            </div>
            {!shelfFormVisible && (
              <Button variant="primary" size="sm" onClick={openAddShelf}>
                Nova prateleira
              </Button>
            )}
          </Card.Header>
          <Card.Content className="space-y-3">
            {shelfFormVisible && (
              <div className="rounded-xl border border-border/60 bg-background-secondary p-5">
                <h3 className="mb-4 font-bold text-foreground">{editingShelfId ? "Editar prateleira" : "Nova prateleira"}</h3>
                <div className="mb-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-1 block text-sm font-medium text-foreground">Título</Label>
                    <Input
                      value={shelfFormData.title}
                      onChange={(e) => setShelfFormData({ ...shelfFormData, title: e.target.value })}
                      placeholder="Ex: Em Alta"
                    />
                  </div>
                  <Select
                    selectedKey={shelfFormData.type}
                    onSelectionChange={(k) => setShelfFormData({ ...shelfFormData, type: String(k) })}
                  >
                    <Label>Tipo</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {shelfTypeOptions.map((opt) => (
                          <ListBoxItem key={opt.id} id={opt.id}>{opt.label}</ListBoxItem>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="tertiary" size="sm" onClick={() => setShelfFormVisible(false)}>Cancelar</Button>
                  <Button variant="primary" size="sm" onClick={saveShelf}>Salvar prateleira</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {shelves.map((shelf, index) => (
                <div key={shelf.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-background-secondary p-4">
                  <span className="font-medium text-foreground">{index + 1}. {shelf.title}</span>
                  <div className="flex items-center gap-3">
                    <Chip color="accent" variant="soft" size="sm">{shelf.type}</Chip>
                    <Button variant="ghost" size="sm" className="text-accent" onClick={() => openEditShelf(shelf)}>Editar</Button>
                    <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger-soft-foreground" onClick={() => deleteShelf(shelf.id)}>Remover</Button>
                  </div>
                </div>
              ))}
              {shelves.length === 0 && !shelfFormVisible && (
                <p className="py-4 text-center text-sm italic text-muted">Nenhuma prateleira cadastrada.</p>
              )}
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
