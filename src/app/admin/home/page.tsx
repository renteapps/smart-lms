"use client";

import { useState } from "react";

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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out pb-20">
      <h1 className="text-3xl font-display font-black text-primary mb-8">Editar Home Page</h1>
      
      <div className="grid gap-6">
        {/* Carrossel */}
        <div className="bg-surface-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold mb-2 text-ink-deep">Carrossel Principal (Hero)</h2>
              <p className="text-text-soft">Gerencie os banners em destaque na página inicial.</p>
            </div>
            {!bannerFormVisible && (
              <button onClick={openAddBanner} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-semibold hover:bg-primary-active transition-all shadow-sm hover:shadow-md text-sm">
                Adicionar Banner
              </button>
            )}
          </div>
          
          {bannerFormVisible && (
            <div className="bg-canvas-soft rounded-xl p-5 mb-6 border border-border/60">
              <h3 className="font-bold text-ink-deep mb-4">{editingBannerId ? "Editar Banner" : "Novo Banner"}</h3>
              <div className="grid gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-ink-deep mb-1">Título</label>
                  <input type="text" className="w-full px-3 py-2 rounded-lg border border-border bg-surface-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" value={bannerFormData.title} onChange={e => setBannerFormData({...bannerFormData, title: e.target.value})} placeholder="Ex: Liderança do Futuro" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-deep mb-1">URL da Imagem</label>
                  <input type="text" className="w-full px-3 py-2 rounded-lg border border-border bg-surface-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" value={bannerFormData.image} onChange={e => setBannerFormData({...bannerFormData, image: e.target.value})} placeholder="https://..." />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setBannerFormVisible(false)} className="px-4 py-2 text-sm font-medium text-text-soft hover:bg-ink-deep/5 rounded-lg transition-colors">Cancelar</button>
                <button onClick={saveBanner} className="px-4 py-2 text-sm font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-active transition-colors">Salvar Banner</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {banners.map((banner) => (
              <div key={banner.id} className="bg-canvas-soft rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-border/40">
                <div className="flex items-center gap-4">
                  <div className="w-24 h-14 bg-bg rounded-lg overflow-hidden shadow-sm">
                    <img src={banner.image} className="w-full h-full object-cover" alt={banner.title} />
                  </div>
                  <div>
                    <p className="font-semibold text-ink-deep">{banner.title}</p>
                    <p className="text-sm text-text-soft">Ordem: {banner.order}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditBanner(banner)} className="text-sm text-primary font-medium hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">Editar</button>
                  <button onClick={() => deleteBanner(banner.id)} className="text-sm text-red-500 font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">Remover</button>
                </div>
              </div>
            ))}
            {banners.length === 0 && !bannerFormVisible && (
              <p className="text-sm text-text-soft italic text-center py-4">Nenhum banner cadastrado.</p>
            )}
          </div>
        </div>

        {/* Prateleiras */}
        <div className="bg-surface-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold mb-2 text-ink-deep">Prateleiras de Cursos (Rows)</h2>
              <p className="text-text-soft">Organize quais categorias ou coleções de cursos aparecem na home.</p>
            </div>
            {!shelfFormVisible && (
              <button onClick={openAddShelf} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-semibold hover:bg-primary-active transition-all shadow-sm hover:shadow-md text-sm">
                Nova Prateleira
              </button>
            )}
          </div>

          {shelfFormVisible && (
            <div className="bg-canvas-soft rounded-xl p-5 mb-6 border border-border/60">
              <h3 className="font-bold text-ink-deep mb-4">{editingShelfId ? "Editar Prateleira" : "Nova Prateleira"}</h3>
              <div className="grid gap-4 mb-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-ink-deep mb-1">Título</label>
                  <input type="text" className="w-full px-3 py-2 rounded-lg border border-border bg-surface-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" value={shelfFormData.title} onChange={e => setShelfFormData({...shelfFormData, title: e.target.value})} placeholder="Ex: Em Alta" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-deep mb-1">Tipo</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-border bg-surface-card focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" value={shelfFormData.type} onChange={e => setShelfFormData({...shelfFormData, type: e.target.value})}>
                    <option value="Dinâmico">Dinâmico (Automático)</option>
                    <option value="Manual">Manual (Escolher cursos)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShelfFormVisible(false)} className="px-4 py-2 text-sm font-medium text-text-soft hover:bg-ink-deep/5 rounded-lg transition-colors">Cancelar</button>
                <button onClick={saveShelf} className="px-4 py-2 text-sm font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-active transition-colors">Salvar Prateleira</button>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {shelves.map((shelf, index) => (
              <div key={shelf.id} className="flex justify-between items-center bg-canvas-soft p-4 rounded-xl border border-border/40">
                <span className="font-medium text-ink-deep">{index + 1}. {shelf.title}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full font-bold">{shelf.type}</span>
                  <button onClick={() => openEditShelf(shelf)} className="text-sm text-primary font-medium hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors">Editar</button>
                  <button onClick={() => deleteShelf(shelf.id)} className="text-sm text-red-500 font-medium hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">Remover</button>
                </div>
              </div>
            ))}
            {shelves.length === 0 && !shelfFormVisible && (
              <p className="text-sm text-text-soft italic text-center py-4">Nenhuma prateleira cadastrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
