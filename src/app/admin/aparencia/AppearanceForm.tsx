"use client";

import { useState } from "react";
import { Palette, Upload, Monitor, Sun, Type, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@heroui/react";
import { saveAppearance } from "./actions";

type AppearanceFormProps = {
  initialData: {
    platformName?: string;
    slogan?: string;
    primaryColor?: string;
    theme?: string;
  };
};

export function AppearanceForm({ initialData }: AppearanceFormProps) {
  const [loading, setLoading] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(initialData.primaryColor || "#3157B7");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await saveAppearance({
      platformName: formData.get("platformName") as string,
      slogan: formData.get("slogan") as string,
      primaryColor: formData.get("primaryColor") as string,
      theme: formData.get("theme") as string,
    });
    setLoading(false);
    // Ideally add a toast here
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Formulário Principal */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Seção: Informações da Marca */}
        <section className="bg-surface-card rounded-2xl p-6 md:p-8 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
            <Type className="w-5 h-5 text-primary" />
            Informações da Marca
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">Nome da Plataforma</label>
              <input 
                type="text" 
                name="platformName"
                defaultValue={initialData.platformName || "Smart LMS"}
                className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink"
                placeholder="Ex: Minha Academia"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1.5">Slogan / Descrição Curta</label>
              <textarea 
                rows={3}
                name="slogan"
                defaultValue={initialData.slogan || "A melhor plataforma de ensino a distância."}
                className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-ink resize-none"
                placeholder="Ex: Aprenda no seu próprio ritmo."
              />
            </div>
          </div>
        </section>

        {/* Seção: Identidade Visual (Cores) */}
        <section className="bg-surface-card rounded-2xl p-6 md:p-8 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-xl font-bold flex items-center gap-2 text-ink">
            <Palette className="w-5 h-5 text-primary" />
            Cores e Tema
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Cor Principal</label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg border border-border shadow-inner flex-shrink-0 relative overflow-hidden group"
                  style={{ backgroundColor: primaryColor }}
                >
                    <input 
                      type="color" 
                      name="primaryColor"
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="absolute -top-2 -left-2 w-16 h-16 opacity-0 cursor-pointer" 
                    />
                </div>
                <input 
                  type="text" 
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full bg-canvas-soft border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 text-ink font-mono text-sm uppercase transition-all"
                />
              </div>
              <p className="text-xs text-text-mute mt-2">Usada em botões principais, links e destaques.</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-text mb-3">Tema da experiência</label>
              <div className="rounded-[12px] border border-border bg-canvas-soft p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-surface text-primary shadow-sm">
                    <Sun className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">Claro editorial</p>
                    <p className="text-xs text-text-mute">Tema principal desta versão</p>
                    <input type="hidden" name="theme" value="light" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="bg-surface-card rounded-2xl p-6 md:p-8 space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:sticky lg:top-24">
          <h3 className="font-bold text-ink flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            Salvar Alterações
          </h3>
          <p className="text-sm text-text-mute">
            As alterações de aparência aplicam-se imediatamente a todos os alunos.
          </p>
          <Button 
            type="submit"
            variant="primary" 
            className="w-full font-semibold flex items-center justify-center gap-2"
            isDisabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Salvando..." : "Salvar e Aplicar"}
          </Button>
        </section>
      </div>
    </form>
  );
}
